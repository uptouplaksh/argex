from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.user import User, UserRole
from backend.app.models.seller_request import SellerRequest, SellerRequestStatus
from backend.app.services import logging_service, notification_service


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

    old_role = user.role
    user.role = role

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="UPDATE_USER_ROLE",
        entity_type="USER",
        entity_id=user.id,
        details={"old_role": old_role.value, "new_role": role.value},
    )

    notification_service.create_notification(
        db=db,
        user_id=user.id,
        type="ROLE_UPDATED",
        message=f"Your role has been updated from '{old_role.value}' to '{role.value}'.",
    )

    db.commit()
    db.refresh(user)
    return user


def list_seller_requests(db: Session) -> list[SellerRequest]:
    return db.query(SellerRequest).order_by(SellerRequest.created_at.asc()).all()


def approve_seller_request(db: Session, request_id: int, current_user: User) -> SellerRequest:
    request = db.query(SellerRequest).filter(SellerRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Seller request not found")

    if request.status != SellerRequestStatus.pending:
        raise HTTPException(status_code=400, detail=f"Seller request is already {request.status.value}")

    request.status = SellerRequestStatus.approved
    request.user.role = UserRole.seller

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="APPROVE_SELLER_REQUEST",
        entity_type="SELLER_REQUEST",
        entity_id=request.id,
        details={"user_id": request.user_id},
    )

    notification_service.create_notification(
        db=db,
        user_id=request.user_id,
        type="SELLER_REQUEST_APPROVED",
        message="Your request to become a seller has been approved.",
    )

    db.commit()
    db.refresh(request)
    return request


def reject_seller_request(db: Session, request_id: int, current_user: User) -> SellerRequest:
    request = db.query(SellerRequest).filter(SellerRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Seller request not found")

    if request.status != SellerRequestStatus.pending:
        raise HTTPException(status_code=400, detail=f"Seller request is already {request.status.value}")

    request.status = SellerRequestStatus.rejected

    logging_service.log_action(
        db=db,
        user_id=current_user.id,
        action_type="REJECT_SELLER_REQUEST",
        entity_type="SELLER_REQUEST",
        entity_id=request.id,
        details={"user_id": request.user_id},
    )

    notification_service.create_notification(
        db=db,
        user_id=request.user_id,
        type="SELLER_REQUEST_REJECTED",
        message="Your request to become a seller has been rejected.",
    )

    db.commit()
    db.refresh(request)
    return request
