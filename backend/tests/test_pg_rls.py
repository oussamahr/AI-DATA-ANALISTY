import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

try:
    import docker
    _client = docker.from_env()
    _client.ping()
    HAS_DOCKER = True
    _client.close()
except Exception:
    HAS_DOCKER = False

pytestmark = pytest.mark.skipif(
    not HAS_DOCKER,
    reason="Docker not available — skipping RLS integration tests",
)


def _get_pg_url(container: PostgresContainer) -> str:
    host = container.get_container_host_ip()
    port = container.get_exposed_port(5432)
    return f"postgresql+asyncpg://{container.username}:{container.password}@{host:{port}}/{container.dbname}"


RLS_TABLES = [
    "users",
    "datasets",
    "audit_logs",
    "llm_queries",
    "invitations",
]


@pytest.fixture(scope="module")
def pg_container():
    from testcontainers.postgres import PostgresContainer
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest.fixture(scope="module")
async def pg_engine(pg_container):
    url = _get_pg_url(pg_container)
    engine = create_async_engine(url, echo=False)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="module")
async def setup_rls(pg_engine):
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                first_name VARCHAR(100) DEFAULT '',
                last_name VARCHAR(100) DEFAULT '',
                hashed_password VARCHAR(255) DEFAULT '',
                tenant_id UUID,
                is_active BOOLEAN DEFAULT true,
                is_verified BOOLEAN DEFAULT false
            );
            CREATE TABLE datasets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                file_path VARCHAR(1024) NOT NULL,
                file_size_bytes BIGINT DEFAULT 0,
                mime_type VARCHAR(100) DEFAULT '',
                row_count BIGINT,
                contains_pii BOOLEAN DEFAULT false,
                owner_id UUID REFERENCES users(id),
                tenant_id UUID
            );
            CREATE TABLE audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100) NOT NULL,
                resource_id UUID,
                user_id UUID REFERENCES users(id),
                tenant_id UUID,
                details JSONB DEFAULT '{}'
            );
            CREATE TABLE llm_queries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                tenant_id UUID,
                prompt TEXT NOT NULL,
                response TEXT DEFAULT '',
                model VARCHAR(100) DEFAULT '',
                duration_ms INTEGER DEFAULT 0,
                success BOOLEAN DEFAULT true
            );
            CREATE TABLE invitations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL,
                role_id UUID,
                tenant_id UUID,
                invited_by UUID REFERENCES users(id),
                token VARCHAR(255) NOT NULL,
                accepted BOOLEAN DEFAULT false
            );
        """))
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE users ENABLE ROW LEVEL SECURITY;
            ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
            ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
            ALTER TABLE llm_queries ENABLE ROW LEVEL SECURITY;
            ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

            CREATE POLICY tenant_isolation_users ON users
                USING (tenant_id = current_setting('app.current_tenant')::uuid);
            CREATE POLICY tenant_isolation_datasets ON datasets
                USING (tenant_id = current_setting('app.current_tenant')::uuid);
            CREATE POLICY tenant_isolation_audit_logs ON audit_logs
                USING (tenant_id = current_setting('app.current_tenant')::uuid);
            CREATE POLICY tenant_isolation_llm_queries ON llm_queries
                USING (tenant_id = current_setting('app.current_tenant')::uuid);
            CREATE POLICY tenant_isolation_invitations ON invitations
                USING (tenant_id = current_setting('app.current_tenant')::uuid);
        """))


TENANT_A = uuid.uuid4()
TENANT_B = uuid.uuid4()
USER_A = uuid.uuid4()
USER_B = uuid.uuid4()
DATASET_A = uuid.uuid4()
DATASET_B = uuid.uuid4()


