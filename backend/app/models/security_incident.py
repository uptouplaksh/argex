import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class IncidentSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class IncidentStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    auction_id = Column(Integer, ForeignKey("auctions.id"), nullable=True, index=True)
    incident_type = Column(String, nullable=False, index=True)
    severity = Column(Enum(IncidentSeverity), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(IncidentStatus),
        nullable=False,
        default=IncidentStatus.open,
        index=True,
    )

    user = relationship("User")
    auction = relationship("Auction")
