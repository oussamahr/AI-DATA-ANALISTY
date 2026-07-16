from pydantic import BaseModel, Field


class ConnectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    host: str = Field(..., min_length=1, max_length=512)
    port: str = Field(default="5432", max_length=10)
    database_name: str = Field(..., min_length=1, max_length=255)
    schema_name: str = Field(default="public", max_length=255)
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class ConnectionResponse(BaseModel):
    id: str
    name: str
    status: str


class ConnectionListResponse(BaseModel):
    connections: list[dict]


class SchemaResponse(BaseModel):
    model_config = {"populate_by_name": True}

    schema_name: str = Field(..., alias="schema")
    tables: list[str]
    columns: dict[str, list[dict]]


class QueryExecuteRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000)
    limit: int = Field(default=10000, ge=1, le=10000)


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[dict]
    row_count: int
    truncated: bool
