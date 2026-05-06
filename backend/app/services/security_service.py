from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.bid import Bid
from backend.app.models.security_incident import (
    IncidentSeverity,
    IncidentStatus,
    SecurityIncident,
)
from backend.app.models.user import User

INCIDENT_THRESHOLD = 50
HIGH_SEVERITY_THRESHOLD = 71
RECENT_BID_WINDOW_SECONDS = 10
REPEATED_BID_WINDOW_SECONDS = 60
INCIDENT_DEDUP_WINDOW_SECONDS = 60
ABNORMAL_JUMP_MIN_AMOUNT = 25
ABNORMAL_JUMP_RATIO = 0.5
LAST_SECOND_WINDOW_SECONDS = 120
AUTO_LOOP_MEDIUM_ITERATIONS = 3
AUTO_LOOP_HIGH_ITERATIONS = 5


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def classify_severity(risk_score: float) -> IncidentSeverity:
    if risk_score <= 30:
        return IncidentSeverity.low
    if risk_score <= 70:
        return IncidentSeverity.medium
    return IncidentSeverity.high


def calculate_risk_score(user: User, action_context: dict[str, Any]) -> float:
    score = 0.0

    if action_context.get("rapid_bid_count", 0) >= 5:
        score += 55
    elif action_context.get("rapid_bid_count", 0) >= 3:
        score += 20

    if action_context.get("repeated_auction_bid_count", 0) >= 3:
        score += 15

    bid_amount = action_context.get("bid_amount", 0)
    previous_price = action_context.get("previous_price", 0)
    bid_jump = max(0, bid_amount - previous_price)
    abnormal_jump_threshold = max(
        ABNORMAL_JUMP_MIN_AMOUNT,
        previous_price * ABNORMAL_JUMP_RATIO,
    )
    if previous_price > 0 and bid_jump >= abnormal_jump_threshold:
        score += 30

    seconds_to_end = action_context.get("seconds_to_end")
    if seconds_to_end is not None and 0 <= seconds_to_end <= LAST_SECOND_WINDOW_SECONDS:
        score += 20

    auto_loop_iteration = action_context.get("auto_loop_iteration", 0)
    if auto_loop_iteration >= AUTO_LOOP_HIGH_ITERATIONS:
        score += 55
    elif auto_loop_iteration >= AUTO_LOOP_MEDIUM_ITERATIONS:
        score += 20

    if action_context.get("is_auto") and action_context.get("auto_competitor_count", 0) >= 2:
        score += 10

    return min(score, 100.0)


def incident_type_for_context(action_context: dict[str, Any]) -> str:
    if action_context.get("auto_loop_iteration", 0) >= AUTO_LOOP_MEDIUM_ITERATIONS:
        return "suspicious_auto_bid_loop"
    if action_context.get("rapid_bid_count", 0) >= 5:
        return "rate_limit_bid_frequency"
    if action_context.get("rapid_bid_count", 0) >= 3:
        return "rapid_bidding_pattern"

    bid_amount = action_context.get("bid_amount", 0)
    previous_price = action_context.get("previous_price", 0)
    bid_jump = max(0, bid_amount - previous_price)
    abnormal_jump_threshold = max(
        ABNORMAL_JUMP_MIN_AMOUNT,
        previous_price * ABNORMAL_JUMP_RATIO,
    )
    if previous_price > 0 and bid_jump >= abnormal_jump_threshold:
        return "abnormal_bid_jump"

    seconds_to_end = action_context.get("seconds_to_end")
    if seconds_to_end is not None and 0 <= seconds_to_end <= LAST_SECOND_WINDOW_SECONDS:
        return "last_second_bidding"

    if action_context.get("repeated_auction_bid_count", 0) >= 3:
        return "repeated_outbidding"

    return "bid_risk"


def build_incident_description(action_context: dict[str, Any]) -> str:
    parts = [
        f"bid_amount={action_context.get('bid_amount')}",
        f"previous_price={action_context.get('previous_price')}",
        f"rapid_bid_count={action_context.get('rapid_bid_count')}",
        f"repeated_auction_bid_count={action_context.get('repeated_auction_bid_count')}",
        f"is_auto={action_context.get('is_auto')}",
    ]

    if action_context.get("seconds_to_end") is not None:
        parts.append(f"seconds_to_end={round(action_context['seconds_to_end'], 2)}")
    if action_context.get("auto_loop_iteration"):
        parts.append(f"auto_loop_iteration={action_context['auto_loop_iteration']}")
    if action_context.get("auto_competitor_count") is not None:
        parts.append(f"auto_competitor_count={action_context['auto_competitor_count']}")

    return "Suspicious bidding activity detected: " + ", ".join(parts)


