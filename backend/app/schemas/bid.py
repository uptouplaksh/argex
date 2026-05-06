from datetime import datetime

from pydantic import BaseModel


class BidRequest(BaseModel):
    amount: float


class BidResponse(BaseModel):
    auction_id: int
    new_price: float
    bidder_id: int
    created_at: datetime
    message: str = "Bid placed successfully"
