from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.models.seller_request import SellerRequest, SellerRequestStatus
from backend.app.models.user import User, UserRole


def user_role_value(user: User) -> str:
    return user.role.value if isinstance(user.role, UserRole) else user.role


def request_seller_role(db: Session, current_user: User) -> SellerRequest:
    role = user_role_value(current_user)
    if role == UserRole.seller.value:
        raise HTTPException(status_code=400, detail="User is already a seller")
    if role in (UserRole.admin.value, UserRole.defender.value):
        raise HTTPException(status_code=400, detail="This role cannot request seller access")

    seller_request = (
        db.query(SellerRequest)
        .filter(SellerRequest.user_id == current_user.id)
        .order_by(SellerRequest.created_at.desc())
        .first()
    )

    if seller_request and seller_request.status == SellerRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Seller request already pending")
    if seller_request and seller_request.status == SellerRequestStatus.approved:
        raise HTTPException(status_code=400, detail="Seller request already approved")
    if seller_request and seller_request.status == SellerRequestStatus.rejected:
        seller_request.status = SellerRequestStatus.pending
        db.commit()
        db.refresh(seller_request)
        return seller_request

    seller_request = SellerRequest(
        user_id=current_user.id,
        status=SellerRequestStatus.pending,
    )
    db.add(seller_request)
    db.commit()
    db.refresh(seller_request)
    return seller_request


def list_seller_requests(db: Session) -> list[SellerRequest]:
    return (
        db.query(SellerRequest)
        .order_by(SellerRequest.created_at.desc())
        .all()
    )


def get_seller_request_or_404(db: Session, request_id: int) -> SellerRequest:
    seller_request = db.query(SellerRequest).filter(SellerRequest.id == request_id).first()
    if not seller_request:
        raise HTTPException(status_code=404, detail="Seller request not found")
    return seller_request


def approve_seller_request(db: Session, request_id: int) -> SellerRequest:
    seller_request = get_seller_request_or_404(db, request_id)
    if seller_request.status != SellerRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")

    user = db.query(User).filter(User.id == seller_request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Request user not found")

    user.role = UserRole.seller
    seller_request.status = SellerRequestStatus.approved
    db.commit()
    db.refresh(seller_request)
    return seller_request


def reject_seller_request(db: Session, request_id: int) -> SellerRequest:
    seller_request = get_seller_request_or_404(db, request_id)
    if seller_request.status != SellerRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

    seller_request.status = SellerRequestStatus.rejected
    db.commit()
    db.refresh(seller_request)
    return seller_request
