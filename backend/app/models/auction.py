import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class AuctionStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    ended = "ended"
    cancelled = "cancelled"


class Auction(Base):
    __tablename__ = "auctions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    starting_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime(timezone=True), nullable=False)
    extension_count = Column(Integer, nullable=False, default=0)
    status = Column(Enum(AuctionStatus), default=AuctionStatus.upcoming)
    seller = relationship("User")
    category = relationship("Category", back_populates="auctions")
    bids = relationship("Bid", back_populates="auction", cascade="all, delete-orphan")
    watchers = relationship("Watchlist", back_populates="auction", cascade="all, delete-orphan")
