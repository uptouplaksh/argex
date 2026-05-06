from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app import schemas
from backend.app.api import deps
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.services import notification_service

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


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
    notification = notification_service.mark_notification_as_read(
        db, notification_id=notification_id
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to mark this notification as read")
    return notification
