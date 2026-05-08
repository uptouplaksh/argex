import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import HTTPException

from backend.app.core.config import CURRENCY_RATE_API_URL, CURRENCY_RATE_TTL_SECONDS

BASE_CURRENCY = "USD"
SUPPORTED_CURRENCIES = ("USD", "INR", "EUR", "GBP")

_cache_lock = Lock()
_rate_cache: dict | None = None


def normalize_currency(currency: str | None) -> str:
    value = (currency or BASE_CURRENCY).upper()
    if value not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    return value


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_time(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _build_rate_url() -> str:
    quote_currencies = ",".join(currency for currency in SUPPORTED_CURRENCIES if currency != BASE_CURRENCY)
    query = urllib.parse.urlencode({"from": BASE_CURRENCY, "to": quote_currencies})
    return f"{CURRENCY_RATE_API_URL}?{query}"


def _validate_rates(payload: dict) -> dict[str, float]:
    if payload.get("base") != BASE_CURRENCY:
        raise ValueError("Currency API returned an unexpected base currency")

    raw_rates = payload.get("rates")
    if not isinstance(raw_rates, dict):
        raise ValueError("Currency API returned malformed rates")

    rates = {BASE_CURRENCY: 1.0}
    for currency in SUPPORTED_CURRENCIES:
        if currency == BASE_CURRENCY:
            continue

        rate = raw_rates.get(currency)
        if not isinstance(rate, int | float) or rate <= 0:
            raise ValueError(f"Currency API returned invalid rate for {currency}")
        rates[currency] = float(rate)

    return rates


def _fetch_live_rates() -> dict:
    request = urllib.request.Request(
        _build_rate_url(),
        headers={
            "Accept": "application/json",
            "User-Agent": "Argex/1.0 (+https://argex.local)",
        },
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        payload = json.loads(response.read().decode("utf-8"))

    now = utc_now()
    return {
        "base": BASE_CURRENCY,
        "rates": _validate_rates(payload),
        "provider": "Frankfurter",
        "provider_date": payload.get("date"),
        "fetched_at": now,
        "expires_at": now + timedelta(seconds=CURRENCY_RATE_TTL_SECONDS),
        "stale": False,
        "error": None,
    }


def _public_snapshot(snapshot: dict, stale: bool | None = None, error: str | None = None) -> dict:
    is_stale = snapshot.get("stale", False) if stale is None else stale
    return {
        "base": snapshot["base"],
        "rates": snapshot["rates"],
        "supported_currencies": list(SUPPORTED_CURRENCIES),
        "provider": snapshot.get("provider", "Frankfurter"),
        "provider_date": snapshot.get("provider_date"),
        "fetched_at": _serialize_time(snapshot.get("fetched_at")),
        "expires_at": _serialize_time(snapshot.get("expires_at")),
        "ttl_seconds": CURRENCY_RATE_TTL_SECONDS,
        "stale": is_stale,
        "error": error,
    }


def get_exchange_rates(force_refresh: bool = False) -> dict:
    global _rate_cache

    now = utc_now()
    with _cache_lock:
        if (
            not force_refresh
            and _rate_cache
            and _rate_cache.get("expires_at")
            and _rate_cache["expires_at"] > now
        ):
            return _public_snapshot(_rate_cache)

        try:
            _rate_cache = _fetch_live_rates()
            return _public_snapshot(_rate_cache)
        except Exception as exc:
            if _rate_cache:
                return _public_snapshot(_rate_cache, stale=True, error="Live rates temporarily unavailable")

            raise HTTPException(
                status_code=503,
                detail="Exchange rates temporarily unavailable",
            ) from exc


def convert_from_usd(amount: float, currency: str) -> float:
    target = normalize_currency(currency)
    snapshot = get_exchange_rates()
    return round(float(amount or 0) * snapshot["rates"][target], 2)


def convert_to_usd(amount: float, currency: str) -> float:
    source = normalize_currency(currency)
    snapshot = get_exchange_rates()
    return round(float(amount or 0) / snapshot["rates"][source], 2)
