from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.auction import Auction, AuctionStatus
from backend.app.models.auto_bid import AutoBid
from backend.app.models.bid import Bid
from backend.app.models.user import User
from backend.app.services import logging_service, notification_service
from backend.app.services.currency_service import convert_from_usd, normalize_currency


def format_auction_amount(amount: float, auction: Auction) -> str:
    currency = normalize_currency(getattr(auction, "auction_currency", None))
    try:
        native_amount = float(amount or 0) if currency == "USD" else convert_from_usd(amount, currency)
        return f"{currency} {native_amount:,.2f}"
    except HTTPException:
        return f"USD {float(amount or 0):,.2f}"


def get_reserved_balance(db: Session, user_id: int, exclude_auction_id: int | None = None) -> float:
    active_statuses = [AuctionStatus.upcoming, AuctionStatus.active]
    auctions = (
        db.query(Auction)
        .filter(Auction.status.in_(active_statuses))
        .all()
    )

    reserved = 0.0
    for auction in auctions:
        if exclude_auction_id is not None and auction.id == exclude_auction_id:
            continue

        highest_bid = (
            db.query(Bid)
            .filter(Bid.auction_id == auction.id)
            .order_by(Bid.amount.desc(), Bid.created_at.asc())
            .first()
        )
        if highest_bid and highest_bid.bidder_id == user_id:
            reserved += float(highest_bid.amount or 0)

    active_auto_bids = (
        db.query(AutoBid)
        .filter(AutoBid.user_id == user_id, AutoBid.is_active.is_(True))
        .all()
    )
    for auto_bid in active_auto_bids:
        if exclude_auction_id is not None and auto_bid.auction_id == exclude_auction_id:
            continue
        reserved += max(float(auto_bid.max_bid or 0) - float(auto_bid.current_bid or 0), 0)

    return round(reserved, 2)


def get_available_balance(db: Session, user: User, exclude_auction_id: int | None = None) -> float:
    return round(float(user.account_balance or 0) - get_reserved_balance(db, user.id, exclude_auction_id), 2)


def ensure_bid_affordable(
        db: Session,
        user: User,
        amount: float,
        auction_id: int,
        message: str = "Insufficient balance",
) -> None:
    available = get_available_balance(db, user, exclude_auction_id=auction_id)
    if float(amount or 0) > available:
        raise HTTPException(status_code=400, detail=message)


def settle_auction(db: Session, auction: Auction, highest_bid: Bid | None) -> None:
    if not highest_bid:
        return

    buyer = db.query(User).filter(User.id == highest_bid.bidder_id).with_for_update().first()
    seller = db.query(User).filter(User.id == auction.seller_id).with_for_update().first()
    if not buyer or not seller:
        return

    amount = float(highest_bid.amount or 0)
    if amount <= 0:
        return

    if float(buyer.account_balance or 0) < amount:
        notification_service.create_notification(
            db=db,
            user_id=buyer.id,
            type="PAYMENT_FAILED",
            message=f"Settlement failed for '{auction.title}' because your account balance was insufficient.",
        )
        logging_service.log_action(
            db=db,
            user_id=buyer.id,
            action_type="AUCTION_SETTLEMENT_FAILED",
            entity_type="AUCTION",
            entity_id=auction.id,
            details={"amount": amount, "seller_id": seller.id},
        )
        return

    buyer.account_balance = round(float(buyer.account_balance or 0) - amount, 2)
    seller.account_balance = round(float(seller.account_balance or 0) + amount, 2)
    display_amount = format_auction_amount(amount, auction)

    notification_service.create_notification(
        db=db,
        user_id=buyer.id,
        type="AUCTION_PAYMENT_SETTLED",
        message=f"Your winning payment of {display_amount} for '{auction.title}' has been settled.",
    )
    notification_service.create_notification(
        db=db,
        user_id=seller.id,
        type="AUCTION_PAYOUT_SETTLED",
        message=f"You received {display_amount} from the completed auction '{auction.title}'.",
    )
    logging_service.log_action(
        db=db,
        user_id=None,
        action_type="AUCTION_SETTLEMENT",
        entity_type="AUCTION",
        entity_id=auction.id,
        details={"buyer_id": buyer.id, "seller_id": seller.id, "amount": amount},
    )
