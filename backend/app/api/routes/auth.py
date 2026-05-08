from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db
from backend.app.core.config import OTP_EXPIRE_MINUTES, OTP_RESEND_COOLDOWN_SECONDS
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.schemas.user import (
    CurrencyPreferenceUpdate,
    LoginResponse,
    OtpResendRequest,
    OtpVerifyRequest,
    PinChangeRequest,
    PinCreateRequest,
    UserCreate,
    UserLogin,
    UserPinLogin,
    UserResponse,
)
from backend.app.services.auth_service import (
    authenticate_user,
    change_security_pin,
    create_security_pin,
    login_user,
    register_user,
    request_pin_change_otp,
    update_currency_preference,
    verify_login_pin,
)
from backend.app.services.otp_service import delivery_hint, resend_login_otp, verify_login_otp

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=dict)
def register(user: UserCreate, db: Session = Depends(get_db)):
    result = register_user(db, user)
    return {"message": "User registered successfully", **result}


@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return login_user(db, db_user)


@router.post("/login/pin", response_model=LoginResponse)
def login_pin(user: UserPinLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return verify_login_pin(db, db_user, user.pin)


@router.post("/login/verify-otp", response_model=LoginResponse)
def verify_otp(data: OtpVerifyRequest, db: Session = Depends(get_db)):
    token = verify_login_otp(db, data.verification_id, data.code)
    return {"access_token": token, "otp_required": False}


@router.post("/login/resend-otp", response_model=LoginResponse)
def resend_otp(data: OtpResendRequest, db: Session = Depends(get_db)):
    otp = resend_login_otp(db, data.verification_id)
    return {
        "otp_required": True,
        "verification_id": otp.id,
        "expires_in_seconds": OTP_EXPIRE_MINUTES * 60,
        "resend_available_in_seconds": OTP_RESEND_COOLDOWN_SECONDS,
        "delivery_hint": delivery_hint(otp.user.email),
    }


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/currency", response_model=UserResponse)
def update_me_currency(
        data: CurrencyPreferenceUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return update_currency_preference(db, current_user, data.preferred_currency)


@router.post("/me/pin", response_model=UserResponse)
def create_me_pin(
        data: PinCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return create_security_pin(db, current_user, data.pin)


@router.post("/me/pin/change-otp", response_model=LoginResponse)
def request_me_pin_change_otp(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    otp = request_pin_change_otp(db, current_user)
    return {
        "otp_required": True,
        "verification_id": otp.id,
        "expires_in_seconds": OTP_EXPIRE_MINUTES * 60,
        "resend_available_in_seconds": OTP_RESEND_COOLDOWN_SECONDS,
        "delivery_hint": delivery_hint(otp.user.email),
    }


@router.patch("/me/pin", response_model=UserResponse)
def change_me_pin(
        data: PinChangeRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return change_security_pin(
        db,
        current_user,
        new_pin=data.new_pin,
        verification_id=data.verification_id,
        otp_code=data.otp_code,
        current_pin=data.current_pin,
    )
