import json
from fastapi import APIRouter, Body, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.core.security import get_user_from_token
from backend.app.db.session import get_db
from backend.app.services.websocket_manager import manager
from backend.app.utils.privacy import normalize_role

router = APIRouter()

@router.websocket("/ws/auctions/{auction_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    auction_id: int,
    db: Session = Depends(get_db),
):
    """
    Handles WebSocket connections for auction rooms.
    """
    user = get_user_from_token(db, websocket.query_params.get("token"))
    await manager.connect(auction_id, websocket, role=normalize_role(getattr(user, "role", None)))
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "pong":
                    # Client is responsive
                    pass
            except json.JSONDecodeError:
                # Ignore non-JSON messages
                pass
    except WebSocketDisconnect:
        manager.disconnect(auction_id, websocket)

@router.post("/ws/test-broadcast/{auction_id}")
async def test_broadcast(auction_id: int, payload: dict = Body(...)):
    """
    A temporary endpoint to test broadcasting to a WebSocket room.
    """
    message = {
        "type": "TEST",
        "content": payload.get("message", "Default test message")
    }
    await manager.broadcast(auction_id, json.dumps(message))
    return {"status": "broadcast initiated"}
