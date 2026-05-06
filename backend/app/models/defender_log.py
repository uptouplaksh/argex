import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class DefenderActionType(str, enum.Enum):
    block = "block"
    unblock = "unblock"
    resolve = "resolve"
    reopen = "reopen"


class DefenderActionLog(Base):
    __tablename__ = "defender_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    defender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(Enum(DefenderActionType), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    incident_id = Column(Integer, ForeignKey("security_incidents.id"), nullable=True, index=True)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    defender = relationship("User", foreign_keys=[defender_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    incident = relationship("SecurityIncident")
