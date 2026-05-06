from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.app.models.security_incident import IncidentSeverity, IncidentStatus


class SecurityIncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    auction_id: int | None
    incident_type: str
    severity: IncidentSeverity
    risk_score: float
    description: str
    created_at: datetime
    status: IncidentStatus
