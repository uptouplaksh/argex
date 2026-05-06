from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.auto_bid import AutoBid
from backend.app.models.auction import Auction, AuctionStatus
from backend.app.models.bid import Bid
from backend.app.services.security_service import evaluate_bid_risk

BID_INCREMENT = 1.0
ANTI_SNIPE_THRESHOLD_MINUTES = 2
ANTI_SNIPE_EXTENSION_MINUTES = 2
MAX_AUCTION_EXTENSIONS = 10
MAX_AUTO_BID_ITERATIONS = 1000


def ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_highest_bid(db: Session, auction_id: int) -> Bid | None:
    return (
        db.query(Bid)
        .filter(Bid.auction_id == auction_id)
        .order_by(Bid.amount.desc(), Bid.created_at.asc())
        .first()
    )


def get_bid_history(db: Session, auction_id: int) -> list[Bid]:
    auction_exists = db.query(Auction.id).filter(Auction.id == auction_id).first()
    if not auction_exists:
        raise HTTPException(status_code=404, detail="Auction not found")

    return (
        db.query(Bid)
        .filter(Bid.auction_id == auction_id)
        .order_by(Bid.created_at.desc(), Bid.id.desc())
        .all()
    )


def ensure_auction_accepts_bids(auction: Auction, now: datetime) -> None:
    if auction.status == AuctionStatus.upcoming and ensure_aware_utc(auction.start_time) <= now:
        auction.status = AuctionStatus.active

    if auction.status != AuctionStatus.active:
        raise HTTPException(status_code=400, detail="Auction not active")

    if ensure_aware_utc(auction.end_time) <= now:
        auction.status = AuctionStatus.ended
        raise HTTPException(status_code=400, detail="Auction ended")


def maybe_extend_auction(auction: Auction, now: datetime) -> None:
    if auction.status != AuctionStatus.active:
        return

    extension_count = auction.extension_count or 0
    if extension_count >= MAX_AUCTION_EXTENSIONS:
        return

    end_time = ensure_aware_utc(auction.end_time)
    threshold_time = end_time - timedelta(minutes=ANTI_SNIPE_THRESHOLD_MINUTES)
    if now >= threshold_time:
        auction.end_time = end_time + timedelta(minutes=ANTI_SNIPE_EXTENSION_MINUTES)
        auction.extension_count = extension_count + 1


def record_bid(
        db: Session,
        auction: Auction,
        bidder_id: int,
        amount: float,
        now: datetime,
        is_auto: bool,
) -> Bid:
    bid = Bid(
        amount=amount,
        bidder_id=bidder_id,
        auction_id=auction.id,
        created_at=now,
        is_auto=is_auto,
    )
    auction.current_price = amount
    maybe_extend_auction(auction, now)
    db.add(bid)
    db.flush()
    return bid


def sync_auto_bid_after_bid(
        db: Session,
        auction_id: int,
        bidder_id: int,
        amount: float,
) -> None:
    auto_bid = (
        db.query(AutoBid)
        .filter(
            AutoBid.auction_id == auction_id,
            AutoBid.user_id == bidder_id,
        )
        .first()
    )
    if not auto_bid:
        return

    auto_bid.current_bid = max(auto_bid.current_bid or 0, amount)
    if auto_bid.max_bid <= auto_bid.current_bid:
        auto_bid.is_active = False


def process_auto_bids(db: Session, auction: Auction, now: datetime) -> Bid | None:
    final_bid = get_highest_bid(db, auction.id)

    for iteration in range(1, MAX_AUTO_BID_ITERATIONS + 1):
        highest_bidder_id = final_bid.bidder_id if final_bid else None
        next_amount = auction.current_price + BID_INCREMENT
        auto_competitor_count = (
            db.query(AutoBid.id)
            .filter(
                AutoBid.auction_id == auction.id,
                AutoBid.is_active.is_(True),
            )
            .count()
        )
        query = (
            db.query(AutoBid)
            .filter(
                AutoBid.auction_id == auction.id,
                AutoBid.is_active.is_(True),
                AutoBid.max_bid >= next_amount,
            )
        )
        if highest_bidder_id is not None:
            query = query.filter(AutoBid.user_id != highest_bidder_id)

        auto_bid = query.order_by(AutoBid.max_bid.desc(), AutoBid.id.asc()).with_for_update().first()

        if not auto_bid:
            return final_bid

        previous_price = auction.current_price
        original_end_time = auction.end_time
        final_bid = record_bid(
            db,
            auction,
            auto_bid.user_id,
            min(auto_bid.max_bid, next_amount),
            now,
            is_auto=True,
        )
        evaluate_bid_risk(
            db,
            auto_bid.user,
            auction.id,
            final_bid.amount,
            previous_price,
            original_end_time,
            now,
            is_auto=True,
            auto_loop_iteration=iteration,
            auto_competitor_count=auto_competitor_count,
        )
        auto_bid.current_bid = final_bid.amount
        if auto_bid.current_bid >= auto_bid.max_bid:
            auto_bid.is_active = False

    raise HTTPException(status_code=400, detail="Auto-bid processing limit reached")


