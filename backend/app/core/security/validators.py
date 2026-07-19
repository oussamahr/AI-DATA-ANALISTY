import os
import re

from fastapi import HTTPException, UploadFile, status

ALLOWED_DATASET_EXTENSIONS = frozenset(
    {
        ".csv",
        ".tsv",
        ".xlsx",
        ".xls",
        ".json",
        ".parquet",
        ".feather",
    }
)

MAGIC_BYTES = {
    ".csv": [],
    ".tsv": [],
    ".xlsx": [b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"],
    ".xls": [b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"],
    ".json": [b"{", b"["],
    ".parquet": [b"PAR1"],
    ".feather": [],
}

SQL_INJECTION_PATTERNS = [
    re.compile(r"'\\s*OR\\s*'1'\\s*=\\s*'1", re.IGNORECASE),
    re.compile(r"'\\s*OR\\s*1\\s*=\\s*1", re.IGNORECASE),
    re.compile(r"'\\s*--"),
    re.compile(r"'\\s*#"),
    re.compile(r"'\\s*;\\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC)", re.IGNORECASE),
    re.compile(r"'\\s*UNION\\s+SELECT", re.IGNORECASE),
]

# CSV Injection prevention - cells starting with these characters can be interpreted as formulas
CSV_INJECTION_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

def sanitize_filename(filename: str) -> str:
    filename = re.sub(r'[<>:\"/\\\\|?*]', "_", filename)
    filename = re.sub(r"\.{2,}", ".", filename)
    filename = filename.strip(". ")
    return filename or "unnamed"

def validate_file_extension(filename: str, allowed: frozenset = ALLOWED_DATASET_EXTENSIONS):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(sorted(allowed))}",
        )

def validate_file_size(file: UploadFile, max_mb: int = 100):
    max_bytes = max_mb * 1024 * 1024
    contents = file.file.read(max_bytes + 1)
    file.file.seek(0)
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {max_mb}MB limit",
        )

def validate_no_sql_injection(value: str):
    for pattern in SQL_INJECTION_PATTERNS:
        if pattern.search(value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input contains potentially dangerous SQL patterns",
            )

def validate_no_html(value: str):
    if re.search(r"<[^>]*>", value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HTML tags are not allowed",
        )

def sanitize_csv_value(value: str) -> str:
    """
    Sanitize a value to prevent CSV injection.
    Prepends a single quote to values that start with formula prefixes.
    """
    if not isinstance(value, str):
        value = str(value) if value is not None else ""
    
    # Strip leading/trailing whitespace
    value = value.strip()
    
    # Check if value starts with a CSV injection prefix
    if value and value[0] in CSV_INJECTION_PREFIXES:
        # Prepend a single quote to neutralize the formula
        # This is the standard mitigation - the quote won't display in most spreadsheet apps
        # but will prevent formula execution
        value = "'" + value
    
    return value

def sanitize_csv_row(row: dict[str, any]) -> dict[str, any]:
    """Sanitize all string values in a CSV row to prevent formula injection."""
    sanitized = {}
    for key, value in row.items():
        if isinstance(value, str):
            sanitized[key] = sanitize_csv_value(value)
        else:
            sanitized[key] = value
    return sanitized

def sanitize_csv_data(data: list[dict[str, any]]) -> list[dict[str, any]]:
    """Sanitize a list of CSV rows (list of dicts) to prevent formula injection."""
    return [sanitize_csv_row(row) for row in data]

async def validate_magic_bytes(file: UploadFile, expected_ext: str):
    if expected_ext not in MAGIC_BYTES:
        return
    
    expected_signatures = MAGIC_BYTES[expected_ext]
    if not expected_signatures:
        return
    
    header = await file.read(8)
    await file.seek(0)
    
    matches = any(header.startswith(sig) for sig in expected_signatures)
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match '{expected_ext}' format",
        )