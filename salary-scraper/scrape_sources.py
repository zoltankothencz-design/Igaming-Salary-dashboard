"""
Scrapes publicly accessible iGaming salary sources.
LinkedIn and Glassdoor are skipped (require login / heavy bot protection).
Signal schema: {source, source_type, title, currency, min, max, role_hint,
                market_hint, operator_hint, confidence_base, scraped_at}

source_type values and confidence_base defaults:
  "survey"      — structured salary report / benchmark study       0.80
  "editorial"   — curated guide / salary article                   0.65
  "job_posting" — live job board listing (salary stated in ad)     0.55
  "cross_check" — aggregated / estimated (Indeed API, Glassdoor)   0.35
"""
import re
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "en-GB,en;q=0.9",
}
TIMEOUT = 20

# Salary patterns: matches "£28,000", "€45k", "28000 GBP", "28,000 - 45,000", etc.
SALARY_PATTERN = re.compile(
    r"(?:£|€|GBP|EUR|gbp|eur)?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(?:k|K)?\s*"
    r"(?:[-–—to]+\s*(?:£|€|GBP|EUR|gbp|eur)?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)\s*(?:k|K)?)?",
    re.IGNORECASE,
)
CURRENCY_HINT = re.compile(r"(£|GBP|\bgibraltar\b)", re.IGNORECASE)
EUR_HINT = re.compile(r"(€|EUR|\bmalta\b)", re.IGNORECASE)

# Maps career page domain/path fragments to operator keys in salary-data.json
OPERATOR_URL_MAP = {
    "jobs.ashbyhq.com/b2spin": "b2spin",
    "betclicgroup.com": "betclic",
    "careers.eeze.com": "eeze",
    "finnplay.teamtailor.com": "finnplay",
    "lottomart.com": "lottomart",
    "hiring.over99.com": "over99",
    "l1.com/jobs": "legend",
    "entaincareers.com": "entain",
    "betssongroup.com": "betsson",
    "flutter.com/careers": "flutter",
    "flutter.com/find-a-career": "flutter",
    "reveliolabs.com/flutter-entertainment": "flutter",
}


def _get_operator_hint(url: str) -> str | None:
    for fragment, key in OPERATOR_URL_MAP.items():
        if fragment in url:
            return key
    return None


ROLE_KEYWORDS = {
    "customerSupport": ["customer support", "customer service", "account advisor", "chat host", "player support"],
    "productManager": ["product manager", "product owner", "pm ", "product lead"],
    "compliance": ["compliance", "aml", "kyc", "responsible gambling", "rg specialist"],
    "marketingAffiliate": ["marketing", "affiliate", "seo", "crm executive", "brand"],
    "crmVipOps": ["vip", "crm", "operations manager", "casino manager", "operations director", "slot manager"],
    "director": ["director", "head of", "general manager", "c-level", "ceo", "coo", "cto", "md ", "managing director"],
    "technology": ["software engineer", "developer", "backend", "frontend", "full stack", "devops", "qa engineer", "data engineer", "tech lead", "platform engineer", "infrastructure engineer"],
}

# Source type constants
ST_SURVEY      = "survey"       # structured salary report / benchmark: confidence_base 0.80
ST_EDITORIAL   = "editorial"    # curated guide / salary article: confidence_base 0.65
ST_JOB_POSTING = "job_posting"  # live job board (salary in posting): confidence_base 0.55
ST_CROSS_CHECK = "cross_check"  # aggregated / estimated: confidence_base 0.35

CONFIDENCE_BASE = {
    ST_SURVEY:      0.80,
    ST_EDITORIAL:   0.65,
    ST_JOB_POSTING: 0.55,
    ST_CROSS_CHECK: 0.35,
}

