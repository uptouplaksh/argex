from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Bid(Base):
    __tablename__ = "bids"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    bidder_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_auto = Column(Boolean, nullable=False, default=False)

    bidder = relationship("User")
    auction = relationship("Auction", back_populates="bids")


Index("ix_bids_auction_amount", Bid.auction_id, Bid.amount.desc())
Index("ix_bids_auction_created_at", Bid.auction_id, Bid.created_at.desc())
