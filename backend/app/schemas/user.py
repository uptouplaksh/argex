from pydantic import BaseModel, ConfigDict, EmailStr, Field

from backend.app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone_number: str | None = None
    preferred_currency: str = "USD"


class UserLogin(BaseModel):
    username: str
    password: str


class UserPinLogin(BaseModel):
    username: str
    password: str
    pin: str = Field(pattern=r"^\d{4}$|^\d{6}$")


class LoginResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    otp_required: bool = False
    pin_required: bool = False
    pin_setup_required: bool = False
    verification_id: int | None = None
    expires_in_seconds: int | None = None
    delivery_hint: str | None = None
    resend_available_in_seconds: int | None = None


class OtpVerifyRequest(BaseModel):
    verification_id: int
    code: str = Field(min_length=6, max_length=6)


class OtpResendRequest(BaseModel):
    verification_id: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_blocked: bool
    is_verified: bool
    has_security_pin: bool = False
    phone_number: str | None = None
    account_balance: float
    preferred_currency: str


class CurrencyPreferenceUpdate(BaseModel):
    preferred_currency: str


class PinCreateRequest(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$|^\d{6}$")


class PinChangeOtpRequest(BaseModel):
    pass


class PinChangeRequest(BaseModel):
    new_pin: str = Field(pattern=r"^\d{4}$|^\d{6}$")
    verification_id: int
    otp_code: str = Field(min_length=6, max_length=6)
    current_pin: str | None = Field(default=None, pattern=r"^\d{4}$|^\d{6}$")


class UserRoleUpdate(BaseModel):
    role: UserRole
