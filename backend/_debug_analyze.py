import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from datetime import UTC, datetime

from app.schemas.analytics import AnalysisReport, ColumnProfile, ReportSection

sections_json = """[{"title": "Column Profiles", "content": [{"column_name": "name", "dtype": "categorical", "null_count": 0, "total_count": 5, "null_percent": 0.0, "unique_count": 5, "mean": null, "median": null, "std": null, "min": "Alice", "max": "Eve", "top_values": [{"value": "Alice", "count": 1, "percent": 20.0}, {"value": "Bob", "count": 1, "percent": 20.0}, {"value": "Charlie", "count": 1, "percent": 20.0}, {"value": "Diana", "count": 1, "percent": 20.0}, {"value": "Eve", "count": 1, "percent": 20.0}], "histogram": []}], "type": "profiles"}, {"title": "Correlations", "content": [{"column_1": "age", "column_2": "salary", "correlation": 0.9935}], "type": "correlations"}]"""

data = {
    "dataset_id": "cec2a5b8-d004-4e25-905f-727b8a34e128",
    "dataset_name": "Test Dataset",
    "row_count": 5,
    "column_count": 7,
    "sections": json.loads(sections_json),
}

profiles = []
correlations = None
for s in data["sections"]:
    if s["type"] == "profiles":
        profiles = [ColumnProfile(**c) for c in s["content"]]
    elif s["type"] == "correlations":
        correlations = s["content"]

try:
    report = AnalysisReport(
        dataset_id=data["dataset_id"],
        dataset_name=data["dataset_name"],
        row_count=data["row_count"],
        column_count=data["column_count"],
        generated_at=datetime.now(UTC),
        profile=profiles,
        correlations=correlations,
        sections=[ReportSection(**s) for s in data["sections"]],
    )
    print("OK")
except Exception as e:
    print("Error:", type(e).__name__, e)
