#!/usr/bin/env python3
"""
Gibraltar iGaming Dashboard - Salary Data Updater
Runs in GitHub Actions, updates salary-data.json, salary-signals.json, last-sync.json.
"""
import json
import os
import statistics
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Allow running from any directory
REPO_ROOT = Path(__file__).parent.parent

sys.path.insert(0, str(Path(__file__).parent))
from update_fx import get_fx_data
from scrape_sources import collect_all_signals

USE_PLAYWRIGHT = os.environ.get("USE_PLAYWRIGHT", "true").lower() == "true"


def load_json(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text())
    return {}


def save_json(path: Path, data: dict):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"[main] Written: {path.name}")


OPERATOR_DEFAULT_MARKET = {
    "betsson": "malta",
    "betclic": "malta",
    "eeze": "gibraltar",
    "b2spin": "gibraltar",
    "legend": "gibraltar",
    "lottomart": "gibraltar",
    "over99": "gibraltar",
    "finnplay": "malta",
    "entain": "gibraltar",
}


def update_operator_bands(salary_data: dict, signals: list[dict]) -> int:
    """Post-process scraped signals into per-operator salaryBands. Returns count of updated bands."""
    groups = defaultdict(list)
    for sig in signals:
        op = sig.get("operator_hint")
        market = sig.get("market_hint")
        role = sig.get("role_hint")
        if not op or not role:
            continue
        # Resolve market: explicit hint wins; fall back to operator default
        if market:
            market_key = "gibraltar" if market == "Gibraltar" else "malta"
        elif op in OPERATOR_DEFAULT_MARKET:
            market_key = OPERATOR_DEFAULT_MARKET[op]
        else:
            continue
        groups[(op, market_key, role)].append(sig)

    updated_ops = set()
    for (op, market, role), sigs in groups.items():
        op_data = salary_data.get("operators", {}).get(op)
        if not op_data:
            continue
        # Never overwrite manually seeded operators -- they have curated data
        if op_data.get("dataStatus") == "seeded":
            continue
        # Filter implausible values (monthly noise, c-suite outliers)
        mids = [(s["min"] + s["max"]) // 2 for s in sigs if 18000 <= (s["min"] + s["max"]) // 2 <= 250000]
        # Require at least 2 signals for credibility
        if len(mids) < 2:
            continue
        med = int(statistics.median(mids))
        op_data.setdefault("salaryBands", {}).setdefault(market, {})[role] = {
            "mid": med,
            "source": "scraped",
            "signal_count": len(mids),
            "note": f"{len(mids)} signal(s) from live scrape",
        }
        updated_ops.add(op)
        print(f"[bands] {op}/{market}/{role}: mid={med} ({len(mids)} signals)")

    # Set dataStatus on all operators (never overwrite protected statuses)
    PROTECTED = {"no-public-data", "seeded"}
    for op_key, op_data in salary_data.get("operators", {}).items():
        if op_data.get("dataStatus") in PROTECTED:
            continue
        bands = op_data.get("salaryBands", {})
        has_data = any(bool(v) for v in bands.values()) if bands else False
        if op_key in updated_ops:
            op_data["dataStatus"] = "live"
        elif not has_data and "dataStatus" not in op_data:
            op_data["dataStatus"] = "no-salary-listed"

    return len(updated_ops)


def main():
    print(f"[main] Starting salary data update at {datetime.now(timezone.utc).isoformat()}")

    # 1. Update FX rate
    fx = get_fx_data()

    # 2. Load and update salary-data.json
    salary_path = REPO_ROOT / "salary-data.json"
    salary_data = load_json(salary_path)
    if fx:
        salary_data.setdefault("fx", {}).update(fx)
    now_utc = datetime.now(timezone.utc)
    human_date = now_utc.strftime("%-d %B %Y")
    salary_data.setdefault("meta", {})["lastUpdated"] = human_date
    salary_data["meta"]["version"] = now_utc.strftime("%Y-%m-%d")
    save_json(salary_path, salary_data)

    # 3. Scrape sources, save signals
    signals_data = collect_all_signals(use_playwright=USE_PLAYWRIGHT)
    signals_path = REPO_ROOT / "salary-signals.json"
    save_json(signals_path, signals_data)

    # 4. Post-process signals into per-operator salaryBands
    n_updated = update_operator_bands(salary_data, signals_data["signals"])
    print(f"[main] Operator bands updated: {n_updated} operator(s)")
    save_json(salary_path, salary_data)

    # 5. Write last-sync.json
    tz_budapest_offset = "+02:00"  # CEST; adjust manually if needed during winter
    human_budapest = now_utc.strftime("%-d %B %Y, %H:%M")
    sync_path = REPO_ROOT / "last-sync.json"
    save_json(sync_path, {
        "timestamp": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "human": human_budapest,
        "signal_count": signals_data["signal_count"],
        "skipped_sources": len(signals_data["skipped_sources"]),
    })

    print(f"[main] Done. {signals_data['signal_count']} signals collected.")


if __name__ == "__main__":
    main()
