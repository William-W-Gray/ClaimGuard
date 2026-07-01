"""Notification service + multi-channel dispatch abstraction (demo adapters)."""
from __future__ import annotations

from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.websocket import WSEventType, publish
from app.repositories.notification import NotificationRepository
from app.schemas.investigation import NotificationOut

log = get_logger(__name__)


# ── Channel adapters (swap for Twilio / Meta WhatsApp / SMS aggregator) ─────────
class ChannelAdapter(Protocol):
    channel: str

    async def send(self, to: str, title: str, message: str) -> bool: ...


class _LoggingAdapter:
    def __init__(self, channel: str) -> None:
        self.channel = channel

    async def send(self, to: str, title: str, message: str) -> bool:
        log.info("notification.dispatch", channel=self.channel, to=to, title=title)
        return True


CHANNELS: dict[str, ChannelAdapter] = {
    "WHATSAPP": _LoggingAdapter("WHATSAPP"),
    "SMS": _LoggingAdapter("SMS"),
    "USSD": _LoggingAdapter("USSD"),
    "EMAIL": _LoggingAdapter("EMAIL"),
    "APP_FEED": _LoggingAdapter("APP_FEED"),
}


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = NotificationRepository(session)

    async def list_for_user(
        self, user_id: str, *, page: int, page_size: int
    ) -> tuple[list[dict], int, int]:
        offset = (max(page, 1) - 1) * page_size
        rows, total = await self.repo.list_for_user(
            user_id, offset=offset, limit=page_size
        )
        unread = await self.repo.unread_count(user_id)
        items = [
            NotificationOut.model_validate(n).model_dump(by_alias=True) for n in rows
        ]
        return items, total, unread

    async def create(
        self,
        *,
        user_id: str | None,
        title: str,
        message: str,
        type_: str = "info",
        channel: str | None = None,
        link: str | None = None,
    ) -> dict:
        notif = await self.repo.create(
            user_id=user_id,
            title=title,
            message=message,
            type=type_,
            channel=channel,
            link=link,
        )
        if channel and channel in CHANNELS:
            notif.delivered = await CHANNELS[channel].send(
                to=str(user_id or "broadcast"), title=title, message=message
            )
        await self.session.flush()
        publish(
            WSEventType.NOTIFICATION_SENT,
            {"title": title, "type": type_, "link": link},
        )
        return NotificationOut.model_validate(notif).model_dump(by_alias=True)

    async def mark_read(self, notification_id: str) -> None:
        notif = await self.repo.get(notification_id)
        if not notif:
            raise NotFoundError("Notification not found")
        notif.read = True
        await self.session.flush()

    async def mark_all_read(self, user_id: str) -> None:
        await self.repo.mark_all_read(user_id)

    async def clear(self, user_id: str) -> None:
        await self.repo.clear_for_user(user_id)

    async def create_from_event(
        self, event_type: str, payload: dict
    ) -> dict | None:
        """Map a domain event to a persisted broadcast notification.

        Mirrors the rules that previously lived in the frontend so notification
        content is now generated and stored at the source of truth.
        """
        spec = _event_to_notification(event_type, payload)
        if spec is None:
            return None
        return await self.create(user_id=None, **spec)


def _event_to_notification(event_type: str, p: dict) -> dict | None:
    """Return {title, message, type_, link} for notifiable events, else None."""
    if event_type == "claim_scored":
        ref = p.get("claimRef", "CG-Claim")
        member = p.get("member", "Member")
        score = int(p.get("riskScore", 0) or 0)
        link = f"/queue/{ref}"
        if score >= 80:
            return {
                "title": "🚨 High Risk Claim Flagged",
                "message": f"Claim {ref} ({member}) scored {score} and requires immediate review.",
                "type_": "alert",
                "link": link,
            }
        if score >= 50:
            return {
                "title": "⚠️ Moderate Risk Claim",
                "message": f"Claim {ref} ({member}) scored {score} and is pending verification.",
                "type_": "warning",
                "link": link,
            }
        return {
            "title": "✓ Claim Auto-Approved",
            "message": f"Claim {ref} ({member}) scored {score} and has been approved.",
            "type_": "info",
            "link": link,
        }

    if event_type == "member_response":
        ref = p.get("claimRef", "CG-Claim")
        member = p.get("member", "Member")
        link = f"/queue/{ref}"
        if p.get("response") == "DISPUTED":
            return {
                "title": "❌ Claim Disputed by Member",
                "message": f"{member} disputed claim {ref} via WhatsApp/USSD.",
                "type_": "alert",
                "link": link,
            }
        if p.get("response") == "CONFIRMED":
            return {
                "title": "✓ Claim Confirmed by Member",
                "message": f"{member} confirmed claim {ref} via WhatsApp/USSD.",
                "type_": "info",
                "link": link,
            }
        return None

    if event_type == "trustscore_updated":
        provider = p.get("provider", "Provider")
        code = p.get("code", "PROV")
        return {
            "title": "📉 Provider TrustScore Alert",
            "message": f"{provider} score dropped from {p.get('oldScore')} to {p.get('newScore')}.",
            "type_": "warning",
            "link": f"/trustscore/{code}",
        }

    return None


async def record_event_notification(event_type: str, payload: dict) -> None:
    """Persist a notification for a domain event using a fresh session.

    Safe to call from fire-and-forget tasks (e.g. the demo runner) that have no
    request-scoped session. No-op for non-notifiable events.
    """
    from app.core.database import SessionFactory

    if _event_to_notification(event_type, payload) is None:
        return
    async with SessionFactory() as session:
        await NotificationService(session).create_from_event(event_type, payload)
        await session.commit()
