from fastapi import APIRouter

from backend.app.services.currency_service import get_exchange_rates

router = APIRouter(prefix="/currency", tags=["Currency"])


@router.get("/rates")
def exchange_rates(force_refresh: bool = False):
    return get_exchange_rates(force_refresh=force_refresh)
