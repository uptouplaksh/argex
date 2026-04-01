from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models.auction import Auction, AuctionStatus

from backend.app.api.routes.ws import manager
from backend.app.core.security_monitor import log_request, is_suspicious
from backend.app.schemas.bid import BidRequest

router = APIRouter(prefix="/bids", tags=["Bids"])


@router.post("/{auction_id}")
async def place_bid(
        auction_id: int,
        bid: BidRequest,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):

    amount = bid.amount
    # ------------------------
    # 🛡️ SECURITY TRACKING
    # ------------------------
    log_request(current_user.id)

    if is_suspicious(current_user.id):
        print(f"[ALERT] Suspicious bidding detected from user {current_user.id}")

    # ------------------------
    # ROLE CHECK
    # ------------------------
    if current_user.role != "bidder":
        raise HTTPException(status_code=403, detail="Only bidders can bid")

    # ------------------------
    # DB LOCK (ANTI-RACE CONDITION)
    # ------------------------
    auction = db.query(Auction).filter(Auction.id == auction_id).with_for_update().first()

    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    if auction.status != AuctionStatus.active:
        raise HTTPException(status_code=400, detail="Auction not active")

    if datetime.now(timezone.utc) > auction.end_time:
        auction.status = AuctionStatus.ended
        db.commit()
        raise HTTPException(status_code=400, detail="Auction ended")

    if amount <= auction.current_price:
        raise HTTPException(status_code=400, detail="Bid must be higher than current price")

    # ------------------------
    # UPDATE PRICE
    # ------------------------
    auction.current_price = amount
    db.commit()

    # ------------------------
    # ⚡ REAL-TIME BROADCAST
    # ------------------------
    await manager.broadcast(
        auction_id,
        {
            "type": "new_bid",
            "auction_id": auction_id,
            "new_price": amount,
            "user_id": current_user.id
        }
    )

    return {"message": "Bid placed successfully", "new_price": amount}