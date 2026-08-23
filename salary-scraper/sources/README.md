# Salary Scraper Source Architecture

Three-stream model for iGaming salary data collection.

## Streams

| Stream | source_type | Refresh cadence | Confidence base |
|--------|------------|-----------------|-----------------|
| 1 — Benchmarks | `survey`, `editorial` | Quarterly | 0.65 – 0.80 |
| 2 — Live job boards | `job_posting` | Weekly | 0.55 |
| 3 — Cross-check | `cross_check` | Monthly | 0.35 |

## Files

- `scrape_sources.py` (parent dir) — all source definitions + scraping logic
- `combine.py` (parent dir) — confidence-weighted aggregation of raw signals
- `update_indeed_salaries.py` (parent dir) — Stream 3 Indeed MCP cross-check (local only)

## Adding a new source

Add a tuple `(url, market_hint, source_type)` to `STATIC_SOURCES` or `JS_SOURCES`
in `../scrape_sources.py`. Use the ST_* constants for source_type.

## Weighting rules

1. Survey/editorial signals get 0.65–0.80 weight each
2. Job posting signals get 0.50 weight each
3. Cross-check signals get 0.30 weight each
4. Weighted mid = sum(mid_i * weight_i) / sum(weight_i)
5. Confidence score = avg_weight_base * min(1.0, signal_count / 5)

## Boston Link (form-gated)

Salary report: form + reCAPTCHA gated, not automatable.
Job listings page: accessible, add as job_posting source when URL confirmed.
Manual ingestion: download report quarterly, extract figures, add to salary-data.json.

## HRLadderBox — VERIFIED, HIGH CONFIDENCE

https://theigaming.eu/2026/05/05/igaming-salaries-report-2025-2026/ — **manually verified by Zoltan on 2026-08-23.**
Real, usable content. Published salary survey with department-by-department tables
for both Malta and Gibraltar. No login required (per Zoltan's verification).

### Data ingested (2026-08-23, source_type: survey, confidence: 0.80)

**Malta — Customer Operations:** Entry €20-28k | Mid €28-35k | Senior €35-45k
**Malta — Product Management:** Entry €35-45k | Mid €45-58k | Senior €58-80k+
**Malta — Compliance & Legal:** Entry €30-40k | Mid €40-52k | Senior €52-80k+
**Malta — Marketing & Affiliates:** Entry €28-38k | Mid €36-50k | Senior €50-68k+
**Malta — Technology:** Entry €30-40k | Mid €40-55k | Senior €55-75k+ (no matching role in schema)

**Gibraltar — Customer Operations:** Entry £20-26k | Mid £26-34k | Senior £34-40k
**Gibraltar — Product Management:** Entry £35-48k | Mid £55-75k | Senior £75-130k+
**Gibraltar — Compliance & Legal:** Entry £30-42k | Mid £42-58k | Senior £58-80k+
**Gibraltar — Marketing & Affiliates:** Entry £25-35k | Mid £35-50k | Senior £50-75k+
**Gibraltar — Technology:** Entry £28-42k | Mid £45-65k | Senior £65-95k+ (no matching role in schema)

Key notes from report:
- Malta: HQP 15% expat tax cap confirmed for €75k+ earners (cross-validates dashboard tax section)
- Malta: Relocation packages standard practice; sector outgrows local talent pool
- Gibraltar mid-level range GBP 52,000-68,000 confirmed (cross-validates dashboard bands)
- Gibraltar: Frontier workers from Spain compress local market; operators must move fast

All verified figures have been applied to salary-data.json (customerSupport, productManager,
compliance, marketingAffiliate for both markets).

Added to STATIC_SOURCES in scrape_sources.py as ST_SURVEY (2026-08-23). Note: site returns HTTP 403 to programmatic fetches — manual ingestion only; keep updating salary-data.json directly from the published tables.
