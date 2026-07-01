"""Notification endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import CurrentUserDep, DbSession, PaginationDep
from app.core.responses import paginated, success
from app.services.notifications import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", summary="Current user's notifications (paginated)")
async def list_notifications(
    db: DbSession, user: CurrentUserDep, pagination: PaginationDep
) -> dict:
    items, total, unread = await NotificationService(db).list_for_user(
        user.id, page=pagination.page, page_size=pagination.page_size
    )
    result = paginated(items, pagination.page, pagination.page_size, total, "Notifications")
    result["metadata"]["unread"] = unread
    return result


@router.post("/{notification_id}/read", summary="Mark one as read")
async def mark_read(notification_id: str, db: DbSession, _: CurrentUserDep) -> dict:
    await NotificationService(db).mark_read(notification_id)
    return success(None, "Marked as read")


@router.post("/read-all", summary="Mark all as read")
async def mark_all_read(db: DbSession, user: CurrentUserDep) -> dict:
    await NotificationService(db).mark_all_read(user.id)
    return success(None, "All marked as read")


@router.delete("", summary="Clear (dismiss) all visible notifications")
async def clear_all(db: DbSession, user: CurrentUserDep) -> dict:
    await NotificationService(db).clear(user.id)
    return success(None, "Notifications cleared")
