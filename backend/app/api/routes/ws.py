from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.core.connection_manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws/{auction_id}")
async def websocket_endpoint(websocket: WebSocket, auction_id: int):
    await manager.connect(auction_id, websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(auction_id, websocket)