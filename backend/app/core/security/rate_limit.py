import asyncio
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    async def check(self, key: str, max_count: int, window_seconds: int) -> bool:
        now = time.time()
        timestamps = self._store[key]
        cutoff = now - window_seconds
        self._store[key] = [t for t in timestamps if t > cutoff]
        if len(self._store[key]) >= max_count:
            return False
        self._store[key].append(now)
        return True


class RedisRateLimiter:
    def __init__(self, redis_url: str):
        try:
            import redis.asyncio as redis
        except ImportError as exc:
            raise RuntimeError("redis package is required for RedisRateLimiter") from exc
        self._redis = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )

    async def check(self, key: str, max_count: int, window_seconds: int) -> bool:
        now = int(time.time())
        window_start = now - window_seconds
        try:
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds)
            _, count, _, _ = await asyncio.wait_for(pipe.execute(), timeout=3)
            return int(count) < max_count
        except Exception:
            return True


def _create_limiter() -> InMemoryRateLimiter | RedisRateLimiter:
    if not settings.REDIS_URL or settings.is_testing():
        return InMemoryRateLimiter()
    try:
        limiter = RedisRateLimiter(settings.REDIS_URL)
        return limiter
    except (RuntimeError, Exception):
        return InMemoryRateLimiter()


_limiter = _create_limiter()


def parse_rate_limit(rate: str) -> tuple[int, int]:
    count_str, window_str = rate.split("/")
    count = int(count_str)
    if window_str.endswith("minute"):
        window = 60
    elif window_str.endswith("hour"):
        window = 3600
    elif window_str.endswith("second"):
        window = 1
    elif window_str.endswith("day"):
        window = 86400
    else:
        window = 60
    return count, window


async def rate_limit_dependency(rate: str, key_prefix: str, request: Request):
    if settings.is_testing():
        return
    count, window = parse_rate_limit(rate)
    client_host = request.client.host if request.client else "unknown"
    key = f"rl:{key_prefix}:{client_host}"
    allowed = await _limiter.check(key, count, window)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
