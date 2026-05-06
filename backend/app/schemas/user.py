from pydantic import BaseModel, ConfigDict, EmailStr

from backend.app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: UserRole
    cumulative_risk_score: float
    is_suspected: bool


class UserRoleUpdate(BaseModel):
    role: UserRole
