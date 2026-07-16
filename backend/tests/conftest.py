import asyncio
from collections.abc import AsyncGenerator

import httpx
import pytest
import pytest_asyncio
from app.core.database import Base, get_session
from app.core.security.auth import hash_password
from app.main import app
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_session] = override_get_session


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_role(db: AsyncSession) -> Role:
    role = Role(name="admin", description="Admin", is_system_role=True, permissions=["*"])
    db.add(role)
    await db.flush()
    return role


@pytest_asyncio.fixture
async def default_roles(db: AsyncSession) -> list[Role]:
    roles = [
        Role(name="admin", is_system_role=True, permissions=["*"]),
        Role(
            name="analyst",
            is_system_role=True,
            permissions=["dataset:read", "dataset:write", "llm:query"],
        ),
        Role(name="viewer", is_system_role=True, permissions=["dataset:read"]),
    ]
    for r in roles:
        db.add(r)
    await db.flush()
    return roles


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    user = User(
        email="test@example.com",
        hashed_password=hash_password("TestPass123!"),
        first_name="Test",
        last_name="User",
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def test_tenant(db: AsyncSession, test_user: User) -> Tenant:
    tenant = Tenant(name="Test Corp")
    db.add(tenant)
    await db.flush()
    test_user.tenant_id = tenant.id
    await db.flush()
    return tenant


@pytest_asyncio.fixture
async def auth_headers(client: httpx.AsyncClient, test_user: User) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPass123!",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
