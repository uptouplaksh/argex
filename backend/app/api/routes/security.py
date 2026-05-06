from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.security_incident import IncidentSeverity, IncidentStatus
from backend.app.schemas.security import SecurityIncidentResponse
from backend.app.services.security_service import list_incidents, resolve_incident

router = APIRouter(
    prefix="/security",
    tags=["Security"],
    dependencies=[Depends(require_role(["admin", "defender"]))],
)


@router.get("/incidents", response_model=list[SecurityIncidentResponse])
def get_security_incidents(
        status: IncidentStatus | None = None,
        severity: IncidentSeverity | None = None,
        db: Session = Depends(get_db),
):
    return list_incidents(db, status, severity)


@router.patch("/incidents/{incident_id}/resolve", response_model=SecurityIncidentResponse)
def patch_resolve_incident(incident_id: int, db: Session = Depends(get_db)):
    return resolve_incident(db, incident_id)
