#!/usr/bin/env python3
"""
Update salary-data.json with salary data fetched from the Indeed MCP API.

This script is run LOCALLY (not in GitHub Actions) because the Indeed MCP
is only available in a Claude Code session.

To refresh the data:
  1. Open a Claude Code session in this directory.
  2. For each operator+role below, call:
       mcp__claude_ai_Indeed__get_company_data(
           companyName="...",
           jobTitle="...",
           language="en",
           location={"country": "GB", ...},
           knowledgeCategories={"metadata": False, "ratings": False, "salaries": True}
       )
  3. Update INDEED_DATA below with fresh values, then re-run this script.

Limitations:
  - Figures are UK-wide averages (not Gibraltar/Malta-specific).
  - Gibraltar iGaming salaries are typically 10-40% above UK mainland averages.
  - Use as directional signal; career-page scraping produces more location-specific data.

Last refreshed: 2026-08-22 (Claude Code session)
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

# --- Indeed salary data (fetched 2026-08-22, UK country scope) ---
# Format: {operator_key: {dashboard_role: {indeed_job_title, avg_salary, count}}}
# Only entries with count >= 3 are included.
INDEED_DATA = {
    "entain": {
        "productManager": {
            "indeed_title": "Product Manager",
            "avg": 60522,
            "count": 11,
        },
        "customerSupport": {
            "indeed_title": "Customer Service Representative",
            "avg": 21073,
            "count": 9,
        },
        "crmVipOps": {
            "indeed_title": "VIP Manager",
            "avg": 36455,
            "count": 8,
        },
    },
    "flutter": {
        "productManager": {
            "indeed_title": "Product Manager",
            "avg": 52532,
            "count": 3,
        },
    },
    "bet365": {
        "customerSupport": {
            "indeed_title": "Customer Service Representative",
            "avg": 27558,
            "count": 13,
        },
        "crmVipOps": {
            "indeed_title": "Operations Manager",
            "avg": 42943,
            "count": 3,
        },
    },
}

# Which market to update for each operator
OPERATOR_MARKET = {
    "entain": "gibraltar",
    "flutter": "gibraltar",
    "bet365": "gibraltar",
}

# Operators whose career sites are confirmed 403-blocked or have no public salary data
NO_SCRAPE_SOURCE = {
    "bet365": "Career sites 403 blocked (bet365.com/careers + bet365careers.com)",
    "flutter": "Career site JS-rendered, no salary figures shown in listings",
    "entain": "Career site JS-rendered, no salary figures shown in listings",
}


def main():
    salary_path = REPO_ROOT / "salary-data.json"
    if not salary_path.exists():
        print(f"ERROR: {salary_path} not found", file=sys.stderr)
        sys.exit(1)

    salary_data = json.loads(salary_path.read_text())
    now_iso = datetime.now(timezone.utc).isoformat()
    updated_ops = []

    for op_key, roles in INDEED_DATA.items():
        op_data = salary_data.get("operators", {}).get(op_key)
        if not op_data:
            print(f"[indeed] {op_key}: not found in salary-data.json -- skipped")
            continue

        market = OPERATOR_MARKET.get(op_key)
        if not market:
            print(f"[indeed] {op_key}: no market mapping -- skipped")
            continue

        op_data.setdefault("salaryBands", {}).setdefault(market, {})

        any_updated = False
        for role, info in roles.items():
            mid = int(info["avg"])
            note = (
                f"Indeed UK-wide avg (N={info['count']}), "
                f"job title: {info['indeed_title']}. "
                "Gibraltar premium typically +10-40% above UK avg. "
                f"Fetched {now_iso[:10]}."
            )
            op_data["salaryBands"][market][role] = {
                "mid": mid,
                "source": "indeed-api",
                "signal_count": info["count"],
                "note": note,
            }
            print(f"[indeed] {op_key}/{market}/{role}: mid={mid} ({info['count']} signals)")
            any_updated = True

        if any_updated:
            prev_status = op_data.get("dataStatus", "unknown")
            op_data["dataStatus"] = "live"
            updated_ops.append(op_key)
            print(f"[indeed] {op_key}: dataStatus {prev_status!r} -> 'live'")
            if op_key in NO_SCRAPE_SOURCE:
                op_data["dataNote"] = NO_SCRAPE_SOURCE[op_key]

    salary_path.write_text(json.dumps(salary_data, indent=2, ensure_ascii=False) + "\n")
    print(f"\n[indeed] Done. Updated operators: {updated_ops}")
    print(f"[indeed] Written: {salary_path.name}")
    return updated_ops


if __name__ == "__main__":
    main()
