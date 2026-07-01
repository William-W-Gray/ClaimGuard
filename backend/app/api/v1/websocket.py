"""WebSocket gateway endpoint — realtime event stream for the frontend."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.core.websocket import manager

router = APIRouter(tags=["websocket"])
log = get_logger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    conn_id = await manager.connect(websocket)
    heartbeat = asyncio.create_task(manager.heartbeat(websocket))
    try:
        while True:
            # Client → server messages (e.g. ping/subscribe) keep the socket alive.
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.warning("ws.error", error=str(exc))
    finally:
        heartbeat.cancel()
        await manager.disconnect(conn_id)
