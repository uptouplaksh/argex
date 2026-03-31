from backend.app.db.base import Base
from backend.app.db.session import engine
from backend.app.models.user import User

def init_db():
    Base.metadata.create_all(bind=engine)
