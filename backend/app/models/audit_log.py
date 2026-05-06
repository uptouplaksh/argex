from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from backend.app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    action_type = Column(String, index=True)
    entity_type = Column(String, index=True)
    entity_id = Column(Integer, index=True)
    details = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
