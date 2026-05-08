from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.config import LOGIN_OTP_ENABLED, OTP_EXPIRE_MINUTES, OTP_RESEND_COOLDOWN_SECONDS, STARTER_ACCOUNT_BALANCE, OTP_MAX_ATTEMPTS
from backend.app.core.security import hash_password, verify_password
from backend.app.models.user import User, UserRole
from backend.app.schemas.user import UserCreate
from backend.app.services.currency_service import normalize_currency
from backend.app.services.otp_service import create_login_otp, delivery_hint, ensure_otp_delivery_configured, issue_token_for_user, utc_now

PIN_MAX_ATTEMPTS = 5
PIN_LOCK_MINUTES = 15


def validate_pin(pin: str) -> None:
    if not pin or not pin.isdigit() or len(pin) not in (4, 6):
        raise HTTPException(status_code=400, detail="Security PIN must be 4 or 6 digits")


def get_session_user(db: Session, current_user: User) -> User:
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def register_user(db: Session, user_data: UserCreate):
    if LOGIN_OTP_ENABLED:
        ensure_otp_delivery_configured()

    existing_user = (
        db.query(User)
        .filter(
            (User.username == user_data.username)
            | (User.email == user_data.email)
        )
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=user_data.username,
        email=user_data.email,
        phone_number=user_data.phone_number,
        password_hash=hash_password(user_data.password),
        role=UserRole.bidder,
        account_balance=STARTER_ACCOUNT_BALANCE,
        preferred_currency=normalize_currency(user_data.preferred_currency),
        is_verified=not LOGIN_OTP_ENABLED,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already exists")

    db.refresh(user)
    if not LOGIN_OTP_ENABLED:
        return {
            "access_token": issue_token_for_user(db, user),
            "otp_required": False,
        }

    otp = create_login_otp(db, user, purpose="registration")
    db.commit()
    db.refresh(otp)
    return {
        "otp_required": True,
        "verification_id": otp.id,
        "expires_in_seconds": OTP_EXPIRE_MINUTES * 60,
        "resend_available_in_seconds": OTP_RESEND_COOLDOWN_SECONDS,
        "delivery_hint": delivery_hint(user.email),
    }


def authenticate_user(db: Session, username: str, password: str):
    identifier = username.strip()
    user = db.query(User).filter((User.username == identifier) | (User.email == identifier)).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def login_user(db: Session, user: User):
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account email verification required")

    if not user.security_pin_hash:
        return {
            "access_token": issue_token_for_user(db, user),
            "pin_setup_required": True,
            "pin_required": False,
            "otp_required": False,
        }

    return {
        "pin_required": True,
        "otp_required": False,
        "delivery_hint": delivery_hint(user.email),
    }


def verify_login_pin(db: Session, user: User, pin: str):
    validate_pin(pin)

    now = utc_now()
    locked_until = user.pin_locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=now.tzinfo)

    if locked_until and locked_until > now:
        wait_seconds = int((locked_until - now).total_seconds())
        raise HTTPException(status_code=429, detail=f"Security PIN locked. Try again in {wait_seconds} seconds")

    if not user.security_pin_hash:
        raise HTTPException(status_code=400, detail="Security PIN has not been created")

    if not verify_password(pin, user.security_pin_hash):
        user.pin_failed_attempts = (user.pin_failed_attempts or 0) + 1
        if user.pin_failed_attempts >= PIN_MAX_ATTEMPTS:
            user.pin_locked_until = now + timedelta(minutes=PIN_LOCK_MINUTES)
            user.pin_failed_attempts = 0
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid security PIN")

    user.pin_failed_attempts = 0
    user.pin_locked_until = None
    db.commit()
    return {
        "access_token": issue_token_for_user(db, user),
        "pin_required": False,
        "otp_required": False,
    }


def create_security_pin(db: Session, current_user: User, pin: str) -> User:
    validate_pin(pin)
    user = get_session_user(db, current_user)
    if user.security_pin_hash:
        raise HTTPException(status_code=400, detail="Security PIN already exists")

    user.security_pin_hash = hash_password(pin)
    user.pin_failed_attempts = 0
    user.pin_locked_until = None
    db.commit()
    db.refresh(user)
    return user


def request_pin_change_otp(db: Session, current_user: User):
    ensure_otp_delivery_configured()
    user = get_session_user(db, current_user)
    otp = create_login_otp(db, user, purpose="pin_change")
    db.commit()
    db.refresh(otp)
    return otp


def change_security_pin(db: Session, current_user: User, new_pin: str, verification_id: int, otp_code: str, current_pin: str | None = None) -> User:
    from backend.app.models.user import LoginOtp

    user = get_session_user(db, current_user)
    validate_pin(new_pin)
    if user.security_pin_hash and current_pin:
        validate_pin(current_pin)
        if not verify_password(current_pin, user.security_pin_hash):
            raise HTTPException(status_code=401, detail="Invalid current PIN")

    otp = db.query(LoginOtp).filter(LoginOtp.id == verification_id, LoginOtp.user_id == user.id).first()
    if not otp or otp.consumed_at is not None or otp.purpose != "pin_change":
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if otp.expires_at <= utc_now():
        raise HTTPException(status_code=400, detail="Verification code expired")
    if otp.attempt_count >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many invalid verification attempts")
    if not verify_password(otp_code, otp.code_hash):
        otp.attempt_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    otp.consumed_at = utc_now()
    user.security_pin_hash = hash_password(new_pin)
    user.pin_failed_attempts = 0
    user.pin_locked_until = None
    db.commit()
    db.refresh(user)
    return user


def update_currency_preference(db: Session, current_user: User, preferred_currency: str) -> User:
    user = get_session_user(db, current_user)

    user.preferred_currency = normalize_currency(preferred_currency)
    db.commit()
    db.refresh(user)
    return user
