import enum

from sqlalchemy import Boolean, Column, Float, Integer, String, Enum

from backend.app.db.base import Base


class UserRole(str, enum.Enum):
    bidder = 'bidder'
    seller = 'seller'
    admin = 'admin'
    defender = 'defender'


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.bidder)
    cumulative_risk_score = Column(Float, nullable=False, default=0.0)
    is_suspected = Column(Boolean, nullable=False, default=False)
