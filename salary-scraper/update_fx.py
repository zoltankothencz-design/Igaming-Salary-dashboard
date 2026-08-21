"""
Fetches EUR/GBP rate from the ECB XML feed.
Returns dict with EUR_GBP, updated, source keys.
"""
import xml.etree.ElementTree as ET
import requests
from datetime import datetime

ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
FALLBACK_URLS = [
    "https://api.exchangerate-api.com/v4/latest/EUR",
    "https://open.er-api.com/v6/latest/EUR",
]


def fetch_ecb() -> dict | None:
    try:
        r = requests.get(ECB_URL, timeout=15)
        r.raise_for_status()
        ns = {"ecb": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}
        root = ET.fromstring(r.text)
        for cube in root.iter("{http://www.ecb.int/vocabulary/2002-08-01/eurofxref}Cube"):
            if cube.get("currency") == "GBP":
                rate = float(cube.get("rate"))
                date_el = cube.getparent() if hasattr(cube, "getparent") else None
                return {"EUR_GBP": round(rate, 4), "source": "European Central Bank reference rate"}
        # lxml not available — walk manually
        for cube in root.iter():
            if cube.get("currency") == "GBP":
                return {"EUR_GBP": round(float(cube.get("rate")), 4), "source": "European Central Bank reference rate"}
    except Exception as e:
        print(f"[fx] ECB fetch failed: {e}")
    return None


def fetch_fallback() -> dict | None:
    for url in FALLBACK_URLS:
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            data = r.json()
            rates = data.get("rates", {})
            gbp = rates.get("GBP")
            if gbp:
                return {"EUR_GBP": round(float(gbp), 4), "source": url.split("/")[2]}
        except Exception as e:
            print(f"[fx] Fallback {url} failed: {e}")
    return None


def get_fx_data() -> dict:
    result = fetch_ecb() or fetch_fallback()
    if not result:
        print("[fx] All FX sources failed, keeping existing rate.")
        return {}
    today = datetime.utcnow().strftime("%-d %B %Y")
    result["updated"] = today
    print(f"[fx] EUR/GBP = {result['EUR_GBP']} ({result['source']})")
    return result
