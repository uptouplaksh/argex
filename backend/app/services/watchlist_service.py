from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.auction import Auction, AuctionStatus
from backend.app.models.watchlist import Watchlist


def list_watchlist(db: Session, current_user) -> list[Watchlist]:
    return (
        db.query(Watchlist)
        .join(Auction)
        .filter(
            Watchlist.user_id == current_user.id,
            Auction.status != AuctionStatus.cancelled,
        )
        .all()
    )


def add_to_watchlist(db: Session, auction_id: int, current_user) -> Watchlist:
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction or auction.status == AuctionStatus.cancelled:
        raise HTTPException(status_code=404, detail="Auction not found")

    watchlist_item = Watchlist(user_id=current_user.id, auction_id=auction_id)
    db.add(watchlist_item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Auction is already in watchlist")

    db.refresh(watchlist_item)
    return watchlist_item


def remove_from_watchlist(db: Session, auction_id: int, current_user) -> None:
    watchlist_item = (
        db.query(Watchlist)
        .filter(
            Watchlist.user_id == current_user.id,
            Watchlist.auction_id == auction_id,
        )
        .first()
    )
    if not watchlist_item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    db.delete(watchlist_item)
    db.commit()
