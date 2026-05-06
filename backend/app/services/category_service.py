from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.category import Category
from backend.app.schemas.category import CategoryCreate


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name.asc()).all()


def create_category(db: Session, data: CategoryCreate, current_user) -> Category:
    category = Category(name=data.name.strip())
    if not category.name:
        raise HTTPException(status_code=400, detail="Category name is required")

    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")

    db.refresh(category)
    return category