class TestRLSTenantIsolation:
    @pytest.mark.asyncio
    async def test_user_cannot_see_other_tenant_users(self, pg_engine, setup_rls):
        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            await conn.execute(text("""
                INSERT INTO users (id, email, tenant_id) VALUES (:id, :email, :tid)
            """), {"id": str(USER_A), "email": "a@test.com", "tid": str(TENANT_A)})
            await conn.execute(text("""
                INSERT INTO users (id, email, tenant_id) VALUES (:id, :email, :tid)
            """), {"id": str(USER_B), "email": "b@test.com", "tid": str(TENANT_B)})

        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            result = await conn.execute(text("SELECT id FROM users"))
            rows = result.fetchall()
            visible_ids = {row[0] for row in rows}

        assert USER_A in visible_ids
        assert USER_B not in visible_ids

    @pytest.mark.asyncio
    async def test_user_cannot_see_other_tenant_datasets(self, pg_engine, setup_rls):
        async with pg_engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO datasets (id, name, file_path, tenant_id)
                VALUES (:id, :name, :path, :tid)
            """), {"id": str(DATASET_A), "name": "DS A", "path": "/a.csv", "tid": str(TENANT_A)})
            await conn.execute(text("""
                INSERT INTO datasets (id, name, file_path, tenant_id)
                VALUES (:id, :name, :path, :tid)
            """), {"id": str(DATASET_B), "name": "DS B", "path": "/b.csv", "tid": str(TENANT_B)})

        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            result = await conn.execute(text("SELECT id FROM datasets"))
            rows = result.fetchall()
            visible_ids = {row[0] for row in rows}

        assert DATASET_A in visible_ids
        assert DATASET_B not in visible_ids

    @pytest.mark.asyncio
    async def test_cross_tenant_audit_log_isolation(self, pg_engine, setup_rls):
        LOG_A = uuid.uuid4()
        LOG_B = uuid.uuid4()
        async with pg_engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO audit_logs (id, action, resource_type, tenant_id, user_id)
                VALUES (:id, 'test', 'user', :tid, :uid)
            """), {"id": str(LOG_A), "tid": str(TENANT_A), "uid": str(USER_A)})
            await conn.execute(text("""
                INSERT INTO audit_logs (id, action, resource_type, tenant_id, user_id)
                VALUES (:id, 'test', 'user', :tid, :uid)
            """), {"id": str(LOG_B), "tid": str(TENANT_B), "uid": str(USER_B)})

        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            result = await conn.execute(text("SELECT id FROM audit_logs"))
            rows = result.fetchall()
            visible_ids = {row[0] for row in rows}

        assert LOG_A in visible_ids
        assert LOG_B not in visible_ids

    @pytest.mark.asyncio
    async def test_tenant_cannot_insert_into_other_tenant(self, pg_engine, setup_rls):
        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            with pytest.raises(Exception):
                await conn.execute(text("""
                    INSERT INTO datasets (id, name, file_path, tenant_id)
                    VALUES (:id, :name, :path, :tid)
                """), {
                    "id": str(uuid.uuid4()),
                    "name": "Hack",
                    "path": "/hack.csv",
                    "tid": str(TENANT_B),
                })

    @pytest.mark.asyncio
    async def test_cross_tenant_llm_query_isolation(self, pg_engine, setup_rls):
        Q_A = uuid.uuid4()
        Q_B = uuid.uuid4()
        async with pg_engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO llm_queries (id, user_id, tenant_id, prompt)
                VALUES (:id, :uid, :tid, 'query A')
            """), {"id": str(Q_A), "uid": str(USER_A), "tid": str(TENANT_A)})
            await conn.execute(text("""
                INSERT INTO llm_queries (id, user_id, tenant_id, prompt)
                VALUES (:id, :uid, :tid, 'query B')
            """), {"id": str(Q_B), "uid": str(USER_B), "tid": str(TENANT_B)})

        async with pg_engine.begin() as conn:
            await conn.execute(text("SET app.current_tenant = :tid"), {"tid": str(TENANT_A)})
            result = await conn.execute(text("SELECT id FROM llm_queries"))
            rows = result.fetchall()
            visible_ids = {row[0] for row in rows}

        assert Q_A in visible_ids
        assert Q_B not in visible_ids

    @pytest.mark.asyncio
    async def test_tenant_context_required(self, pg_engine, setup_rls):
        async with pg_engine.begin() as conn:
            result = await conn.execute(text("SELECT id FROM users"))
            rows = result.fetchall()
            assert len(rows) == 0

    @pytest.mark.asyncio
    async def test_rls_enabled_on_all_tables(self, pg_engine, setup_rls):
        async with pg_engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT tablename, rowsecurity
                FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename = ANY(:tables)
            """), {"tables": RLS_TABLES})
            rows = result.fetchall()

        assert len(rows) == len(RLS_TABLES)
        for tablename, rowsecurity in rows:
            assert rowsecurity is True, f"RLS not enabled on {tablename}"
