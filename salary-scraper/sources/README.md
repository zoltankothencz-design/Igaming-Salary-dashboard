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

## HRLadderBox (LinkedIn short URL)

lnkd.in/ds2KgGhY — expected to require LinkedIn login.
Status: not yet verified. Check manually before adding to sources.
