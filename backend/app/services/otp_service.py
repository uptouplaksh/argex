import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.core.config import (
    OTP_EXPIRE_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
    SMTP_DEV_LOG_OTP,
)
from backend.app.core.security import create_access_token, hash_password, verify_password
from backend.app.models.user import LoginOtp, User, UserRole
from backend.app.services import logging_service
from backend.app.services.email_service import ensure_email_delivery_configured, send_otp_email


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def delivery_hint(email: str) -> str:
    name, _, domain = email.partition("@")
    masked_name = f"{name[:2]}***" if len(name) > 2 else "***"
    return f"{masked_name}@{domain}" if domain else "registered email"


def ensure_otp_delivery_configured() -> None:
    ensure_email_delivery_configured()


def _send_otp_email(user: User, code: str, purpose: str) -> None:
    try:
        send_otp_email(user.email, code, OTP_EXPIRE_MINUTES, purpose)
    except HTTPException:
        if not SMTP_DEV_LOG_OTP:
            raise
        print(f"[DEV OTP] {purpose} code for {user.email}: {code}")


def create_login_otp(db: Session, user: User, purpose: str = "login") -> LoginOtp:
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = utc_now()
    _send_otp_email(user, code, purpose)
    otp = LoginOtp(
        user_id=user.id,
        code_hash=hash_password(code),
        purpose=purpose,
        attempt_count=0,
        expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
        resend_available_at=now + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
    )
    db.add(otp)
    db.flush()

    logging_service.log_action(
        db=db,
        user_id=user.id,
        action_type="OTP_SENT",
        entity_type="USER",
        entity_id=user.id,
        details={"verification_id": otp.id, "delivery": "email", "purpose": purpose},
    )
    return otp


def issue_token_for_user(db: Session, user: User) -> str:
    role = user.role.value if isinstance(user.role, UserRole) else user.role
    token = create_access_token({"sub": str(user.id), "role": role, "username": user.username})
    logging_service.log_action(
        db=db,
        user_id=user.id,
        action_type="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
    )
    return token


def verify_login_otp(db: Session, verification_id: int, code: str) -> str:
    otp = db.query(LoginOtp).filter(LoginOtp.id == verification_id).first()
    if not otp or otp.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if otp.expires_at <= utc_now():
        raise HTTPException(status_code=400, detail="Verification code expired")

    if otp.attempt_count >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many invalid verification attempts")

    if not verify_password(code, otp.code_hash):
        otp.attempt_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    otp.consumed_at = utc_now()
    otp.user.is_verified = True
    token = issue_token_for_user(db, otp.user)
    db.commit()
    return token


def resend_login_otp(db: Session, verification_id: int) -> LoginOtp:
    otp = db.query(LoginOtp).filter(LoginOtp.id == verification_id).first()
    if not otp or otp.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Verification session unavailable")

    now = utc_now()
    if otp.resend_available_at and otp.resend_available_at > now:
        wait_seconds = int((otp.resend_available_at - now).total_seconds())
        raise HTTPException(status_code=429, detail=f"Please wait {wait_seconds} seconds before requesting another code")

    otp.consumed_at = utc_now()
    next_otp = create_login_otp(db, otp.user, otp.purpose)
    db.commit()
    db.refresh(next_otp)
    return next_otp