# Source tuples: (url, market_hint, source_type)
# market_hint: "Gibraltar" | "Malta" | None
# Refresh cadence (not enforced here — handled by GH Actions schedule):
#   survey/editorial: quarterly  |  job_posting: weekly  |  cross_check: monthly
STATIC_SOURCES = [
    # === STREAM 1: Salary surveys / benchmarks (quarterly) ===
    ("https://careersgibraltar.com/salary-guide",                                        "Gibraltar", ST_SURVEY),
    ("https://careersgibraltar.com/blog/gibraltar-salary-guide-2026",                   "Gibraltar", ST_SURVEY),
    ("https://careersgibraltar.com/blog/igaming-companies-gibraltar-hiring-salaries-2026", "Gibraltar", ST_EDITORIAL),
    ("https://careersgibraltar.com/blog/gibraltar-under-37500-legitimate-routes",       "Gibraltar", ST_EDITORIAL),
    ("https://careersgibraltar.com/work-in-gibraltar/british",                          "Gibraltar", ST_EDITORIAL),
    ("https://impjieg.work/malta-salary-report-2026",                                   "Malta",      ST_SURVEY),
    ("https://www.businessofigaming.com/salaries-in-igaming/",                          "Malta",      ST_SURVEY),
    ("https://freemalta.com/hub/salary-benchmark",                                       "Malta",      ST_SURVEY),
    ("https://freemalta.com/articles/igaming-jobs-salary-malta-entry-level",            "Malta",      ST_EDITORIAL),
    ("https://theigaming.eu/2026/05/05/igaming-salaries-report-2025-2026/",              None,         ST_SURVEY),
    ("https://www.intergameonline.com/igaming/igaming-salaries-survey",                 None,         ST_SURVEY),
    ("https://track360.io/blog/affiliate-manager-salary-report-2026",                   None,         ST_SURVEY),
    ("https://www.itjobswatch.co.uk/jobs/uk/igaming.do",                                None,         ST_CROSS_CHECK),
    ("https://www.igamingnext.com/jobs/salary-guide/",                                  None,         ST_EDITORIAL),
    ("https://www.casinobeats.com/igaming-salary-guide/",                               None,         ST_EDITORIAL),
    ("https://eworkforce.eu/igaming-salaries/",                                         None,         ST_EDITORIAL),
    # === STREAM 2: Live job boards (weekly) ===
    ("https://bigbetjobs.com/jobs/gibraltar/",                                           "Gibraltar", ST_JOB_POSTING),
    ("https://bigbetjobs.com/jobs/leadership/",                                          None,         ST_JOB_POSTING),
    ("https://bigbetjobs.com/jobs/operations-and-logistics/",                           None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/",                                                     None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/operations/",                                          None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/compliance-legal/",                                   None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/product/",                                             None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/marketing-affiliates/",                               None,         ST_JOB_POSTING),
    ("https://www.bettingjobs.com/management/",                                          None,         ST_JOB_POSTING),
    ("https://igamingcentre.com/jobs",                                                   None,         ST_JOB_POSTING),
    ("https://hirify.me/igaming-jobs",                                                   None,         ST_JOB_POSTING),
    ("https://hirify.me/jobs/713355-regional-managing-director-group-ceo-igaming",      None,         ST_JOB_POSTING),
    ("https://hirify.me/jobs/747610-product-owner-igaming",                             None,         ST_JOB_POSTING),
    ("https://careersgibraltar.com/industries/prediction-markets",                      "Gibraltar",  ST_JOB_POSTING),
    ("https://www.jobmatchingpartner.com/jobs/8020317-finance-manager-igaming",         None,         ST_JOB_POSTING),
    ("https://3s.info/en/igaming-job/",                                                  None,         ST_JOB_POSTING),
    # Pentasia — specialist iGaming recruiter (Gibraltar + Malta)
    ("https://www.pentasia.com/jobs/?location=Gibraltar",                                "Gibraltar",  ST_JOB_POSTING),
    ("https://www.pentasia.com/jobs/?location=Malta",                                    "Malta",      ST_JOB_POSTING),
    # Recruiter4You Malta
    ("https://www.recruiter4you.com/jobs/",                                              "Malta",      ST_JOB_POSTING),
    # Careerjet Malta iGaming
    ("https://www.careerjet.com.mt/search/jobs?s=igaming&l=Malta",                     "Malta",      ST_JOB_POSTING),
    # Broadwing — Malta tech/iGaming specialist
    ("https://www.broadwing.eu/jobs",                                                    "Malta",      ST_JOB_POSTING),
    # Company career pages (non-LinkedIn)
    ("https://betclicgroup.com/en/people",                                               None,         ST_JOB_POSTING),
    ("https://lottomart.com/en-gb/careers",                                              None,         ST_JOB_POSTING),
    ("https://www.recruitgibraltar.com/jobsearchresults",                               "Gibraltar",  ST_JOB_POSTING),
    ("https://l1.com/jobs?department=Operations/",                                       None,         ST_JOB_POSTING),
    # FX / finance pages (for context only, no salary signals expected)
    ("https://www.poundsterlinglive.com/data/currencies/eur-pairs/EURGBP-exchange-rate", None,        ST_CROSS_CHECK),
]

# Playwright-only (JS-rendered) sources
JS_SOURCES = [
    # === STREAM 1: Surveys / benchmarks ===
    ("https://hirico.io/salaries/customer_support/mid",                                  "Malta",      ST_SURVEY),
    ("https://hirico.io/",                                                               None,          ST_SURVEY),
    ("https://igameers.com/guides/igaming-salaries-malta-2026",                         "Malta",       ST_SURVEY),
    ("https://engagetalent.castillians.com/castille-malta-salary-benchmark-2026",       "Malta",       ST_SURVEY),
    # === STREAM 2: Job boards / company pages ===
    ("https://www.reveliolabs.com/companies/flutter-entertainment/employees",           None,           ST_CROSS_CHECK),
    ("https://betssongroup.com/careers/available-jobs/",                                None,           ST_JOB_POSTING),
    ("https://www.anyworkanywhere.com/job/german-speaking-customer-account-advisor-relocation-to-malta/", "Malta", ST_JOB_POSTING),
    ("https://www.boston-link.com/salary-reports",                                      None,           ST_EDITORIAL),  # form-gated; job listings accessible
    ("https://portal.careerfinders.com.cy/job-listing?category=OG+",                   None,           ST_JOB_POSTING),
    ("https://es.jooble.org/trabajo-marketing-ingles/Gibraltar",                        "Gibraltar",    ST_JOB_POSTING),
    ("https://startup.jobs/ai-director-igaming-idol-8781716",                           None,           ST_JOB_POSTING),
    ("https://www.recruiter4you.com/jobs/8000747-aml-rg-specialist",                   None,           ST_JOB_POSTING),
    # Company JS-rendered pages (teamtailor + React career sites)
    ("https://jobs.ashbyhq.com/b2spin",                                                 None,           ST_JOB_POSTING),
    ("https://careers.eeze.com/jobs",                                                   None,           ST_JOB_POSTING),
    ("https://finnplay.teamtailor.com/jobs",                                            None,           ST_JOB_POSTING),
    ("https://hiring.over99.com/jobs",                                                  None,           ST_JOB_POSTING),
    ("https://fungies.io",                                                              None,           ST_JOB_POSTING),
    ("https://entaincareers.com/job-search/?location=gibraltar",                        "Gibraltar",    ST_JOB_POSTING),
    ("https://entaincareers.com/job-search/",                                           None,           ST_JOB_POSTING),
    ("https://flutter.com/careers",                                                     None,           ST_JOB_POSTING),
]

# Explicitly skipped (login required or bot-protected -- reported in output)
SKIPPED_SOURCES = [
    ("https://www.linkedin.com/company/anakatech/jobs/", "login required"),
    ("https://www.linkedin.com/jobs/search-results/?f_C=102696781", "login required"),
    ("https://www.linkedin.com/company/excogg/jobs/", "login required"),
    ("https://www.linkedin.com/company/fungies/jobs/", "login required"),
    ("https://www.linkedin.com/company/leovegasgroup/jobs/", "login required"),
    ("https://www.linkedin.com/jobs/search-results/?f_C=23525800", "login required"),
    ("https://www.linkedin.com/jobs/search-results/?f_C=17960368", "login required"),
    ("https://www.linkedin.com/jobs/search-results/?f_C=98672362", "login required"),
    ("https://www.linkedin.com/company/stakemate/jobs/", "login required"),
    ("https://www.glassdoor.co.uk/Job/gibraltar-igaming-casino-jobs-SRCH_IL.0,9_IC5023252_KO10,24.htm", "login required"),
    ("https://www.glassdoor.co.uk/Job/gibraltar-igaming-jobs-SRCH_IL.0,9_IC5023252_KO10,17.htm", "login required"),
    ("https://uk.indeed.com/cmp/Entain/reviews?ftopic=wlbalance", "bot-protected"),
    ("https://www.reuters.com/company/flutter-entertainment-plc/", "paywall"),
    ("https://www.bloomberg.com/quote/EURGBP:CUR", "paywall"),
    ("https://www.morningstar.com/stocks/xnys/flut/quote", "paywall"),
    ("https://quick-offer.ru/job/middle-senior-game-designer-producer-81386", "likely inaccessible"),
    ("https://freemalta.com/hub/salary-benchmark?sector=igaming", "duplicate"),
    # Bet365: both career URLs return 403 Forbidden -- no scrapable public salary data
    ("https://www.bet365.com/en/about/careers", "403 forbidden"),
    ("https://bet365careers.com", "403 forbidden"),
    # Salary aggregators: login required or bot-protected
    ("https://uk.indeed.com/cmp/Bet365/salaries", "login required"),
    ("https://uk.indeed.com/cmp/Entain/salaries", "login required"),
    ("https://uk.indeed.com/cmp/Flutter-Entertainment/salaries", "login required"),
    ("https://www.glassdoor.co.uk/Salary/Entain-Salaries-E419254.htm", "login required"),
    ("https://www.glassdoor.co.uk/Salary/Flutter-Entertainment-Salaries-E2196527.htm", "login required"),
    ("https://www.payscale.com/research/GB/Employer=Bet365/Salary", "bot-protected"),
    ("https://www.levels.fyi/companies/flutter-entertainment/salaries/", "404 not found"),
]


def _parse_salary_value(s: str) -> int | None:
    s = s.replace(",", "").replace(" ", "").strip()
    if not s:
        return None
    try:
        val = float(s)
        if val < 100:
            val *= 1000  # treat as "k" shorthand
        if 5000 <= val <= 500000:
            return int(val)
    except ValueError:
        pass
    return None


def _infer_currency(text: str, market_hint: str | None) -> str:
    if market_hint == "Gibraltar":
        return "GBP"
    if market_hint == "Malta":
        return "EUR"
    if CURRENCY_HINT.search(text[:500]):
        return "GBP"
    if EUR_HINT.search(text[:500]):
        return "EUR"
    return "GBP"


def _infer_role(text: str) -> str | None:
    text_lower = text.lower()
    for role, kws in ROLE_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            return role
    return None


_CURRENCY_OR_K = re.compile(r"[£€]|GBP|EUR|[kK]\b", re.IGNORECASE)
# Line-level check uses a tighter pattern: digit+k (salary shorthand) but not words like "Check", "risk"
_CURRENCY_IN_LINE = re.compile(r"[£€]|GBP|EUR|\d[kK]\b", re.IGNORECASE)
_SALARY_CONTEXT = re.compile(
    r"\b(salary|salaire|remuneration|compensation|package|per\s*(?:year|annum)|annually|p\.?a\.?\b|wage|pay\s+range|earning)",
    re.IGNORECASE,
)


def _extract_signals_from_text(
    text: str, url: str, market_hint: str | None,
    source_type: str = ST_JOB_POSTING
) -> list[dict]:
    signals = []
    currency = _infer_currency(text, market_hint)
    operator_hint = _get_operator_hint(url)
    confidence_base = CONFIDENCE_BASE.get(source_type, 0.55)
    lines = text.splitlines()
    for line in lines:
        has_currency_in_line = bool(_CURRENCY_IN_LINE.search(line))
        matches = list(SALARY_PATTERN.finditer(line))
        for m in matches:
            raw1 = m.group(1).replace(",", "").replace(" ", "").strip()
            # Bare small numbers (< 100) without explicit currency or k-suffix are noise
            # e.g. "Over99" → "99" → would auto-scale to 99000 incorrectly
            try:
                raw_float = float(raw1)
            except ValueError:
                continue
            if raw_float < 100 and not _CURRENCY_OR_K.search(m.group(0)):
                continue
            lo = _parse_salary_value(m.group(1))
            hi = _parse_salary_value(m.group(2)) if m.group(2) else None
            if lo is None:
                continue
            if hi and hi < lo:
                lo, hi = hi, lo
            if lo < 8000:
                continue  # monthly value or noise
            # Large numbers without currency in the line must have explicit salary context
            # e.g. "200,000 requests per month" is a business metric, not a salary
            if lo >= 100000 and not has_currency_in_line:
                if not _SALARY_CONTEXT.search(line):
                    continue
            role = _infer_role(line)
            signals.append({
                "source": url,
                "source_type": source_type,
                "confidence_base": confidence_base,
                "title": line.strip()[:140],
                "currency": currency,
                "min": lo,
                "max": hi or lo,
                "role_hint": role,
                "market_hint": market_hint,
                "operator_hint": operator_hint,
            })
    return signals


def scrape_static(url: str, market_hint: str | None, source_type: str = ST_JOB_POSTING) -> list[dict]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "lxml")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(" ", strip=True)
            sigs = _extract_signals_from_text(text, url, market_hint, source_type)
            print(f"[static/{source_type}] {url} -> {len(sigs)} signals")
            return sigs
        else:
            print(f"[static] {url} -> HTTP {r.status_code}")
    except Exception as e:
        print(f"[static] {url} -> error: {e}")
    return []


