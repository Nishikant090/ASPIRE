"""
notification_service.py - Create in-app notifications for students, companies, and admins
"""

from sqlalchemy.orm import Session
import auth_models as am


def create_notification(
    db: Session,
    *,
    title: str,
    message: str,
    student_id: int = None,
    company_id: int = None,
):
    notif = am.Notification(
        student_id=student_id,
        company_id=company_id,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_student(db: Session, student_id: int, title: str, message: str):
    return create_notification(db, title=title, message=message, student_id=student_id)


def notify_company(db: Session, company_id: int, title: str, message: str):
    return create_notification(db, title=title, message=message, company_id=company_id)
