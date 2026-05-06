from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class AutoBid(Base):
    __tablename__ = "auto_bids"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False, index=True)
    max_bid = Column(Float, nullable=False)
    current_bid = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User")
    auction = relationship("Auction")

    __table_args__ = (
        UniqueConstraint("user_id", "auction_id", name="uq_auto_bids_user_auction"),
        Index("ix_auto_bids_auction_active", "auction_id", "is_active"),
    )
