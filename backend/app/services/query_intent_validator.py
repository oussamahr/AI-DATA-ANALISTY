import re

from fastapi import HTTPException, status

from app.schemas.query_intent import (
    FilterCondition,
    FilterOperator,
    QueryIntent,
    QueryType,
)


class QueryIntentValidator:
    FORBIDDEN_KEYWORDS = {
        "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "EXEC",
        "TRUNCATE", "GRANT", "REVOKE",
    }
    
    FORBIDDEN_PATTERNS = [
        re.compile(r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC)", re.IGNORECASE),
        re.compile(r"'\s*OR\s*'1'\s*=\s*'1", re.IGNORECASE),
        re.compile(r"'\s*OR\s*1\s*=\s*1", re.IGNORECASE),
        re.compile(r"UNION\s+SELECT", re.IGNORECASE),
        re.compile(r"--\s*$", re.MULTILINE),
    ]

    def validate(self, intent: QueryIntent) -> list[str]:
        warnings = []
        
        self._validate_query_type(intent, warnings)
        self._validate_columns(intent, warnings)
        self._validate_filters(intent, warnings)
        self._validate_limit(intent, warnings)
        self._validate_raw_query(intent)
        
        return warnings

    def _validate_query_type(self, intent: QueryIntent, warnings: list[str]):
        if intent.query_type == QueryType.JOIN and not intent.join_dataset_id:
            warnings.append("Join query specified but no join dataset ID provided")
        
        if intent.query_type == QueryType.AGGREGATE and not intent.aggregates:
            warnings.append("Aggregate query specified but no aggregate functions defined")

    def _validate_columns(self, intent: QueryIntent, warnings: list[str]):
        for col in intent.columns:
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", col):
                warnings.append(f"Column name '{col}' may contain special characters")
        
        for col in intent.group_by:
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", col):
                warnings.append(f"Group by column '{col}' may contain special characters")

    def _validate_filters(self, intent: QueryIntent, warnings: list[str]):
        for filter_cond in intent.filters:
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", filter_cond.column):
                warnings.append(f"Filter column '{filter_cond.column}' may contain special characters")
            
            if filter_cond.operator in {FilterOperator.IN, FilterOperator.NOT_IN}:
                if not isinstance(filter_cond.value, list):
                    warnings.append(f"Filter operator '{filter_cond.operator.value}' expects a list value")

    def _validate_limit(self, intent: QueryIntent, warnings: list[str]):
        if intent.limit is not None and intent.limit > 10000:
            warnings.append("Large limit specified. Consider using pagination.")
            intent.limit = 10000

    def _validate_raw_query(self, intent: QueryIntent):
        if intent.raw_query:
            for keyword in self.FORBIDDEN_KEYWORDS:
                if re.search(rf"\b{keyword}\b", intent.raw_query, re.IGNORECASE):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Forbidden SQL keyword: {keyword}",
                    )
            
            for pattern in self.FORBIDDEN_PATTERNS:
                if pattern.search(intent.raw_query):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Query contains potentially dangerous SQL patterns",
                    )


validator = QueryIntentValidator()
