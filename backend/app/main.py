from fastapi import FastAPI

from backend.app.api.routes import auth
from backend.app.db.init_db import init_db

app = FastAPI(title="Argex")
app.include_router(auth.router)


@app.get("startup")
def on_startup():
    init_db()
