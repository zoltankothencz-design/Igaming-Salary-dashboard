#!/usr/bin/env python3
"""
combine.py — Confidence-weighted salary signal aggregator.

Reads salary-signals.json (produced by main.py / scrape_sources.py),
applies a 3-stream weighting model, and outputs a combined view per
(market, role) pair. Can also update salary-data.json salaryBands for
operators with sufficient signal coverage.

Data streams and confidence weights:
  Stream 1 — survey / editorial   (source_type in {survey, editorial}):   weight 0.70+
  Stream 2 — job postings         (source_type == job_posting):            weight 0.50
  Stream 3 — cross-check signals  (source_type == cross_check):            weight 0.30

Confidence score formula per signal:
  confidence = confidence_base * count_factor
  where count_factor = min(1.0, signal_count_in_group / 5)
  (a group with 5+ signals in the same source type gets full credit)

Usage:
  python combine.py [--signals salary-signals.json] [--out combined-salary.json] [--dry-run]
"""
import argparse
import json
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_SIGNALS = REPO_ROOT / "salary-signals.json"
DEFAULT_OUT = REPO_ROOT / "combined-salary.json"

WEIGHT_BY_TYPE = {
    "survey":      0.80,
    "editorial":   0.65,
    "job_posting": 0.50,
    "cross_check": 0.30,
}
FALLBACK_WEIGHT = 0.50

MIN_SIGNALS_FOR_BAND = 2


def load_signals(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Signals file not found: {path}")
    data = json.loads(path.read_text())
    return data.get("signals", data) if isinstance(data, dict) else data


def _mid(sig: dict) -> float:
    return (sig["min"] + sig["max"]) / 2


def _weight(sig: dict) -> float:
    st = sig.get("source_type", "job_posting")
    return WEIGHT_BY_TYPE.get(st, FALLBACK_WEIGHT)


def combine_signals(signals: list[dict]) -> dict:
    """
    Group signals by (market, role) and produce confidence-weighted salary bands.
    Returns dict keyed by "market::role".
    """
    groups: dict[str, list[dict]] = defaultdict(list)
    for sig in signals:
        market = (sig.get("market_hint") or "unknown").lower()
        role = sig.get("role_hint") or "unknown"
        if market == "unknown" or role == "unknown":
            continue
        key = f"{market}::{role}"
        groups[key].append(sig)

    results = {}
    for key, sigs in groups.items():
        market, role = key.split("::", 1)

        if len(sigs) < MIN_SIGNALS_FOR_BAND:
            continue

        # Confidence-weighted mean of mid-points
        total_weight = 0.0
        weighted_sum = 0.0
        by_type: dict[str, list[float]] = defaultdict(list)

        for sig in sigs:
            mid = _mid(sig)
            w = _weight(sig)
            st = sig.get("source_type", "job_posting")
            by_type[st].append(mid)
            weighted_sum += mid * w
            total_weight += w

        weighted_mid = round(weighted_sum / total_weight) if total_weight > 0 else 0
        raw_mids = [_mid(s) for s in sigs]
        raw_min = min(s["min"] for s in sigs)
        raw_max = max(s["max"] for s in sigs)

        # Confidence score: average base * count-factor (5 signals = full base credit)
        avg_base = statistics.mean(WEIGHT_BY_TYPE.get(s.get("source_type", "job_posting"), FALLBACK_WEIGHT) for s in sigs)
        count_factor = min(1.0, len(sigs) / 5)
        confidence = round(avg_base * count_factor, 3)

        # Source breakdown
        type_counts = {t: len(v) for t, v in by_type.items()}
        sources_used = list({s["source"] for s in sigs})

        results[key] = {
            "market": market,
            "role": role,
            "signal_count": len(sigs),
            "weighted_mid": weighted_mid,
            "raw_min": raw_min,
            "raw_max": raw_max,
            "raw_median": round(statistics.median(raw_mids)),
            "confidence_score": confidence,
            "source_types": type_counts,
            "sources_count": len(sources_used),
            "currency": _most_common_currency(sigs),
        }

    return results


def _most_common_currency(sigs: list[dict]) -> str:
    counts: dict[str, int] = defaultdict(int)
    for s in sigs:
        counts[s.get("currency", "GBP")] += 1
    return max(counts, key=counts.get)


def print_summary(combined: dict) -> None:
    print(f"\n{'Market':12} {'Role':22} {'Sig':4} {'Wt.Mid':8} {'Raw Min':8} {'Raw Max':8} {'Conf':6} {'Types'}")
    print("-" * 90)
    for k in sorted(combined):
        v = combined[k]
        sym = "£" if v["currency"] == "GBP" else "€"
        types_str = ", ".join(f"{t}:{n}" for t, n in v["source_types"].items())
        print(f"{v['market']:12} {v['role']:22} {v['signal_count']:4} "
              f"{sym}{v['weighted_mid']:>7,} {sym}{v['raw_min']:>7,} {sym}{v['raw_max']:>7,} "
              f"{v['confidence_score']:.3f}  {types_str}")


def main():
    parser = argparse.ArgumentParser(description="Confidence-weighted salary combiner")
    parser.add_argument("--signals", type=Path, default=DEFAULT_SIGNALS)
    parser.add_argument("--out",     type=Path, default=DEFAULT_OUT)
    parser.add_argument("--dry-run", action="store_true", help="Print only, do not write output")
    args = parser.parse_args()

    print(f"[combine] Loading signals from: {args.signals}")
    signals = load_signals(args.signals)
    print(f"[combine] Loaded {len(signals)} signals.")

    combined = combine_signals(signals)
    print(f"[combine] Combined into {len(combined)} market::role groups.")
    print_summary(combined)

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_signal_count": len(signals),
        "group_count": len(combined),
        "groups": combined,
    }

    if args.dry_run:
        print("\n[combine] Dry-run — output not written.")
        return

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"[combine] Written: {args.out}")


if __name__ == "__main__":
    main()
