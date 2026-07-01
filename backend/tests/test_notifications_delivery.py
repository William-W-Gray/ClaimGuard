"""Notification delivery: adapter selection, real send paths (mocked), assignment email."""
from __future__ import annotations

import app.services.notifications as notif_mod
from app.services.notifications import (
    NotificationService,
    SMTPEmailAdapter,
    TwilioWhatsAppAdapter,
    _build_channels,
    _LoggingAdapter,
)


# ─── Adapter selection (config-gated) ─────────────────────────────────────────────
def test_channels_fall_back_to_logging_when_unconfigured():
    # Test settings have no SMTP / Twilio creds.
    channels = _build_channels()
    assert isinstance(channels["EMAIL"], _LoggingAdapter)
    assert isinstance(channels["WHATSAPP"], _LoggingAdapter)


def test_channels_use_real_adapters_when_configured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(settings, "twilio_auth_token", "tok")
    monkeypatch.setattr(settings, "twilio_whatsapp_from", "+14155238886")
    channels = _build_channels()
    assert isinstance(channels["EMAIL"], SMTPEmailAdapter)
    assert isinstance(channels["WHATSAPP"], TwilioWhatsAppAdapter)


# ─── Real send paths (transport mocked — no network) ──────────────────────────────
async def test_email_adapter_sends_via_smtp(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    sent = {}

    async def fake_send(msg, **kwargs):
        sent["to"] = msg["To"]
        sent["subject"] = msg["Subject"]
        sent["kwargs"] = kwargs

    import aiosmtplib

    monkeypatch.setattr(aiosmtplib, "send", fake_send)
    ok = await SMTPEmailAdapter().send("agent@x.com", "Hello", "Body")
    assert ok is True
    assert sent["to"] == "agent@x.com"
    assert sent["subject"] == "Hello"
    assert sent["kwargs"]["hostname"] == "smtp.example.com"


async def test_whatsapp_adapter_posts_to_twilio(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(settings, "twilio_auth_token", "tok")
    monkeypatch.setattr(settings, "twilio_whatsapp_from", "+14155238886")
    captured = {}

    class FakeResp:
        def raise_for_status(self):
            captured["ok"] = True

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, data=None, auth=None):
            captured["url"] = url
            captured["data"] = data
            captured["auth"] = auth
            return FakeResp()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    ok = await TwilioWhatsAppAdapter().send("+263771234567", "Case", "Assigned")
    assert ok is True
    assert "AC123" in captured["url"]
    assert captured["data"]["To"] == "whatsapp:+263771234567"
    assert captured["auth"] == ("AC123", "tok")


# ─── Delivery never breaks the in-app notification ────────────────────────────────
async def test_delivery_failure_is_swallowed(client, auth_headers, monkeypatch):
    # Force the EMAIL adapter to blow up; the notification must still persist.
    class Boom:
        channel = "EMAIL"

        async def send(self, to, title, message):
            raise RuntimeError("smtp down")

    monkeypatch.setitem(notif_mod.CHANNELS, "EMAIL", Boom())

    from app.core.database import SessionFactory

    async with SessionFactory() as session:
        data = await NotificationService(session).create(
            user_id=None,
            title="Ping",
            message="hi",
            channel="EMAIL",
            recipient="x@y.com",
        )
        await session.commit()
    assert data["title"] == "Ping"  # created despite delivery failure


# ─── Assignment emails the assignee ───────────────────────────────────────────────
async def test_assignment_dispatches_email_to_assignee(client, auth_headers, monkeypatch):
    calls = []

    class Capture:
        channel = "EMAIL"

        async def send(self, to, title, message):
            calls.append((to, title))
            return True

    monkeypatch.setitem(notif_mod.CHANNELS, "EMAIL", Capture())

    users = (await client.get("/api/v1/users", headers=auth_headers)).json()["data"]
    farai = next(u for u in users if u["fullName"] == "Farai Nyathi")

    opened = await client.post(
        "/api/v1/investigations",
        headers=auth_headers,
        json={"claimId": "CG-00291", "priority": "HIGH"},
    )
    inv_id = opened.json()["data"]["id"]
    await client.patch(
        f"/api/v1/investigations/{inv_id}",
        headers=auth_headers,
        json={"assignedTo": farai["id"]},
    )

    assert calls, "assignment should dispatch an email to the assignee"
    assert calls[0][0] == farai["email"]
    assert "Case Assigned" in calls[0][1]
