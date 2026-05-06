from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.user import User, UserRole


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id.asc()).all()


def update_user_role(
        db: Session,
        user_id: int,
        role: UserRole,
        current_user: User,
) -> User:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot update their own role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    db.commit()
    db.refresh(user)
    return user
