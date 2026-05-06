from collections.abc import Iterable

from fastapi import Depends, HTTPException

from backend.app.core.security import get_current_user
from backend.app.models.user import User, UserRole


def role_value(role: str | UserRole) -> str:
    return role.value if isinstance(role, UserRole) else role


def require_role(allowed_roles: Iterable[str | UserRole]):
    allowed = {role_value(role) for role in allowed_roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if role_value(current_user.role) not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return dependency
