from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, auction_id: int, websocket: WebSocket):
        await websocket.accept()
        if auction_id not in self.active_connections:
            self.active_connections[auction_id] = []
        self.active_connections[auction_id].append(websocket)

    def disconnect(self, auction_id: int, websocket: WebSocket):
        self.active_connections[auction_id].remove(websocket)

    async def broadcast(self, auction_id: int, message: dict):
        if auction_id in self.active_connections:
            for connection in self.active_connections[auction_id]:
                await connection.send_json(message)