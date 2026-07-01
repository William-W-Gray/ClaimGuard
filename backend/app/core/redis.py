"""Async Redis client wrapper with a no-op in-memory fallback for offline demo."""
from __future__ import annotations

import time
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class _InMemoryFallback:
    """Minimal Redis-compatible shim so the app runs without a Redis server.

    Supports the small surface we use: get/set(ex)/delete/incr/expire/ping.
    Not for production — only keeps the demo working fully offline.
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float | None]] = {}

    def _expired(self, key: str) -> bool:
        item = self._store.get(key)
        if not item:
            return True
        _, exp = item
        if exp is not None and exp < time.time():
            self._store.pop(key, None)
            return True
        return False

    async def get(self, key: str) -> Any:
        return None if self._expired(key) else self._store[key][0]

    async def set(self, key: str, value: Any, ex: int | None = None) -> bool:
        self._store[key] = (value, time.time() + ex if ex else None)
        return True

    async def delete(self, *keys: str) -> int:
        return sum(self._store.pop(k, None) is not None for k in keys)

    async def incr(self, key: str) -> int:
        current = 0 if self._expired(key) else int(self._store[key][0])
        current += 1
        exp = None if self._expired(key) else self._store[key][1]
        self._store[key] = (current, exp)
        return current

    async def expire(self, key: str, seconds: int) -> bool:
        if not self._expired(key):
            self._store[key] = (self._store[key][0], time.time() + seconds)
            return True
        return False

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:  # pragma: no cover
        self._store.clear()


class RedisClient:
    """Lazily-connected Redis client; degrades to in-memory shim if unavailable."""

    def __init__(self) -> None:
        self._client: Any = None
        self._fallback = False

    async def connect(self) -> None:
        try:
            self._client = aioredis.from_url(
                settings.redis_url, encoding="utf-8", decode_responses=True
            )
            await self._client.ping()
            log.info("redis.connected", url=settings.redis_url)
        except Exception as exc:  # offline demo path
            log.warning("redis.unavailable", error=str(exc), fallback="in-memory")
            self._client = _InMemoryFallback()
            self._fallback = True

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = _InMemoryFallback()
            self._fallback = True
        return self._client

    @property
    def using_fallback(self) -> bool:
        return self._fallback

    async def ping(self) -> bool:
        try:
            return bool(await self.client.ping())
        except Exception:
            return False

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()


redis_client = RedisClient()
