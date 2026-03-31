from pydantic import BaseModel, EmailStr

from backend.app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
