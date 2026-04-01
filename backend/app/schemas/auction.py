from datetime import datetime

from pydantic import BaseModel


class AuctionCreate(BaseModel):
    title: str
    description: str | None = None
    starting_price: float
    end_time: datetime


class AuctionResponse(BaseModel):
    id: int
    title: str
    description: str | None
    starting_price: float
    current_price: float
    seller_id: int
    start_time: datetime
    end_time: datetime
    status: str

    class config:
        from_attributes = True
