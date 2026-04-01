import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class AuctionStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    ended = "ended"


class Auction(Base):
    __tablename__ = "auctions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    starting_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"))
    start_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(AuctionStatus), default=AuctionStatus.upcoming)
    seller = relationship("User")
