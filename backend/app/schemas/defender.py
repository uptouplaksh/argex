from datetime import datetime

from pydantic import BaseModel

from backend.app.models.defender_log import DefenderActionType
from backend.app.models.security_incident import IncidentSeverity, IncidentStatus


class IncidentResponse(BaseModel):
    id: int
    user_id: int
    auction_id: int | None
    incident_type: str
    severity: IncidentSeverity
    risk_score: float
    description: str
    created_at: datetime
    status: IncidentStatus

    model_config = {"from_attributes": True}


class UserBlockResponse(BaseModel):
    user_id: int
    is_blocked: bool
    message: str


class SeverityCount(BaseModel):
    low: int
    medium: int
    high: int


class UserRiskProfile(BaseModel):
    user_id: int
    username: str
    cumulative_risk_score: float
    is_suspected: bool
    is_blocked: bool
    total_incidents: int
    incidents_by_severity: SeverityCount
    average_risk_score: float
    latest_incidents: list[IncidentResponse]


class DefenderActionLogResponse(BaseModel):
    id: int
    defender_id: int
    action_type: DefenderActionType
    target_user_id: int | None
    incident_id: int | None
    timestamp: datetime

    model_config = {"from_attributes": True}
