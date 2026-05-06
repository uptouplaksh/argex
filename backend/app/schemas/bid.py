from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BidRequest(BaseModel):
    amount: float


class AutoBidRequest(BaseModel):
    auction_id: int
    max_bid: float


class BidResponse(BaseModel):
    auction_id: int
    new_price: float
    bidder_id: int
    created_at: datetime
    is_auto: bool = False
    user_auto_bid_enabled: bool = False
    message: str = "Bid placed successfully"


class AutoBidResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    auction_id: int
    max_bid: float
    current_bid: float
    is_active: bool


class BidHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    auction_id: int
    bidder_id: int
    amount: float
    created_at: datetime
    is_auto: bool
