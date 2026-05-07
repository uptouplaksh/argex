import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.auction import Auction, AuctionStatus
from backend.app.models.bid import Bid
from backend.app.models.category import Category
from backend.app.schemas.auction import AuctionCreate, AuctionUpdate
from backend.app.services import logging_service
from backend.app.services.websocket_manager import manager


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_auction_or_404(db: Session, auction_id: int) -> Auction:
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


def list_auctions(db: Session, category_id: int | None = None) -> list[Auction]:
    query = db.query(Auction).filter(Auction.status != AuctionStatus.cancelled)
    if category_id is not None:
        query = query.filter(Auction.category_id == category_id)
    return query.all()


def create_auction(db: Session, data: AuctionCreate, current_user) -> Auction:
    if getattr(current_user, "is_blocked", False):
        raise HTTPException(status_code=403, detail="Your account has been blocked")

    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    now = utc_now()
    start_time = ensure_aware_utc(data.start_time) if data.start_time else now
    end_time = ensure_aware_utc(data.end_time)
    if data.starting_price <= 0:
        raise HTTPException(status_code=400, detail="Starting price must be greater than zero")
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="Auction end time must be after start time")

    auction = Auction(
        title=data.title,
        description=data.description,
        starting_price=data.starting_price,
        current_price=data.starting_price,
        seller_id=current_user.id,
        category_id=data.category_id,
        start_time=start_time,
        end_time=end_time,
        status=AuctionStatus.upcoming if start_time > now else AuctionStatus.active,
    )

    db.add(auction)
    db.flush()

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="CREATE_AUCTION",
        entity_type="AUCTION",
        entity_id=auction.id,
        details=data.model_dump(),
    )

    db.commit()
    db.refresh(auction)
    return auction


def update_auction(db: Session, auction_id: int, data: AuctionUpdate, current_user) -> Auction:
    auction = get_auction_or_404(db, auction_id)

    if auction.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the auction seller can edit this auction")

    if auction.status != AuctionStatus.upcoming or ensure_aware_utc(auction.start_time) <= utc_now():
        raise HTTPException(status_code=400, detail="Auction cannot be edited after it has started")

    update_data = data.model_dump(exclude_unset=True)

    if "end_time" in update_data and update_data["end_time"] is not None:
        new_end_time = ensure_aware_utc(update_data["end_time"])
        current_end_time = ensure_aware_utc(auction.end_time)
        if new_end_time < current_end_time:
            raise HTTPException(status_code=400, detail="Auction end time cannot be shortened")
        if new_end_time > current_end_time:
            auction.end_time = new_end_time

    if "title" in update_data and update_data["title"] is not None:
        auction.title = update_data["title"]
    if "description" in update_data:
        auction.description = update_data["description"]
    if "starting_price" in update_data and update_data["starting_price"] is not None:
        if update_data["starting_price"] <= 0:
            raise HTTPException(status_code=400, detail="Starting price must be greater than zero")
        auction.starting_price = update_data["starting_price"]
        auction.current_price = update_data["starting_price"]

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="UPDATE_AUCTION",
        entity_type="AUCTION",
        entity_id=auction.id,
        details=update_data,
    )

    db.commit()
    db.refresh(auction)
    return auction


def cancel_auction(db: Session, auction_id: int, current_user) -> None:
    auction = get_auction_or_404(db, auction_id)

    if auction.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the auction seller can cancel this auction")

    if auction.status == AuctionStatus.cancelled:
        raise HTTPException(status_code=400, detail="Auction is already cancelled")

    if auction.status == AuctionStatus.ended or ensure_aware_utc(auction.end_time) <= utc_now():
        auction.status = AuctionStatus.ended
        db.commit()
        raise HTTPException(status_code=400, detail="Auction already ended")

    has_bids = db.query(Bid.id).filter(Bid.auction_id == auction_id).first()
    if has_bids:
        raise HTTPException(status_code=400, detail="Auction cannot be cancelled after bids exist")

    auction.status = AuctionStatus.cancelled

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="CANCEL_AUCTION",
        entity_type="AUCTION",
        entity_id=auction.id,
    )

    db.commit()


def get_highest_bid(db: Session, auction_id: int) -> Bid | None:
    get_auction_or_404(db, auction_id)
    return (
        db.query(Bid)
        .filter(Bid.auction_id == auction_id)
        .order_by(Bid.amount.desc(), Bid.created_at.asc())
        .first()
    )


async def handle_auction_end(db: Session, auction: Auction):
    if auction.status == AuctionStatus.ended:
        return

    auction.status = AuctionStatus.ended
    highest_bid = get_highest_bid(db, auction.id)

    winner_id = highest_bid.bidder_id if highest_bid else None
    final_price = highest_bid.amount if highest_bid else auction.current_price

    message = {
        "type": "AUCTION_ENDED",
        "auction_id": auction.id,
        "winner_id": winner_id,
        "final_price": final_price,
    }
    await manager.broadcast(auction.id, json.dumps(message))

    logging_service.log_action(
        db=db,
        user_id=None,  # System action
        action_type="AUCTION_ENDED",
        entity_type="AUCTION",
        entity_id=auction.id,
        details={"winner_id": winner_id, "final_price": final_price},
    )