def scrape_js(url: str, market_hint: str | None, source_type: str = ST_JOB_POSTING) -> list[dict]:
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--disable-setuid-sandbox"])
            page = browser.new_page(extra_http_headers={"Accept-Language": "en-GB,en;q=0.9"})
            page.goto(url, timeout=30000, wait_until="networkidle")
            text = page.inner_text("body")
            browser.close()
        sigs = _extract_signals_from_text(text, url, market_hint, source_type)
        print(f"[js/{source_type}] {url} -> {len(sigs)} signals")
        return sigs
    except Exception as e:
        print(f"[js] {url} -> error: {e}")
        return []


def collect_all_signals(use_playwright: bool = True) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    signals = []

    for entry in STATIC_SOURCES:
        url, market_hint = entry[0], entry[1]
        source_type = entry[2] if len(entry) > 2 else ST_JOB_POSTING
        sigs = scrape_static(url, market_hint, source_type)
        for s in sigs:
            s["scraped_at"] = now
        signals.extend(sigs)
        time.sleep(0.5)

    if use_playwright:
        for entry in JS_SOURCES:
            url, market_hint = entry[0], entry[1]
            source_type = entry[2] if len(entry) > 2 else ST_JOB_POSTING
            sigs = scrape_js(url, market_hint, source_type)
            for s in sigs:
                s["scraped_at"] = now
            signals.extend(sigs)
            time.sleep(0.3)
    else:
        print(f"[scraper] Playwright disabled, skipping {len(JS_SOURCES)} JS sources.")

    skipped = [{"url": u, "reason": r} for u, r in SKIPPED_SOURCES]
    print(f"[scraper] Total signals: {len(signals)} | Skipped sources: {len(skipped)}")

    return {
        "scraped_at": now,
        "signal_count": len(signals),
        "signals": signals,
        "skipped_sources": skipped,
    }
