#!/usr/bin/env python3
"""
Gibraltar iGaming Dashboard - Salary Data Updater
Runs in GitHub Actions, updates salary-data.json, salary-signals.json, last-sync.json.
"""
import json
import os
import sys
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

    # 4. Write last-sync.json
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