def has_recent_duplicate_incident(
        db: Session,
        user_id: int,
        auction_id: int | None,
        incident_type: str,
        now: datetime,
) -> bool:
    cutoff = now - timedelta(seconds=INCIDENT_DEDUP_WINDOW_SECONDS)
    return (
        db.query(SecurityIncident.id)
        .filter(
            SecurityIncident.user_id == user_id,
            SecurityIncident.auction_id == auction_id,
            SecurityIncident.incident_type == incident_type,
            SecurityIncident.status == IncidentStatus.open,
            SecurityIncident.created_at >= cutoff,
        )
        .first()
        is not None
    )


def create_incident(
        db: Session,
        user_id: int,
        auction_id: int | None,
        incident_type: str,
        risk_score: float,
        description: str,
        created_at: datetime,
) -> SecurityIncident | None:
    if has_recent_duplicate_incident(db, user_id, auction_id, incident_type, created_at):
        return None

    severity = classify_severity(risk_score)
    incident = SecurityIncident(
        user_id=user_id,
        auction_id=auction_id,
        incident_type=incident_type,
        severity=severity,
        risk_score=risk_score,
        description=description,
        created_at=created_at,
        status=IncidentStatus.open,
    )
    db.add(incident)
    db.flush()

    if severity == IncidentSeverity.high:
        print(
            "[SECURITY ALERT] "
            f"user={user_id} auction={auction_id} type={incident_type} score={risk_score}"
        )

    return incident


def evaluate_bid_risk(
        db: Session,
        user: User,
        auction_id: int,
        bid_amount: float,
        previous_price: float,
        auction_end_time: datetime,
        bid_time: datetime,
        is_auto: bool,
        auto_loop_iteration: int = 0,
        auto_competitor_count: int = 0,
) -> float:
    rapid_cutoff = bid_time - timedelta(seconds=RECENT_BID_WINDOW_SECONDS)
    repeated_cutoff = bid_time - timedelta(seconds=REPEATED_BID_WINDOW_SECONDS)

    rapid_bid_count = (
        db.query(Bid.id)
        .filter(
            Bid.bidder_id == user.id,
            Bid.created_at >= rapid_cutoff,
        )
        .count()
    )
    repeated_auction_bid_count = (
        db.query(Bid.id)
        .filter(
            Bid.bidder_id == user.id,
            Bid.auction_id == auction_id,
            Bid.created_at >= repeated_cutoff,
        )
        .count()
    )

    end_time = ensure_aware_utc(auction_end_time)
    seconds_to_end = (end_time - bid_time).total_seconds()
    action_context = {
        "auction_id": auction_id,
        "bid_amount": bid_amount,
        "previous_price": previous_price,
        "rapid_bid_count": rapid_bid_count,
        "repeated_auction_bid_count": repeated_auction_bid_count,
        "seconds_to_end": seconds_to_end,
        "is_auto": is_auto,
        "auto_loop_iteration": auto_loop_iteration,
        "auto_competitor_count": auto_competitor_count,
    }

    risk_score = calculate_risk_score(user, action_context)

    user.cumulative_risk_score = (user.cumulative_risk_score or 0.0) + risk_score
    if not user.is_suspected and user.cumulative_risk_score >= HIGH_SEVERITY_THRESHOLD:
        user.is_suspected = True

    if risk_score >= INCIDENT_THRESHOLD:
        create_incident(
            db,
            user_id=user.id,
            auction_id=auction_id,
            incident_type=incident_type_for_context(action_context),
            risk_score=risk_score,
            description=build_incident_description(action_context),
            created_at=bid_time,
        )

    return risk_score


def list_incidents(
        db: Session,
        status: IncidentStatus | None = None,
        severity: IncidentSeverity | None = None,
) -> list[SecurityIncident]:
    query = db.query(SecurityIncident)
    if status is not None:
        query = query.filter(SecurityIncident.status == status)
    if severity is not None:
        query = query.filter(SecurityIncident.severity == severity)
    return query.order_by(SecurityIncident.created_at.desc()).all()


def resolve_incident(db: Session, incident_id: int) -> SecurityIncident:
    incident = db.query(SecurityIncident).filter(SecurityIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Security incident not found")

    incident.status = IncidentStatus.resolved
    db.commit()
    db.refresh(incident)
    return incident
