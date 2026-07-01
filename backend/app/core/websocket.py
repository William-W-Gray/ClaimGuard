"""WebSocket gateway: connection manager, topic broadcast, heartbeat, event bus.

Replaces the frontend's mock event emitter. Services publish domain events here
and every connected client receives them in real time.
"""
from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from fastapi import WebSocket

from app.core.logging import get_logger

log = get_logger(__name__)


class WSEventType(StrEnum):
    CLAIM_SCORED = "claim_scored"
    QUEUE_UPDATED = "queue_updated"
    MEMBER_RESPONSE = "member_response"
    TRUSTSCORE_UPDATED = "trustscore_updated"
    DASHBOARD_UPDATED = "dashboard_updated"
    NOTIFICATION_SENT = "notification_sent"
    SYSTEM_HEALTH = "system_health"
    NH263_WEBHOOK = "nh263_webhook"


def build_event(event_type: WSEventType | str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "type": str(event_type),
        "timestamp": datetime.now(UTC).isoformat(),
        "payload": payload,
    }


class ConnectionManager:
    """Tracks live sockets and fans out events. Thread-safe via an asyncio lock."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        async with self._lock:
            self._connections[conn_id] = websocket
        log.info("ws.connected", conn_id=conn_id, total=len(self._connections))
        await self._send(websocket, build_event(
            WSEventType.SYSTEM_HEALTH,
            {"status": "connected", "message": "ClaimGuard realtime gateway active"},
        ))
        return conn_id

    async def disconnect(self, conn_id: str) -> None:
        async with self._lock:
            self._connections.pop(conn_id, None)
        log.info("ws.disconnected", conn_id=conn_id, total=len(self._connections))

    @property
    def active_count(self) -> int:
        return len(self._connections)

    async def _send(self, websocket: WebSocket, message: dict[str, Any]) -> None:
        with contextlib.suppress(Exception):  # broken pipe; reaped on next broadcast
            await websocket.send_json(message)

    async def broadcast(self, event_type: WSEventType | str, payload: dict[str, Any]) -> None:
        """Publish an event to every connected client. Drops dead sockets."""
        message = build_event(event_type, payload)
        dead: list[str] = []
        async with self._lock:
            targets = list(self._connections.items())
        for conn_id, ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(conn_id)
        for conn_id in dead:
            await self.disconnect(conn_id)

    async def heartbeat(self, websocket: WebSocket, interval: int = 25) -> None:
        """Periodic ping to keep the connection alive through proxies."""
        while True:
            await asyncio.sleep(interval)
            await self._send(websocket, build_event(
                WSEventType.SYSTEM_HEALTH, {"status": "heartbeat"}
            ))


manager = ConnectionManager()


def publish(event_type: WSEventType | str, payload: dict[str, Any]) -> None:
    """Fire-and-forget publish usable from sync/async service code."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event_type, payload))
    except RuntimeError:
        # No running loop (e.g. Celery worker) — run synchronously.
        asyncio.run(manager.broadcast(event_type, payload))
