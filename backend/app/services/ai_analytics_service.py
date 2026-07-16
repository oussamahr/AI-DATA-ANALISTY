import json
import uuid
from datetime import UTC, datetime

import numpy as np
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security.exceptions import AppException
from app.models.analysis import AnalysisResult, AnalysisRun
from app.models.dataset import Dataset
from app.models.user import User
from app.services.analytics_service import _load_dataframe

SYSTEM_PROMPT = """You are a data analyst AI. Given dataset metadata and a sample of rows, provide structured insights.
Focus on:
1. Data quality issues (missing values, outliers, inconsistencies)
2. Key patterns and trends
3. Correlations and relationships between columns
4. Business implications and actionable recommendations

Return your response as a JSON object with this exact structure:
{
  "summary": "2-3 sentence overview of the dataset",
  "insights": [
    {
      "type": "data_quality|pattern|correlation|outlier|recommendation",
      "severity": "high|medium|low",
      "title": "Short title",
      "description": "Detailed explanation",
      "details": {"key": "value"},
      "recommendation": "Actionable suggestion or null"
    }
  ]
}
"""


class AIAnalyticsService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def generate_insights(
        self,
        dataset_id: str,
        user: User,
        max_sample_rows: int = 100,
    ) -> AnalysisResult:
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

        run = AnalysisRun(
            id=uuid.uuid4(),
            dataset_id=ds.id,
            user_id=user.id,
            analysis_type="ai_insight",
            status="running",
        )
        self.db.add(run)
        await self.db.flush()

        try:
            df = _load_dataframe(ds.file_path)
            sample = df.head(max_sample_rows)
            dtypes = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
            null_counts = {str(col): int(df[col].isna().sum()) for col in df.columns}
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

            stats = {}
            for col in numeric_cols:
                stats[str(col)] = {
                    "min": float(df[col].min()) if not df[col].isna().all() else None,
                    "max": float(df[col].max()) if not df[col].isna().all() else None,
                    "mean": float(df[col].mean()) if not df[col].isna().all() else None,
                }

            metadata = {
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns),
                "dtypes": dtypes,
                "null_counts": null_counts,
                "numeric_stats": stats,
            }

            sample_json = json.loads(sample.to_json(orient="records", date_format="iso"))

            context = json.dumps(
                {
                    "metadata": metadata,
                    "sample_rows": sample_json,
                },
                default=str,
            )

            import openai

            client = openai.AsyncOpenAI(api_key=settings.LLM_API_KEY)

            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze this dataset:\n\n{context}"},
                ],
                response_format={"type": "json_object"},
                max_tokens=settings.LLM_MAX_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
            )

            content = response.choices[0].message.content or "{}"
            try:
                insight_data = json.loads(content)
            except json.JSONDecodeError:
                insight_data = {
                    "summary": "AI analysis completed",
                    "insights": [
                        {
                            "type": "pattern",
                            "severity": "low",
                            "title": "Raw analysis",
                            "description": content,
                        }
                    ],
                }

            result_data = {
                "dataset_id": str(ds.id),
                "dataset_name": ds.name,
                "summary": insight_data.get("summary", ""),
                "insights": insight_data.get("insights", []),
                "metadata": metadata,
            }

            analysis_result = AnalysisResult(
                id=uuid.uuid4(),
                analysis_run_id=run.id,
                dataset_id=ds.id,
                result_type="ai_insight",
                data=result_data,
                metadata={"model": settings.LLM_MODEL, "sample_rows": max_sample_rows},
            )
            self.db.add(analysis_result)

            run.status = "completed"
            run.completed_at = datetime.now(UTC)
            await self.db.flush()
            return analysis_result

        except Exception as e:
            run.status = "failed"
            run.completed_at = datetime.now(UTC)
            run.error_message = str(e)
            await self.db.flush()
            raise AppException(f"AI insight generation failed: {str(e)}") from e

    async def get_insights(self, dataset_id: str, user: User) -> AnalysisResult | None:
        result = await self.db.execute(
            select(AnalysisResult)
            .where(
                AnalysisResult.dataset_id == dataset_id,
                AnalysisResult.result_type == "ai_insight",
            )
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
