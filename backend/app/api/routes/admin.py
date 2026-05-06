from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.user import User
from backend.app.schemas.seller_request import SellerRequestResponse
from backend.app.schemas.user import UserResponse, UserRoleUpdate
from backend.app.services.admin_service import list_users, update_user_role
from backend.app.services.role_service import (
    approve_seller_request,
    list_seller_requests,
    reject_seller_request,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(["admin"]))],
)


@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return list_users(db)


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def patch_user_role(
        user_id: int,
        data: UserRoleUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["admin"])),
):
    return update_user_role(db, user_id, data.role, current_user)


@router.get("/seller-requests", response_model=list[SellerRequestResponse])
def get_seller_requests(db: Session = Depends(get_db)):
    return list_seller_requests(db)


@router.post(
    "/seller-requests/{request_id}/approve",
    response_model=SellerRequestResponse,
)
def approve_request(request_id: int, db: Session = Depends(get_db)):
    return approve_seller_request(db, request_id)


@router.post(
    "/seller-requests/{request_id}/reject",
    response_model=SellerRequestResponse,
)
def reject_request(request_id: int, db: Session = Depends(get_db)):
    return reject_seller_request(db, request_id)
