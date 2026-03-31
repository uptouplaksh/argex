from sqlalchemy.orm import Session

from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate


def register_user(db: Session, user_data: UserCreate):
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def login_user(user: User):
    token = create_access_token({"sub": user.username, "role": user.role})
    return token
