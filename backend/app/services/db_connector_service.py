import logging
import re
import uuid
from datetime import UTC, datetime

from fastapi import Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.db_connection import DatabaseConnection
from app.models.user import User

logger = logging.getLogger("opencode.db_connector")

DANGEROUS_SQL_PATTERNS = [
    re.compile(r"\b(DROP|DELETE|TRUNCATE|ALTER|INSERT|UPDATE|CREATE|GRANT|REVOKE)\b", re.IGNORECASE),
    re.compile(r";\s*(DROP|DELETE|TRUNCATE|ALTER|INSERT|UPDATE|CREATE|GRANT|REVOKE)\b", re.IGNORECASE),
    re.compile(r"EXEC(UTE)?\s*\(", re.IGNORECASE),
    re.compile(r"INTO\s+(OUTFILE|DUMPFILE)\b", re.IGNORECASE),
    re.compile(r"LOAD_FILE\s*\(", re.IGNORECASE),
    re.compile(r"INTO\s+outfile\b", re.IGNORECASE),
]

QUERY_TIMEOUT_SECONDS = 30
MAX_ROWS = 10_000


def _validate_readonly_query(query: str) -> None:
    """Reject any SQL that looks like a write or dangerous operation."""
    for pattern in DANGEROUS_SQL_PATTERNS:
        if pattern.search(query):
            raise AppException(
                "Only SELECT queries are permitted against external databases",
                status_code=403,
            )


class DBConnectorService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _get_connection(self, connection_id: str, user: User) -> DatabaseConnection:
        result = await self.db.execute(
            select(DatabaseConnection).where(
                DatabaseConnection.id == uuid.UUID(connection_id),
            )
        )
        conn = result.scalar_one_or_none()
        if conn is None:
            raise AppException("Database connection not found", 404)
        if user.tenant_id and conn.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return conn

    async def list_connections(self, user: User) -> list[dict]:
        result = await self.db.execute(
            select(DatabaseConnection).where(
                DatabaseConnection.tenant_id == user.tenant_id,
            )
        )
        connections = result.scalars().all()
        return [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "host": c.host,
                "port": c.port,
                "database_name": c.database_name,
                "schema_name": c.schema_name,
                "status": c.status,
                "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in connections
        ]

    async def create_connection(
        self,
        user: User,
        name: str,
        host: str,
        port: str,
        database_name: str,
        schema_name: str,
        username: str,
        password: str,
        description: str | None = None,
    ) -> dict:
        # Basic connectivity test
        conn_url = f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{database_name}"
        test_engine = create_async_engine(conn_url, pool_pre_ping=True)

        try:
            async with test_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                await conn.execute(text(f"SET ROLE {schema_name}_reader"))
        except Exception as e:
            raise AppException(f"Cannot connect to database: {e}", status_code=400)
        finally:
            await test_engine.dispose()

        # Store credentials encrypted (placeholder - in production use Fernet or similar)
        db_conn = DatabaseConnection(
            tenant_id=user.tenant_id,
            created_by=user.id,
            name=name,
            description=description,
            host=host,
            port=port,
            database_name=database_name,
            schema_name=schema_name,
            encrypted_username=username,  # TODO: encrypt in production
            encrypted_password=password,  # TODO: encrypt in production
            status="connected",
        )
        self.db.add(db_conn)
        await self.db.commit()
        await self.db.refresh(db_conn)

        return {
            "id": str(db_conn.id),
            "name": db_conn.name,
            "status": db_conn.status,
        }

    async def introspect_schema(self, connection_id: str, user: User) -> dict:
        db_conn = await self._get_connection(connection_id, user)

        conn_url = f"postgresql+asyncpg://{db_conn.encrypted_username}:{db_conn.encrypted_password}@{db_conn.host}:{db_conn.port}/{db_conn.database_name}"
        engine = create_async_engine(conn_url, pool_pre_ping=True)

        try:
            async with engine.connect() as conn:
                schema = db_conn.schema_name or "public"
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = :schema AND table_type = 'BASE TABLE' "
                    "ORDER BY table_name"
                ), {"schema": schema})
                tables = [row[0] for row in result.fetchall()]

                table_columns = {}
                for table in tables:
                    col_result = await conn.execute(text(
                        "SELECT column_name, data_type, is_nullable, column_default "
                        "FROM information_schema.columns "
                        "WHERE table_schema = :schema AND table_name = :table "
                        "ORDER BY ordinal_position"
                    ), {"schema": schema, "table": table})
                    columns = [
                        {
                            "name": row[0],
                            "type": row[1],
                            "nullable": row[2] == "YES",
                            "default": row[3],
                        }
                        for row in col_result.fetchall()
                    ]
                    table_columns[table] = columns

            db_conn.last_synced_at = datetime.now(UTC)
            await self.db.commit()

            return {
                "schema_name": schema,
                "tables": tables,
                "columns": table_columns,
            }
        except Exception as e:
            db_conn.status = "error"
            db_conn.last_error = str(e)
            await self.db.commit()
            raise AppException(f"Schema introspection failed: {e}", status_code=500)
        finally:
            await engine.dispose()

    async def execute_readonly_query(
        self, connection_id: str, query: str, user: User, limit: int = MAX_ROWS
    ) -> dict:
        _validate_readonly_query(query)

        db_conn = await self._get_connection(connection_id, user)
        conn_url = f"postgresql+asyncpg://{db_conn.encrypted_username}:{db_conn.encrypted_password}@{db_conn.host}:{db_conn.port}/{db_conn.database_name}"
        engine = create_async_engine(conn_url, pool_pre_ping=True)

        try:
            async with engine.connect() as conn:
                safe_limit = min(limit, MAX_ROWS)
                limited_query = f"SELECT * FROM ({query.rstrip(';')}) _sub LIMIT {safe_limit}"
                result = await conn.execute(
                    text(limited_query).execution_options(timeout=QUERY_TIMEOUT_SECONDS)
                )
                rows = result.fetchall()
                columns = list(result.keys())

                return {
                    "columns": columns,
                    "rows": [dict(zip(columns, row)) for row in rows],
                    "row_count": len(rows),
                    "truncated": len(rows) >= safe_limit,
                }
        except Exception as e:
            raise AppException(f"Query execution failed: {e}", status_code=500)
        finally:
            await engine.dispose()
