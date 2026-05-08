from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.category import Category
from backend.app.models.auction import Auction
from backend.app.schemas.category import CategoryCreate, CategoryUpdate


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


def update_category(db: Session, category_id: int, data: CategoryUpdate, current_user) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    next_name = data.name.strip()
    if not next_name:
        raise HTTPException(status_code=400, detail="Category name is required")

    category.name = next_name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")

    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int, current_user) -> None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    auction_count = db.query(Auction.id).filter(Auction.category_id == category_id).count()
    if auction_count:
        raise HTTPException(status_code=400, detail="Cannot delete a category that is used by auctions")

    db.delete(category)
    db.commit()
