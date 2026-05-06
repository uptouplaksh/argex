from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.defender_log import DefenderActionLog, DefenderActionType
from backend.app.models.security_incident import (
    IncidentSeverity,
    IncidentStatus,
    SecurityIncident,
)
from backend.app.models.user import User
from backend.app.schemas.defender import SeverityCount, UserRiskProfile
from backend.app.services import logging_service, notification_service

RISK_PROFILE_LATEST_COUNT = 10


def list_incidents(
        db: Session,
        severity: IncidentSeverity | None = None,
        status: IncidentStatus | None = None,
        user_id: int | None = None,
        auction_id: int | None = None,
) -> list[SecurityIncident]:
    query = db.query(SecurityIncident)
    if severity is not None:
        query = query.filter(SecurityIncident.severity == severity)
    if status is not None:
        query = query.filter(SecurityIncident.status == status)
    if user_id is not None:
        query = query.filter(SecurityIncident.user_id == user_id)
    if auction_id is not None:
        query = query.filter(SecurityIncident.auction_id == auction_id)
    return query.order_by(SecurityIncident.created_at.desc()).all()


def get_incident(db: Session, incident_id: int) -> SecurityIncident:
    incident = db.query(SecurityIncident).filter(SecurityIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Security incident not found")
    return incident


def resolve_incident(db: Session, incident_id: int, defender_id: int) -> SecurityIncident:
    incident = get_incident(db, incident_id)
    if incident.status == IncidentStatus.resolved:
        raise HTTPException(status_code=400, detail="Incident is already resolved")

    incident.status = IncidentStatus.resolved
    _log_action(db, defender_id, DefenderActionType.resolve, incident_id=incident_id)
    db.commit()
    db.refresh(incident)
    return incident


def reopen_incident(db: Session, incident_id: int, defender_id: int) -> SecurityIncident:
    incident = get_incident(db, incident_id)
    if incident.status == IncidentStatus.open:
        raise HTTPException(status_code=400, detail="Incident is already open")

    incident.status = IncidentStatus.open
    _log_action(db, defender_id, DefenderActionType.reopen, incident_id=incident_id)
    db.commit()
    db.refresh(incident)
    return incident


def block_user(db: Session, target_user_id: int, defender_id: int) -> User:
    user = _get_user_or_404(db, target_user_id)
    if user.is_blocked:
        raise HTTPException(status_code=400, detail="User is already blocked")

    user.is_blocked = True
    _log_action(db, defender_id, DefenderActionType.block, target_user_id=target_user_id)
    
    notification_service.create_notification(
        db=db,
        user_id=target_user_id,
        type="USER_BLOCKED",
        message="Your account has been blocked by a defender due to suspicious activity.",
    )
    
    db.commit()
    db.refresh(user)
    return user


def unblock_user(db: Session, target_user_id: int, defender_id: int) -> User:
    user = _get_user_or_404(db, target_user_id)
    if not user.is_blocked:
        raise HTTPException(status_code=400, detail="User is not blocked")

    user.is_blocked = False
    _log_action(db, defender_id, DefenderActionType.unblock, target_user_id=target_user_id)
    
    notification_service.create_notification(
        db=db,
        user_id=target_user_id,
        type="USER_UNBLOCKED",
        message="Your account has been unblocked by a defender.",
    )
    
    db.commit()
    db.refresh(user)
    return user


def get_user_risk_profile(db: Session, target_user_id: int) -> UserRiskProfile:
    user = _get_user_or_404(db, target_user_id)

    total_incidents = (
        db.query(func.count(SecurityIncident.id))
        .filter(SecurityIncident.user_id == target_user_id)
        .scalar()
        or 0
    )

    severity_counts = (
        db.query(SecurityIncident.severity, func.count(SecurityIncident.id))
        .filter(SecurityIncident.user_id == target_user_id)
        .group_by(SecurityIncident.severity)
        .all()
    )
    counts_map = {sev.value: cnt for sev, cnt in severity_counts}

    avg_risk = (
        db.query(func.avg(SecurityIncident.risk_score))
        .filter(SecurityIncident.user_id == target_user_id)
        .scalar()
        or 0.0
    )

    latest = (
        db.query(SecurityIncident)
        .filter(SecurityIncident.user_id == target_user_id)
        .order_by(SecurityIncident.created_at.desc())
        .limit(RISK_PROFILE_LATEST_COUNT)
        .all()
    )

    return UserRiskProfile(
        user_id=user.id,
        username=user.username,
        cumulative_risk_score=user.cumulative_risk_score,
        is_suspected=user.is_suspected,
        is_blocked=user.is_blocked,
        total_incidents=total_incidents,
        incidents_by_severity=SeverityCount(
            low=counts_map.get("low", 0),
            medium=counts_map.get("medium", 0),
            high=counts_map.get("high", 0),
        ),
        average_risk_score=round(avg_risk, 2),
        latest_incidents=latest,
    )


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _log_action(
        db: Session,
        defender_id: int,
        action_type: DefenderActionType,
        target_user_id: int | None = None,
        incident_id: int | None = None,
) -> DefenderActionLog:
    entry = DefenderActionLog(
        defender_id=defender_id,
        action_type=action_type,
        target_user_id=target_user_id,
        incident_id=incident_id,
    )
    db.add(entry)
    db.flush()

    logging_service.log_action(
        db=db,
        user_id=defender_id,
        action_type=f"DEFENDER_{action_type.value}",
        entity_type="USER" if target_user_id else "SECURITY_INCIDENT",
        entity_id=target_user_id or incident_id,
        details={"defender_id": defender_id, "target_user_id": target_user_id, "incident_id": incident_id},
    )

    return entry
