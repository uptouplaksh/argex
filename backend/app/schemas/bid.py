from pydantic import BaseModel

class BidRequest(BaseModel):
    amount: float