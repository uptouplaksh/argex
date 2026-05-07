import asyncio
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, auction_id: int, websocket: WebSocket):
        """
        Accepts a new WebSocket connection and adds it to the auction room.
        """
        await websocket.accept()
        if auction_id not in self.active_connections:
            self.active_connections[auction_id] = []
        self.active_connections[auction_id].append(websocket)

    def disconnect(self, auction_id: int, websocket: WebSocket):
        """
        Removes a WebSocket connection from the auction room.
        """
        if auction_id in self.active_connections:
            if websocket in self.active_connections[auction_id]:
                self.active_connections[auction_id].remove(websocket)
                if not self.active_connections[auction_id]:
                    del self.active_connections[auction_id]

    async def broadcast(self, auction_id: int, message: str):
        """
        Broadcasts a message to all connected clients in a specific auction room.
        This method includes error handling to gracefully manage disconnected clients.
        """
        if auction_id in self.active_connections:
            # Create a copy of the list to iterate over, allowing safe removal from the original list
            for connection in list(self.active_connections[auction_id]):
                try:
                    await connection.send_text(message)
                except (WebSocketDisconnect, RuntimeError):
                    # If sending fails, the client is disconnected. Remove them.
                    self.disconnect(auction_id, connection)

    async def start_heartbeat(self, interval_seconds: int = 30):
        """
        Periodically sends a ping to all connected clients to keep connections alive
        and detect unresponsive clients.
        """
        while True:
            await asyncio.sleep(interval_seconds)
            for auction_id in list(self.active_connections.keys()):
                for connection in list(self.active_connections.get(auction_id, [])):
                    try:
                        await connection.send_json({"type": "ping"})
                    except (WebSocketDisconnect, RuntimeError):
                        self.disconnect(auction_id, connection)

manager = ConnectionManager()
