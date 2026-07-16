from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, require_verified
from app.models.user import User
from app.schemas.db_connection import (
    ConnectionCreate,
    ConnectionListResponse,
    ConnectionResponse,
    QueryExecuteRequest,
    QueryResult,
    SchemaResponse,
)
from app.services.db_connector_service import DBConnectorService

router = APIRouter()


@router.get("/", response_model=ConnectionListResponse)
async def list_connections(
    current_user: User = Depends(require_verified),
    service: DBConnectorService = Depends(),
):
    connections = await service.list_connections(current_user)
    return {"connections": connections}


@router.post("/", response_model=ConnectionResponse)
async def create_connection(
    data: ConnectionCreate,
    current_user: User = Depends(require_verified),
    service: DBConnectorService = Depends(),
):
    result = await service.create_connection(
        user=current_user,
        name=data.name,
        host=data.host,
        port=data.port,
        database_name=data.database_name,
        schema_name=data.schema_name,
        username=data.username,
        password=data.password,
        description=data.description,
    )
    return result


@router.get("/{connection_id}/schema", response_model=SchemaResponse)
async def introspect_schema(
    connection_id: str,
    current_user: User = Depends(require_verified),
    service: DBConnectorService = Depends(),
):
    return await service.introspect_schema(connection_id, current_user)


@router.post("/{connection_id}/query", response_model=QueryResult)
async def execute_query(
    connection_id: str,
    data: QueryExecuteRequest,
    current_user: User = Depends(require_verified),
    service: DBConnectorService = Depends(),
):
    return await service.execute_readonly_query(
        connection_id, data.query, current_user, data.limit
    )
