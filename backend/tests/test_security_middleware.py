import pytest
import httpx
from app.main import app


@pytest.mark.asyncio
class TestSecurityHeaders:
    async def test_security_headers_present(self, client: httpx.AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "max-age=31536000" in response.headers.get("Strict-Transport-Security", "")
        assert "default-src 'self'" in response.headers.get("Content-Security-Policy", "")

    async def test_request_id_added(self, client: httpx.AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert "X-Request-ID" in response.headers

    async def test_request_id_preserved(self, client: httpx.AsyncClient):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"X-Request-ID": "test-id-123"}
        )
        assert response.headers.get("X-Request-ID") == "test-id-123"


@pytest.mark.asyncio
class TestBodySizeLimit:
    async def test_oversized_request_rejected(self, client: httpx.AsyncClient):
        large_body = "x" * (11 * 1024 * 1024)
        response = await client.post(
            "/api/v1/auth/register",
            content=large_body,
            headers={"Content-Type": "application/json", "Content-Length": str(len(large_body))}
        )
        assert response.status_code == 413

    async def test_invalid_content_length(self, client: httpx.AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            content=b"test",
            headers={"Content-Type": "application/json", "Content-Length": "invalid"}
        )
        assert response.status_code == 413


@pytest.mark.asyncio
class TestCacheControl:
    async def test_api_no_cache(self, client: httpx.AsyncClient):
        response = await client.get("/api/v1/auth/me")
        cache_control = response.headers.get("Cache-Control", "")
        assert "no-store" in cache_control
        assert "no-cache" in cache_control
        assert "must-revalidate" in cache_control
        assert response.headers.get("Pragma") == "no-cache"
