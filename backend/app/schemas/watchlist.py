from backend.app.schemas.auction import AuctionResponse

from pydantic import BaseModel, ConfigDict


class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    auction_id: int
    auction: AuctionResponse