def place_bid(db: Session, auction_id: int, amount: float, current_user) -> Bid:
    if getattr(current_user, "is_blocked", False):
        raise HTTPException(status_code=403, detail="Your account has been blocked")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Bid amount must be greater than zero")

    auction = db.query(Auction).filter(Auction.id == auction_id).with_for_update().first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    now = utc_now()
    ensure_auction_accepts_bids(auction, now)

    if amount <= auction.current_price:
        raise HTTPException(status_code=400, detail="Bid must be higher than current price")

    previous_price = auction.current_price
    original_end_time = auction.end_time
    bid = record_bid(db, auction, current_user.id, amount, now, is_auto=False)
    evaluate_bid_risk(
        db,
        current_user,
        auction.id,
        amount,
        previous_price,
        original_end_time,
        now,
        is_auto=False,
    )
    sync_auto_bid_after_bid(db, auction.id, current_user.id, amount)
    final_bid = process_auto_bids(db, auction, now) or bid

    db.commit()
    db.refresh(final_bid)
    return final_bid


def create_or_update_auto_bid(db: Session, data, current_user) -> AutoBid:
    if getattr(current_user, "is_blocked", False):
        raise HTTPException(status_code=403, detail="Your account has been blocked")

    if data.max_bid <= 0:
        raise HTTPException(status_code=400, detail="Maximum bid must be greater than zero")

    auction = db.query(Auction).filter(Auction.id == data.auction_id).with_for_update().first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    now = utc_now()
    ensure_auction_accepts_bids(auction, now)

    highest_bid = get_highest_bid(db, auction.id)
    user_is_highest = highest_bid is not None and highest_bid.bidder_id == current_user.id
    if data.max_bid <= auction.current_price and not user_is_highest:
        raise HTTPException(status_code=400, detail="Maximum bid must exceed current price")

    auto_bid = (
        db.query(AutoBid)
        .filter(
            AutoBid.user_id == current_user.id,
            AutoBid.auction_id == auction.id,
        )
        .with_for_update()
        .first()
    )

    current_bid = 0
    if auto_bid:
        current_bid = auto_bid.current_bid or 0
    if user_is_highest:
        current_bid = max(current_bid, highest_bid.amount)

    if auto_bid:
        auto_bid.max_bid = data.max_bid
        auto_bid.current_bid = current_bid
        auto_bid.is_active = data.max_bid > current_bid
    else:
        auto_bid = AutoBid(
            user_id=current_user.id,
            auction_id=auction.id,
            max_bid=data.max_bid,
            current_bid=current_bid,
            is_active=data.max_bid > current_bid,
        )
        db.add(auto_bid)
        db.flush()

    if auto_bid.is_active:
        process_auto_bids(db, auction, now)

    db.commit()
    db.refresh(auto_bid)
    return auto_bid


def get_user_auto_bid(db: Session, auction_id: int, current_user) -> AutoBid:
    auction_exists = db.query(Auction.id).filter(Auction.id == auction_id).first()
    if not auction_exists:
        raise HTTPException(status_code=404, detail="Auction not found")

    auto_bid = (
        db.query(AutoBid)
        .filter(
            AutoBid.auction_id == auction_id,
            AutoBid.user_id == current_user.id,
        )
        .first()
    )
    if not auto_bid:
        raise HTTPException(status_code=404, detail="Auto-bid not found")
    return auto_bid


def user_auto_bid_enabled(db: Session, auction_id: int, current_user) -> bool:
    return (
        db.query(AutoBid.id)
        .filter(
            AutoBid.auction_id == auction_id,
            AutoBid.user_id == current_user.id,
            AutoBid.is_active.is_(True),
        )
        .first()
        is not None
    )
