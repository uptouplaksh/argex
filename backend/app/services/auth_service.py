from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.user import User, UserRole
from backend.app.schemas.user import UserCreate
from backend.app.services import logging_service


def register_user(db: Session, user_data: UserCreate):
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
        password_hash=hash_password(user_data.password),
        role=UserRole.bidder,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already exists")

    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def login_user(db: Session, user: User):
    role = user.role.value if isinstance(user.role, UserRole) else user.role
    token = create_access_token({"sub": str(user.id), "role": role})

    logging_service.log_action(
        db=db,
        user_id=user.id,
        action_type="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
    )

    return token
