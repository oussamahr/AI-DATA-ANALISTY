import re

import pandas as pd

REDACTED = "[REDACTED]"

PII_PATTERNS = {
    "email": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "phone": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
    "ssn": re.compile(r"\b\d{3}[-]?\d{2}[-]?\d{4}\b"),
    "credit_card": re.compile(r"\b\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}\b"),
    "ip_address": re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"),
}

PII_COLUMN_HINTS = {
    "email", "e-mail", "mail", "phone", "tel", "mobile", "cell",
    "ssn", "social_security", "sin", "nin", "passport",
    "credit_card", "card_number", "cc_number", "pan",
    "address", "street", "city", "state", "zip", "postal",
    "birth", "dob", "date_of_birth",
    "password", "secret", "token", "api_key", "apikey",
}

SENSITIVE_VALUE_PATTERNS = [
    re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
    re.compile(r"^\d{3}[-.]?\d{3}[-.]?\d{4}$"),
    re.compile(r"^\d{3}[-]?\d{2}[-]?\d{4}$"),
    re.compile(r"^\d{4}[-]?\d{4}[-]?\d{4}[-]?\d{4}$"),
]


class PostQueryRedactor:
    def __init__(self, redact_pii: bool = True, redact_patterns: bool = True):
        self.redact_pii = redact_pii
        self.redact_patterns = redact_patterns

    def redact_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        
        df = df.copy()
        
        if self.redact_pii:
            df = self._redact_pii_columns(df)
        
        if self.redact_patterns:
            df = self._redact_pii_values(df)
        
        return df

    def _redact_pii_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        columns_to_redact = []
        
        for col in df.columns:
            col_lower = col.lower().replace(" ", "_").replace("-", "_")
            for hint in PII_COLUMN_HINTS:
                if hint in col_lower:
                    columns_to_redact.append(col)
                    break
        
        for col in columns_to_redact:
            df[col] = REDACTED
        
        return df

    def _redact_pii_values(self, df: pd.DataFrame) -> pd.DataFrame:
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].apply(self._redact_string_value)
        
        return df

    def _redact_string_value(self, value):
        if not isinstance(value, str):
            return value
        
        for pattern in SENSITIVE_VALUE_PATTERNS:
            if pattern.match(value):
                return REDACTED
        
        return value

    def redact_text(self, text: str) -> str:
        if not self.redact_patterns:
            return text
        
        for pii_type, pattern in PII_PATTERNS.items():
            text = pattern.sub(REDACTED, text)
        
        return text


redactor = PostQueryRedactor()
