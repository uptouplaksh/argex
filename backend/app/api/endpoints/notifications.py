from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app import schemas
from backend.app.api import deps
from backend.app.core.security import get_current_user
from backend.app.models import User
from backend.app.models.notification import Notification as NotificationModel
from backend.app.services import notification_service

router = APIRouter()


@router.get("/", response_model=List[schemas.notification.Notification])
def read_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve notifications for the current user.
    """
    notifications = notification_service.get_user_notifications(db, user_id=current_user.id)
    return notifications


@router.patch("/{notification_id}/read", response_model=schemas.notification.Notification)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a notification as read.
    """
    notification = db.query(NotificationModel).filter(
        NotificationModel.id == notification_id,
        NotificationModel.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    updated_notification = notification_service.mark_notification_as_read(
        db, notification_id=notification_id
    )
    return updated_.notification
