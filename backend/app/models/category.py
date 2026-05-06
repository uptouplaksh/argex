from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    auctions = relationship("Auction", back_populates="category")
