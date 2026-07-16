from enum import Enum

from pydantic import BaseModel, Field


class QueryType(str, Enum):
    SELECT = "select"
    AGGREGATE = "aggregate"
    FILTER = "filter"
    JOIN = "join"
    GROUP = "group"
    SORT = "sort"
    LIMIT = "limit"


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


class AggregateFunction(str, Enum):
    COUNT = "count"
    SUM = "sum"
    AVG = "avg"
    MIN = "min"
    MAX = "max"
    DISTINCT = "distinct"


class FilterOperator(str, Enum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    NOT_IN = "not_in"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"


class FilterCondition(BaseModel):
    column: str
    operator: FilterOperator
    value: str | int | float | list[str | int | float] | None = None


class AggregateColumn(BaseModel):
    column: str
    function: AggregateFunction
    alias: str | None = None


class SortColumn(BaseModel):
    column: str
    direction: SortDirection = SortDirection.ASC


class QueryIntent(BaseModel):
    query_type: QueryType
    dataset_id: str
    columns: list[str] = Field(default_factory=list)
    filters: list[FilterCondition] = Field(default_factory=list)
    aggregates: list[AggregateColumn] = Field(default_factory=list)
    group_by: list[str] = Field(default_factory=list)
    sort_by: list[SortColumn] = Field(default_factory=list)
    limit: int | None = None
    offset: int | None = None
    join_dataset_id: str | None = None
    join_columns: list[str] = Field(default_factory=list)
    raw_query: str | None = None
    explanation: str | None = None


class QueryIntentResponse(BaseModel):
    intent: QueryIntent
    confidence: float = Field(ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)
    sql_preview: str | None = None
