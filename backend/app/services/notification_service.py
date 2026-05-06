from sqlalchemy.orm import Session
from backend.app.models.notification import Notification
from backend.app.schemas.notification import NotificationCreate, NotificationUpdate
from typing import List

def create_notification(db: Session, user_id: int, type: str, message: str) -> Notification:
    """
    Creates a notification for a user.
    """
    notification = Notification(user_id=user_id, type=type, message=message)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def get_user_notifications(db: Session, user_id: int) -> List[Notification]:
    """
    Retrieves all notifications for a specific user.
    """
    return db.query(Notification).filter(Notification.user_id == user_id).all()

def mark_notification_as_read(db: Session, notification_id: int) -> Notification:
    """
    Marks a notification as read.
    """
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification
