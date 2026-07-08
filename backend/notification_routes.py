"""
notification_routes.py - In-app notification API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from auth import require_student, require_admin, get_current_user
import auth_models as am
import company_models as cm

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/me", response_model=List[NotificationOut])
def get_my_notifications(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    role = user.get("role")
    query = db.query(am.Notification)

    if role == "student":
        student_id = user.get("student_id")
        if not student_id:
            raise HTTPException(status_code=404, detail="Student not found")
        query = query.filter(am.Notification.student_id == student_id)
    elif role == "company":
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=404, detail="Company not found")
        query = query.filter(am.Notification.company_id == company_id)
    elif role == "admin":
        query = query.filter(am.Notification.student_id.is_(None), am.Notification.company_id.is_(None))
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    return query.order_by(am.Notification.created_at.desc()).limit(50).all()


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    notif = db.query(am.Notification).filter(am.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    role = user.get("role")
    if role == "student" and notif.student_id != user.get("student_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "company" and notif.company_id != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    role = user.get("role")
    query = db.query(am.Notification).filter(am.Notification.is_read == False)

    if role == "student":
        query = query.filter(am.Notification.student_id == user.get("student_id"))
    elif role == "company":
        query = query.filter(am.Notification.company_id == user.get("company_id"))
    else:
        return {"message": "No notifications to mark"}

    query.update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    role = user.get("role")
    query = db.query(am.Notification).filter(am.Notification.is_read == False)

    if role == "student":
        count = query.filter(am.Notification.student_id == user.get("student_id")).count()
    elif role == "company":
        count = query.filter(am.Notification.company_id == user.get("company_id")).count()
    else:
        count = 0

    return {"count": count}
