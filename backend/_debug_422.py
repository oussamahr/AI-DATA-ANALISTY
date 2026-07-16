import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from app.core.database import Base, get_session
from app.core.security.auth import hash_password
from app.main import app
from app.models.dataset import Dataset
from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DATABASE_URL, echo=False)
factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def run():
    async with engine.begin() as c:
        await c.run_sync(Base.metadata.create_all)

    async def override():
        async with factory() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise
            finally:
                await s.close()

    app.dependency_overrides[get_session] = override

    async with factory() as db:
        db.add(Role(name="admin", is_system_role=True, permissions=["*"]))
        db.add(
            User(
                email="test@example.com",
                hashed_password=hash_password("TestPass123!"),
                is_verified=True,
            )
        )
        db.add(Tenant(name="Test Corp"))
        await db.commit()

    async with factory() as db:
        u = (await db.execute(select(User))).scalar_one()
        t = (await db.execute(select(Tenant))).scalar_one()
        ds = Dataset(
            id=uuid.uuid4(),
            name="T",
            file_path=str(Path("tests/sample_data.csv").resolve()),
            owner_id=u.id,
            tenant_id=t.id,
        )
        db.add(ds)
        await db.commit()
        did = ds.id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        r = await cl.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "TestPass123!"},
        )
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        r2 = await cl.post(f"/api/v1/analytics/profile/{did}", headers=h)
        print("Profile:", r2.status_code)

        r3 = await cl.post(f"/api/v1/analytics/analyze/{did}", headers=h)
        print("Analyze:", r3.status_code)
        print("Body:", r3.text[:3000])


asyncio.run(run())
