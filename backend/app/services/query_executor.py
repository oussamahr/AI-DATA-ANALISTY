import signal
import uuid
from pathlib import Path

import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.dataset import Dataset
from app.schemas.query_intent import (
    AggregateColumn,
    AggregateFunction,
    FilterCondition,
    FilterOperator,
    QueryIntent,
    QueryType,
    SortColumn,
)

MAX_ROWS = 500_000
QUERY_TIMEOUT_SECONDS = 30


class QueryExecutor:
    OPERATOR_MAP = {
        FilterOperator.EQ: "=",
        FilterOperator.NEQ: "!=",
        FilterOperator.GT: ">",
        FilterOperator.GTE: ">=",
        FilterOperator.LT: "<",
        FilterOperator.LTE: "<=",
        FilterOperator.CONTAINS: "LIKE",
        FilterOperator.STARTS_WITH: "LIKE",
        FilterOperator.ENDS_WITH: "LIKE",
    }

    AGGREGATE_MAP = {
        AggregateFunction.COUNT: "COUNT",
        AggregateFunction.SUM: "SUM",
        AggregateFunction.AVG: "AVG",
        AggregateFunction.MIN: "MIN",
        AggregateFunction.MAX: "MAX",
        AggregateFunction.DISTINCT: "DISTINCT",
    }

    async def execute(
        self,
        intent: QueryIntent,
        dataset: Dataset,
        db: AsyncSession,
    ) -> pd.DataFrame:
        if dataset.file_path.startswith("s3://"):
            df = await self._load_from_s3(dataset)
        else:
            df = self._load_from_local(dataset)

        row_count = len(df)
        if row_count > MAX_ROWS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Dataset has {row_count:,} rows, exceeding max of {MAX_ROWS:,}.",
            )

        df = self._apply_filters(df, intent.filters)
        
        if intent.query_type == QueryType.AGGREGATE and intent.aggregates:
            df = self._apply_aggregates(df, intent.aggregates, intent.group_by)
        
        if intent.query_type == QueryType.GROUP and intent.group_by:
            df = self._apply_group_by(df, intent.group_by)
        
        if intent.sort_by:
            df = self._apply_sort(df, intent.sort_by)
        
        if intent.columns:
            valid_cols = [c for c in intent.columns if c in df.columns]
            if valid_cols:
                df = df[valid_cols]
        
        if intent.limit is not None:
            safe_limit = min(intent.limit, 10_000)
            start = intent.offset or 0
            df = df.iloc[start:start + safe_limit]

        if len(df) > MAX_ROWS:
            df = df.head(MAX_ROWS)

        return df

    def _load_from_local(self, dataset: Dataset) -> pd.DataFrame:
        file_path = Path(dataset.file_path)
        ext = file_path.suffix.lower()
        
        if ext == ".csv":
            return pd.read_csv(file_path)
        elif ext == ".tsv":
            return pd.read_csv(file_path, sep="\t")
        elif ext in {".xlsx", ".xls"}:
            return pd.read_excel(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        elif ext == ".parquet":
            return pd.read_parquet(file_path)
        elif ext == ".feather":
            return pd.read_feather(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {ext}",
            )

    async def _load_from_s3(self, dataset: Dataset) -> pd.DataFrame:
        from app.core.storage.s3 import s3_storage
        
        parts = dataset.file_path.replace("s3://", "").split("/", 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ""
        
        content = await s3_storage.download_file(str(dataset.tenant_id), key)
        
        ext = Path(key).suffix.lower()
        if ext == ".csv":
            return pd.read_csv(pd.io.common.BytesIO(content))
        elif ext == ".tsv":
            return pd.read_csv(pd.io.common.BytesIO(content), sep="\t")
        elif ext in {".xlsx", ".xls"}:
            return pd.read_excel(pd.io.common.BytesIO(content))
        elif ext == ".json":
            return pd.read_json(pd.io.common.BytesIO(content))
        elif ext == ".parquet":
            return pd.read_parquet(pd.io.common.BytesIO(content))
        elif ext == ".feather":
            return pd.read_feather(pd.io.common.BytesIO(content))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {ext}",
            )

    def _apply_filters(self, df: pd.DataFrame, filters: list[FilterCondition]) -> pd.DataFrame:
        for f in filters:
            if f.column not in df.columns:
                continue
            
            if f.operator == FilterOperator.IS_NULL:
                df = df[df[f.column].isna()]
            elif f.operator == FilterOperator.IS_NOT_NULL:
                df = df[df[f.column].notna()]
            elif f.operator == FilterOperator.IN:
                df = df[df[f.column].isin(f.value)]
            elif f.operator == FilterOperator.NOT_IN:
                df = df[~df[f.column].isin(f.value)]
            elif f.operator == FilterOperator.CONTAINS:
                df = df[df[f.column].str.contains(str(f.value), na=False)]
            elif f.operator == FilterOperator.STARTS_WITH:
                df = df[df[f.column].str.startswith(str(f.value), na=False)]
            elif f.operator == FilterOperator.ENDS_WITH:
                df = df[df[f.column].str.endswith(str(f.value), na=False)]
            elif f.operator in self.OPERATOR_MAP:
                op = self.OPERATOR_MAP[f.operator]
                if op == "=":
                    df = df[df[f.column] == f.value]
                elif op == "!=":
                    df = df[df[f.column] != f.value]
                elif op == ">":
                    df = df[df[f.column] > f.value]
                elif op == ">=":
                    df = df[df[f.column] >= f.value]
                elif op == "<":
                    df = df[df[f.column] < f.value]
                elif op == "<=":
                    df = df[df[f.column] <= f.value]
        
        return df

    def _apply_aggregates(
        self,
        df: pd.DataFrame,
        aggregates: list[AggregateColumn],
        group_by: list[str],
    ) -> pd.DataFrame:
        if group_by:
            agg_dict = {}
            for agg in aggregates:
                if agg.column in df.columns:
                    if agg.function == AggregateFunction.COUNT:
                        agg_dict[agg.column] = "count"
                    elif agg.function == AggregateFunction.SUM:
                        agg_dict[agg.column] = "sum"
                    elif agg.function == AggregateFunction.AVG:
                        agg_dict[agg.column] = "mean"
                    elif agg.function == AggregateFunction.MIN:
                        agg_dict[agg.column] = "min"
                    elif agg.function == AggregateFunction.MAX:
                        agg_dict[agg.column] = "max"
            
            if agg_dict:
                df = df.groupby(group_by).agg(agg_dict).reset_index()
                if aggregates:
                    rename_map = {}
                    for agg in aggregates:
                        if agg.column in df.columns and agg.alias:
                            rename_map[agg.column] = agg.alias
                    if rename_map:
                        df = df.rename(columns=rename_map)
        else:
            result = {}
            for agg in aggregates:
                if agg.column in df.columns:
                    if agg.function == AggregateFunction.COUNT:
                        result[agg.alias or f"count_{agg.column}"] = [df[agg.column].count()]
                    elif agg.function == AggregateFunction.SUM:
                        result[agg.alias or f"sum_{agg.column}"] = [df[agg.column].sum()]
                    elif agg.function == AggregateFunction.AVG:
                        result[agg.alias or f"avg_{agg.column}"] = [df[agg.column].mean()]
                    elif agg.function == AggregateFunction.MIN:
                        result[agg.alias or f"min_{agg.column}"] = [df[agg.column].min()]
                    elif agg.function == AggregateFunction.MAX:
                        result[agg.alias or f"max_{agg.column}"] = [df[agg.column].max()]
                    elif agg.function == AggregateFunction.DISTINCT:
                        result[agg.alias or f"distinct_{agg.column}"] = [df[agg.column].nunique()]
            
            df = pd.DataFrame(result) if result else pd.DataFrame()
        
        return df

    def _apply_group_by(self, df: pd.DataFrame, group_by: list[str]) -> pd.DataFrame:
        valid_cols = [c for c in group_by if c in df.columns]
        if valid_cols:
            df = df.groupby(valid_cols).size().reset_index(name="count")
        return df

    def _apply_sort(self, df: pd.DataFrame, sort_by: list[SortColumn]) -> pd.DataFrame:
        valid_sorts = [(s.column, s.direction.value == "desc") for s in sort_by if s.column in df.columns]
        if valid_sorts:
            columns = [s[0] for s in valid_sorts]
            ascending = [not s[1] for s in valid_sorts]
            df = df.sort_values(columns, ascending=ascending)
        return df


executor = QueryExecutor()
