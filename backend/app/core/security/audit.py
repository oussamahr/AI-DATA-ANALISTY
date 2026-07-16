import logging
import uuid
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy import insert

from app.core.database import async_session_factory
from app.models.audit_log import AuditLog

logger = logging.getLogger("opencode.audit")

SENSITIVE_HEADERS = {
    "authorization",
    "cookie",
    "x-api-key",
    "proxy-authorization",
}


class AuditLogger:
    def __init__(self):
        self.logger = logger

    async def log(
        self,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        actor_id: str | None = None,
        tenant_id: str | None = None,
        details: dict | None = None,
        request: Request | None = None,
    ):
        record = {
            "timestamp": datetime.now(UTC),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "actor_id": uuid.UUID(actor_id) if actor_id else None,
            "tenant_id": uuid.UUID(tenant_id) if tenant_id else None,
            "details": details or {},
        }

        if request:
            record["ip_address"] = request.client.host if request.client else None
            record["user_agent"] = request.headers.get("user-agent", "")
            record["method"] = request.method
            record["path"] = request.url.path

        try:
            async with async_session_factory() as session:
                await session.execute(insert(AuditLog).values(**record))
                await session.commit()
        except Exception:
            self.logger.exception("Failed to persist audit log")

    async def login(self, actor_id: str, success: bool, request: Request | None = None):
        await self.log(
            "LOGIN", "auth", actor_id=actor_id, details={"success": success}, request=request
        )

    async def logout(self, actor_id: str, request: Request | None = None):
        await self.log("LOGOUT", "auth", actor_id=actor_id, request=request)

    async def create(
        self,
        resource_type: str,
        resource_id: str,
        actor_id: str,
        tenant_id: str | None = None,
        request: Request | None = None,
    ):
        await self.log(
            "CREATE", resource_type, resource_id, actor_id, tenant_id, request=request
        )

    async def read(
        self,
        resource_type: str,
        resource_id: str,
        actor_id: str,
        tenant_id: str | None = None,
        request: Request | None = None,
    ):
        await self.log(
            "READ", resource_type, resource_id, actor_id, tenant_id, request=request
        )

    async def update(
        self,
        resource_type: str,
        resource_id: str,
        actor_id: str,
        tenant_id: str | None = None,
        details: dict | None = None,
        request: Request | None = None,
    ):
        await self.log(
            "UPDATE", resource_type, resource_id, actor_id, tenant_id, details, request=request
        )

    async def delete(
        self,
        resource_type: str,
        resource_id: str,
        actor_id: str,
        tenant_id: str | None = None,
        request: Request | None = None,
    ):
        await self.log(
            "DELETE", resource_type, resource_id, actor_id, tenant_id, request=request
        )


audit_logger = AuditLogger()
