import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Enum
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class UserRole(str, enum.Enum):
    bidder = 'bidder'
    seller = 'seller'
    admin = 'admin'
    defender = 'defender'


class PreferredCurrency(str, enum.Enum):
    USD = "USD"
    INR = "INR"
    EUR = "EUR"
    GBP = "GBP"


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    security_pin_hash = Column(String, nullable=True)
    pin_failed_attempts = Column(Integer, nullable=False, default=0)
    pin_locked_until = Column(DateTime(timezone=True), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.bidder)
    cumulative_risk_score = Column(Float, nullable=False, default=0.0)
    is_suspected = Column(Boolean, nullable=False, default=False)
    is_blocked = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    account_balance = Column(Float, nullable=False, default=10000.0)
    preferred_currency = Column(String(3), nullable=False, default=PreferredCurrency.USD.value)

    notifications = relationship("Notification", back_populates="user")

    @property
    def has_security_pin(self):
        return bool(self.security_pin_hash)


class LoginOtp(Base):
    __tablename__ = "login_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    purpose = Column(String, nullable=False, default="login")
    attempt_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    resend_available_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User")
