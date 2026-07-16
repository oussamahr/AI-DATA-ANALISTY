import io
import uuid
from datetime import UTC, datetime

import numpy as np
import openpyxl
import pandas as pd
from fastapi import Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.analysis import AnalysisResult, DataProfile
from app.models.dataset import Dataset
from app.models.user import User
from app.services.analytics_service import _load_dataframe


CSV_INJECTION_PREFIXES = ("=", "+", "-", "@")


def _sanitize_csv_value(val: str) -> str:
    """Prefix dangerous leading characters to prevent CSV formula injection."""
    if isinstance(val, str) and val and val[0] in CSV_INJECTION_PREFIXES:
        return "'" + val
    return val


def _sanitize_csv_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Sanitize all string columns in a DataFrame for safe CSV export."""
    df = df.copy()
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].apply(lambda x: _sanitize_csv_value(str(x)) if pd.notna(x) else x)
    return df


class ExportService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _get_dataset(self, dataset_id: str, user: User) -> Dataset:
        result = await self.db.execute(
            select(Dataset).where(
                Dataset.id == uuid.UUID(dataset_id),
                Dataset.is_deleted == False,
            )
        )
        ds = result.scalar_one_or_none()
        if ds is None:
            raise AppException("Dataset not found", 404)
        if user.tenant_id and ds.tenant_id != user.tenant_id:
            raise AppException("Access denied", 403)
        return ds

    def _csv_response(self, buffer: io.StringIO, filename: str) -> StreamingResponse:
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    def _excel_response(self, buffer: io.BytesIO, filename: str) -> StreamingResponse:
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    def _make_profiles_df(self, profiles: list[DataProfile]) -> pd.DataFrame:
        rows = []
        for p in profiles:
            rows.append(
                {
                    "column_name": p.column_name,
                    "dtype": p.dtype,
                    "total_count": p.total_count,
                    "null_count": p.null_count,
                    "null_percent": round(p.null_count / max(p.total_count, 1) * 100, 2),
                    "unique_count": p.unique_count,
                    "unique_percent": round(p.unique_count / max(p.total_count, 1) * 100, 2),
                    "min": p.min_val or "",
                    "max": p.max_val or "",
                    "mean": p.mean if p.mean is not None else "",
                    "median": p.median if p.median is not None else "",
                    "std": p.std if p.std is not None else "",
                }
            )
        return pd.DataFrame(rows)

    async def export_profile(
        self,
        dataset_id: str,
        user: User,
        fmt: str = "xlsx",
    ) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        result = await self.db.execute(
            select(DataProfile)
            .where(DataProfile.dataset_id == ds.id)
            .order_by(DataProfile.column_name)
        )
        profiles = list(result.scalars().all())
        if not profiles:
            raise AppException("No profile data. Run profiling first.", 404)

        df = self._make_profiles_df(profiles)
        filename = f"{ds.name}_profile_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        if fmt == "csv":
            buf = io.StringIO()
            df = _sanitize_csv_dataframe(df)
            df.to_csv(buf, index=False)
            return self._csv_response(buf, f"{filename}.csv")
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="Profile", index=False)
                ws = writer.sheets["Profile"]
                ws.column_dimensions["A"].width = 20
                for i, _col in enumerate(df.select_dtypes(include=[np.number]).columns, start=1):
                    col_letter = openpyxl.utils.get_column_letter(i + 1)
                    ws.column_dimensions[col_letter].width = 14
            return self._excel_response(buf, f"{filename}.xlsx")

    async def export_correlations(
        self,
        dataset_id: str,
        user: User,
        fmt: str = "xlsx",
    ) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)

        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == ds.id,
                AnalysisResult.result_type == "correlation_matrix",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        corr_result = result.scalar_one_or_none()
        if corr_result is None:
            raise AppException("No correlation data. Run correlation analysis first.", 404)

        data = corr_result.data
        cols = data.get("numeric_columns", [])
        matrix = data.get("matrix", {}).get("values", [])
        pairs = data.get("correlations", [])

        filename = f"{ds.name}_correlations_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        if fmt == "csv":
            buf = io.StringIO()
            df_matrix = pd.DataFrame(matrix, index=cols, columns=cols)
            df_matrix = _sanitize_csv_dataframe(df_matrix)
            df_matrix.to_csv(buf)
            return self._csv_response(buf, f"{filename}.csv")
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                pairs_df = pd.DataFrame(pairs)
                pairs_df.to_excel(writer, sheet_name="Pairwise", index=False)

                df_matrix = pd.DataFrame(matrix, index=cols, columns=cols)
                df_matrix.to_excel(writer, sheet_name="Matrix")

                ws = writer.sheets["Matrix"]
                ws.column_dimensions["A"].width = 20
                for i, _col in enumerate(cols, start=2):
                    ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = 14
            return self._excel_response(buf, f"{filename}.xlsx")

    async def export_report(
        self,
        dataset_id: str,
        user: User,
        fmt: str = "xlsx",
    ) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)

        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == ds.id,
                AnalysisResult.result_type == "report",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        report_result = result.scalar_one_or_none()
        if report_result is None:
            raise AppException("No report found. Run comprehensive analysis first.", 404)

        sections = report_result.data.get("sections", [])
        filename = f"{ds.name}_report_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        if fmt == "csv":
            buf = io.StringIO()
            buf.write(f"Report: {ds.name}\nGenerated: {report_result.created_at}\n\n")
            for section in sections:
                buf.write(f"\n--- {section['title']} ---\n")
                content = section["content"]
                if isinstance(content, list) and content:
                    _sanitize_csv_dataframe(pd.DataFrame(content)).to_csv(buf, index=False)
                elif isinstance(content, str):
                    buf.write(content + "\n")
            return self._csv_response(buf, f"{filename}.csv")
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                for section in sections:
                    sheet_name = section["title"][:31]
                    content = section["content"]
                    if isinstance(content, list) and content:
                        pd.DataFrame(content).to_excel(writer, sheet_name=sheet_name, index=False)
                    elif isinstance(content, dict):
                        pd.DataFrame([content]).to_excel(writer, sheet_name=sheet_name, index=False)
            return self._excel_response(buf, f"{filename}.xlsx")

    async def export_insights(
        self,
        dataset_id: str,
        user: User,
        fmt: str = "xlsx",
    ) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)

        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == ds.id,
                AnalysisResult.result_type == "ai_insight",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        insight_result = result.scalar_one_or_none()
        if insight_result is None:
            raise AppException("No AI insights found. Generate them first.", 404)

        data = insight_result.data
        filename = f"{ds.name}_insights_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        if fmt == "csv":
            buf = io.StringIO()
            buf.write(f"AI Insights: {data.get('dataset_name', ds.name)}\n")
            buf.write(f"Summary: {data.get('summary', '')}\n\n")
            if data.get("insights"):
                _sanitize_csv_dataframe(pd.DataFrame(data["insights"])).to_csv(buf, index=False)
            return self._csv_response(buf, f"{filename}.csv")
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                summary_df = pd.DataFrame(
                    [
                        {
                            "dataset": data.get("dataset_name", ds.name),
                            "summary": data.get("summary", ""),
                        }
                    ]
                )
                summary_df.to_excel(writer, sheet_name="Summary", index=False)

                if data.get("insights"):
                    pd.DataFrame(data["insights"]).to_excel(
                        writer,
                        sheet_name="Insights",
                        index=False,
                    )

                if data.get("metadata"):
                    meta = data["metadata"]
                    meta_df = pd.DataFrame(
                        {
                            "metric": list(meta.keys()),
                            "value": [str(v) for v in meta.values()],
                        }
                    )
                    meta_df.to_excel(writer, sheet_name="Metadata", index=False)
            return self._excel_response(buf, f"{filename}.xlsx")

    async def export_dataset(
        self,
        dataset_id: str,
        user: User,
        fmt: str = "csv",
    ) -> StreamingResponse:
        ds = await self._get_dataset(dataset_id, user)
        df = _load_dataframe(ds.file_path)

        filename = f"{ds.name}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"

        if fmt == "csv":
            buf = io.StringIO()
            df = _sanitize_csv_dataframe(df)
            df.to_csv(buf, index=False)
            return self._csv_response(buf, f"{filename}.csv")
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="Data", index=False)
            return self._excel_response(buf, f"{filename}.xlsx")
