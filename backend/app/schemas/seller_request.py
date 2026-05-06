from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.app.models.seller_request import SellerRequestStatus
from backend.app.schemas.user import UserResponse


class SellerRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: SellerRequestStatus
    created_at: datetime
    user: UserResponse | None = None
