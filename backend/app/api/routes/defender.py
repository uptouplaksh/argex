from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.security_incident import IncidentSeverity, IncidentStatus
from backend.app.models.user import User
from backend.app.schemas.defender import (
    DefenderActionLogResponse,
    IncidentResponse,
    UserBlockResponse,
    UserRiskProfile,
)
from backend.app.services import defender_service

router = APIRouter(prefix="/defender", tags=["defender"])

_DEFENDER_ROLES = ["defender"]


@router.get("/incidents", response_model=list[IncidentResponse])
def list_incidents(
        severity: IncidentSeverity | None = None,
        status: IncidentStatus | None = None,
        user_id: int | None = None,
        auction_id: int | None = None,
        db: Session = Depends(get_db),
        _: User = Depends(require_role(_DEFENDER_ROLES)),
):
    return defender_service.list_incidents(
        db,
        severity=severity,
        status=status,
        user_id=user_id,
        auction_id=auction_id,
    )


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(
        incident_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(require_role(_DEFENDER_ROLES)),
):
    return defender_service.get_incident(db, incident_id)


@router.patch("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
        incident_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(_DEFENDER_ROLES)),
):
    return defender_service.resolve_incident(db, incident_id, current_user.id)


@router.patch("/incidents/{incident_id}/reopen", response_model=IncidentResponse)
def reopen_incident(
        incident_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(_DEFENDER_ROLES)),
):
    return defender_service.reopen_incident(db, incident_id, current_user.id)


@router.post("/users/{user_id}/block", response_model=UserBlockResponse)
def block_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(_DEFENDER_ROLES)),
):
    user = defender_service.block_user(db, user_id, current_user.id)
    return UserBlockResponse(user_id=user.id, is_blocked=user.is_blocked, message="User blocked")


@router.post("/users/{user_id}/unblock", response_model=UserBlockResponse)
def unblock_user(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(_DEFENDER_ROLES)),
):
    user = defender_service.unblock_user(db, user_id, current_user.id)
    return UserBlockResponse(user_id=user.id, is_blocked=user.is_blocked, message="User unblocked")


@router.get("/users/{user_id}/risk-profile", response_model=UserRiskProfile)
def get_user_risk_profile(
        user_id: int,
        db: Session = Depends(get_db),
        _: User = Depends(require_role(_DEFENDER_ROLES)),
):
    return defender_service.get_user_risk_profile(db, user_id)
