from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models.auction import Auction, AuctionStatus
from backend.app.schemas.auction import AuctionCreate, AuctionResponse

router = APIRouter(prefix="/auction", tags=["auction"])


@router.post("/", response_model=AuctionResponse)
def create_auction(
        data: AuctionCreate,
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):
    if current_user.role != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can create auctions")

    auction = Auction(
        title=data.title,
        description=data.description,
        starting_price=data.starting_price,
        current_price=data.starting_price,
        seller_id=current_user.id,
        start_time=datetime.now(timezone.utc),
        end_time=data.end_time,
        status=AuctionStatus.active
    )

    db.add(auction)
    db.commit()
    db.refresh(auction)

    return auction


@router.get("/", response_model=list[AuctionResponse])
def get_auctions(db: Session = Depends(get_db)):
    return db.query(Auction).all()


@router.get("/{auction_id}", response_model=AuctionResponse)
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()

    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    return auction
