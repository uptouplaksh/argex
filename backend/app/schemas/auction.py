from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuctionCreate(BaseModel):
    title: str
    description: str | None = None
    starting_price: float
    auction_currency: str | None = None
    start_time: datetime | None = None
    end_time: datetime
    category_id: int


class AuctionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: int | None = None
    starting_price: float | None = None
    auction_currency: str | None = None
    end_time: datetime | None = None


class AuctionSellerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class AuctionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    starting_price: float
    current_price: float
    auction_currency: str = "USD"
    seller_id: int
    seller: AuctionSellerResponse | None = None
    category_id: int
    start_time: datetime
    end_time: datetime
    status: str


class HighestBidResponse(BaseModel):
    auction_id: int
    amount: float | None = None
    bidder_id: int | None = None
    bidder_username: str | None = None
    created_at: datetime | None = None
