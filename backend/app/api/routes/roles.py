from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.seller_request import SellerRequestResponse
from backend.app.services.role_service import request_seller_role

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.post("/request-seller", response_model=SellerRequestResponse, status_code=201)
def request_seller(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
):
    return request_seller_role(db, current_user)
