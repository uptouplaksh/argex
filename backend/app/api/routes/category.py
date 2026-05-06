from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.dependencies.rbac import require_role
from backend.app.models.user import User
from backend.app.schemas.category import CategoryCreate, CategoryResponse
from backend.app.services.category_service import create_category, list_categories

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return list_categories(db)


@router.post("/", response_model=CategoryResponse, status_code=201)
def post_category(
        data: CategoryCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_role(["admin"])),
):
    return create_category(db, data, current_user)
