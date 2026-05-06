from fastapi import FastAPI

from backend.app.api.routes import admin, auth, auction, bid, category, defender, roles, watchlist, ws, notifications
from backend.app.db.init_db import init_db

app = FastAPI(
    title="Argex",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ------------------------
# ROUTERS
# ------------------------
app.include_router(auth.router)
app.include_router(roles.router)
app.include_router(admin.router)
app.include_router(defender.router)
app.include_router(auction.router)
app.include_router(bid.router)
app.include_router(category.router)
app.include_router(watchlist.router)
app.include_router(ws.router)
app.include_router(notifications.router)


# ------------------------
# STARTUP EVENT
# ------------------------
@app.on_event("startup")
def on_startup():
    init_db()
