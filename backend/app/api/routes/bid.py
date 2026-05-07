from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.user import User

from backend.app.schemas.bid import (
    AutoBidRequest,
    AutoBidResponse,
    BidHistoryResponse,
    BidRequest,
    BidResponse,
)
from backend.app.services.bid_service import (
    create_or_update_auto_bid,
    get_bid_history,
    get_user_auto_bid,
    place_bid as place_bid_service,
    user_auto_bid_enabled,
)

router = APIRouter(prefix="/bids", tags=["Bids"])


@router.post("/auto", response_model=AutoBidResponse)
async def upsert_auto_bid(
        data: AutoBidRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["bidder"])),
):
    return await create_or_update_auto_bid(db, data, current_user)


@router.get("/auto/{auction_id}", response_model=AutoBidResponse)
def get_auto_bid(
        auction_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["bidder"])),
):
    return get_user_auto_bid(db, auction_id, current_user)


@router.post("/{auction_id}", response_model=BidResponse)
async def place_bid(
        auction_id: int,
        bid: BidRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["bidder"])),
):
    amount = bid.amount
    bid_record = await place_bid_service(db, auction_id, amount, current_user)

    return BidResponse(
        auction_id=auction_id,
        new_price=bid_record.amount,
        bidder_id=bid_record.bidder_id,
        created_at=bid_record.created_at,
        is_auto=bid_record.is_auto,
        user_auto_bid_enabled=user_auto_bid_enabled(db, auction_id, current_user),
    )


@router.get("/{auction_id}/history", response_model=list[BidHistoryResponse])
def bid_history(auction_id: int, db: Session = Depends(get_db)):
    return get_bid_history(db, auction_id)
