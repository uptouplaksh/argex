from fastapi import FastAPI

from backend.app.api.routes import auth, auction, bid, ws
from backend.app.db.init_db import init_db

app = FastAPI(title="Argex")

# ------------------------
# ROUTERS
# ------------------------
app.include_router(auth.router)
app.include_router(auction.router)
app.include_router(bid.router)
app.include_router(ws.router)


# ------------------------
# STARTUP EVENT
# ------------------------
@app.on_event("startup")
def on_startup():
    init_db()