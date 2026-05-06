from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.user import User
from backend.app.schemas.auction import (
    AuctionCreate,
    AuctionResponse,
    AuctionUpdate,
    HighestBidResponse,
)
from backend.app.services.auction_service import (
    cancel_auction,
    create_auction as create_auction_service,
    get_auction_or_404,
    get_highest_bid,
    list_auctions,
    update_auction,
)

router = APIRouter(prefix="/auctions", tags=["Auctions"])


@router.post("/", response_model=AuctionResponse)
def create_auction(
        data: AuctionCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["seller"])),
):
    return create_auction_service(db, data, current_user)


@router.get("/", response_model=list[AuctionResponse])
def get_auctions(category_id: int | None = None, db: Session = Depends(get_db)):
    return list_auctions(db, category_id)


@router.get("/{auction_id}", response_model=AuctionResponse)
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    return get_auction_or_404(db, auction_id)


@router.put("/{auction_id}", response_model=AuctionResponse)
def edit_auction(
        auction_id: int,
        data: AuctionUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["seller"])),
):
    return update_auction(db, auction_id, data, current_user)


@router.delete("/{auction_id}", status_code=204)
def delete_auction(
        auction_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["seller"])),
):
    cancel_auction(db, auction_id, current_user)
    return None


@router.get("/{auction_id}/highest-bid", response_model=HighestBidResponse)
def highest_bid(auction_id: int, db: Session = Depends(get_db)):
    bid = get_highest_bid(db, auction_id)
    if not bid:
        return HighestBidResponse(auction_id=auction_id)
    return HighestBidResponse(
        auction_id=auction_id,
        amount=bid.amount,
        bidder_id=bid.bidder_id,
        created_at=bid.created_at,
    )
