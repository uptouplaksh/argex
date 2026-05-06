from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.user import User

from backend.app.api.routes.ws import manager
from backend.app.core.security_monitor import log_request, is_suspicious
from backend.app.schemas.bid import BidRequest, BidResponse
from backend.app.services.bid_service import place_bid as place_bid_service

router = APIRouter(prefix="/bids", tags=["Bids"])


@router.post("/{auction_id}", response_model=BidResponse)
async def place_bid(
        auction_id: int,
        bid: BidRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["bidder"])),
):

    amount = bid.amount
    # ------------------------
    # 🛡️ SECURITY TRACKING
    # ------------------------
    log_request(current_user.id)

    if is_suspicious(current_user.id):
        print(f"[ALERT] Suspicious bidding detected from user {current_user.id}")

    bid_record = place_bid_service(db, auction_id, amount, current_user)

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

    return BidResponse(
        auction_id=auction_id,
        new_price=amount,
        bidder_id=current_user.id,
        created_at=bid_record.created_at,
    )
