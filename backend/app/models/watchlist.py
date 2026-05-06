from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=False, index=True)

    user = relationship("User")
    auction = relationship("Auction", back_populates="watchers")

    __table_args__ = (
        UniqueConstraint("user_id", "auction_id", name="uq_watchlists_user_auction"),
    )
