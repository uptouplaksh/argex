import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Body
from backend.app.services.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws/auctions/{auction_id}")
async def websocket_endpoint(websocket: WebSocket, auction_id: int):
    """
    Handles WebSocket connections for auction rooms.
    """
    await manager.connect(auction_id, websocket)
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
