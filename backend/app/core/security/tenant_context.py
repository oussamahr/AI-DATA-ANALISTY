from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class TenantContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id = getattr(request.state, "tenant_id", None)
        role = getattr(request.state, "role", None)
        
        if tenant_id:
            from app.core.database import async_session_factory
            async with async_session_factory() as session:
                await session.execute(
                    f"SET app.current_tenant = '{tenant_id}'"
                )
                if role:
                    await session.execute(
                        f"SET app.current_role = '{role}'"
                    )
        
        response = await call_next(request)
        return response
