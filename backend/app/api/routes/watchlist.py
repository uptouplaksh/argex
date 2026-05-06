from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.schemas.watchlist import WatchlistResponse
from backend.app.services.watchlist_service import (
    add_to_watchlist,
    list_watchlist,
    remove_from_watchlist,
)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("/", response_model=list[WatchlistResponse])
def get_watchlist(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return list_watchlist(db, current_user)


@router.post("/{auction_id}", response_model=WatchlistResponse, status_code=201)
def post_watchlist_item(
        auction_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user),
):
    return add_to_watchlist(db, auction_id, current_user)


@router.delete("/{auction_id}", status_code=204)
def delete_watchlist_item(
        auction_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user),
):
    remove_from_watchlist(db, auction_id, current_user)
    return None
