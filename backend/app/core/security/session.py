from __future__ import annotations

import json
import secrets
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.config import settings


@dataclass(slots=True)
class SessionRecord:
    session_id: str
    user_id: str
    created_at: str
    last_seen_at: str
    csrf_token: str


class SessionStore(Protocol):
    async def create_session(self, user_id: str) -> SessionRecord: ...

    async def get_session(self, session_id: str) -> SessionRecord | None: ...

    async def rotate_session(self, session_id: str, user_id: str) -> SessionRecord: ...

    async def revoke_session(self, session_id: str) -> None: ...


class InMemorySessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionRecord] = {}

    async def create_session(self, user_id: str) -> SessionRecord:
        record = _make_record(user_id)
        self._sessions[record.session_id] = record
        return record

    async def get_session(self, session_id: str) -> SessionRecord | None:
        record = self._sessions.get(session_id)
        if record is None:
            return None
        if _is_expired(record):
            await self.revoke_session(session_id)
            return None
        record.last_seen_at = datetime.now(UTC).isoformat()
        return record

    async def rotate_session(self, session_id: str, user_id: str) -> SessionRecord:
        await self.revoke_session(session_id)
        return await self.create_session(user_id)

    async def revoke_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


class RedisSessionStore:
    def __init__(self, redis_url: str):
        try:
            import redis.asyncio as redis
        except ImportError as exc:  # pragma: no cover - fallback path
            raise RuntimeError("redis package is required for RedisSessionStore") from exc

        self._redis = redis.from_url(redis_url, decode_responses=True)

    async def create_session(self, user_id: str) -> SessionRecord:
        record = _make_record(user_id)
        await self._redis.set(
            self._redis_key(record.session_id), json.dumps(asdict(record)), ex=_ttl_seconds()
        )
        return record

    async def get_session(self, session_id: str) -> SessionRecord | None:
        raw = await self._redis.get(self._redis_key(session_id))
        if raw is None:
            return None
        record = SessionRecord(**json.loads(raw))
        if _is_expired(record):
            await self.revoke_session(session_id)
            return None
        record.last_seen_at = datetime.now(UTC).isoformat()
        await self._redis.set(
            self._redis_key(session_id), json.dumps(asdict(record)), ex=_ttl_seconds()
        )
        return record

    async def rotate_session(self, session_id: str, user_id: str) -> SessionRecord:
        await self.revoke_session(session_id)
        return await self.create_session(user_id)

    async def revoke_session(self, session_id: str) -> None:
        await self._redis.delete(self._redis_key(session_id))

    def _redis_key(self, session_id: str) -> str:
        return f"session:{session_id}"


_session_store: SessionStore | None = None


def _make_record(user_id: str) -> SessionRecord:
    now = datetime.now(UTC).isoformat()
    return SessionRecord(
        session_id=secrets.token_urlsafe(32),
        user_id=user_id,
        created_at=now,
        last_seen_at=now,
        csrf_token=secrets.token_urlsafe(32),
    )


def _ttl_seconds() -> int:
    return int(timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS).total_seconds())


def _is_expired(record: SessionRecord) -> bool:
    created_at = datetime.fromisoformat(record.created_at)
    last_seen_at = datetime.fromisoformat(record.last_seen_at)
    now = datetime.now(UTC)
    absolute_expired = now - created_at > timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)
    idle_expired = now - last_seen_at > timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
    return absolute_expired or idle_expired


def get_session_store() -> SessionStore:
    global _session_store
    if _session_store is not None:
        return _session_store

    try:
        _session_store = RedisSessionStore(settings.REDIS_URL)
    except RuntimeError:
        _session_store = InMemorySessionStore()
    return _session_store
