import json
import uuid
from pathlib import Path

import aiofiles
import pandas as pd
from fastapi import Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security.scanner import scanner
from app.core.security.validators import validate_file_extension, validate_file_size
from app.core.storage.s3 import s3_storage
from app.services.data_loader import MAX_DATASET_ROWS
from app.models.dataset import Dataset
from app.models.tenant import Tenant
from app.models.user import User


class DatasetService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _check_storage_quota(self, tenant_id: str, file_size: int):
        tenant = await self.db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found",
            )

        current_usage = await self.db.scalar(
            select(func.coalesce(func.sum(Dataset.file_size_bytes), 0)).where(
                Dataset.tenant_id == uuid.UUID(tenant_id),
                Dataset.is_deleted == False,
            )
        )

        if current_usage + file_size > tenant.storage_quota_bytes:
            quota_mb = tenant.storage_quota_bytes // (1024 * 1024)
            used_mb = current_usage // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Storage quota exceeded. Used: {used_mb}MB / {quota_mb}MB",
            )

    async def _extract_metadata(self, content: bytes, ext: str) -> tuple[int, list[dict]]:
        try:
            if ext == ".csv":
                df = pd.read_csv(pd.io.common.BytesIO(content), nrows=0)
            elif ext == ".tsv":
                df = pd.read_csv(pd.io.common.BytesIO(content), sep="\t", nrows=0)
            elif ext in {".xlsx", ".xls"}:
                df = pd.read_excel(pd.io.common.BytesIO(content), nrows=0)
            elif ext == ".json":
                df = pd.read_json(pd.io.common.BytesIO(content))
            elif ext == ".parquet":
                df = pd.read_parquet(pd.io.common.BytesIO(content))
            elif ext == ".feather":
                df = pd.read_feather(pd.io.common.BytesIO(content))
            else:
                return 0, []

            full_df = pd.read_csv(pd.io.common.BytesIO(content)) if ext in {".csv", ".tsv"} else df
            row_count = len(full_df)
            
            columns = [
                {
                    "name": col,
                    "dtype": str(df[col].dtype),
                    "nullable": bool(df[col].isnull().any()),
                }
                for col in df.columns
            ]
            
            return row_count, columns
        except Exception:
            return 0, []

    async def upload(
        self,
        file: UploadFile,
        name: str,
        description: str,
        owner: User,
        tenant_id: str,
    ) -> Dataset:
        validate_file_extension(file.filename or "")
        validate_file_size(file)

        content = await file.read()
        await file.seek(0)
        
        await self._check_storage_quota(tenant_id, len(content))
        
        is_clean, virus_info = await scanner.scan_stream(file)
        if not is_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=virus_info or "File failed security scan",
            )

        file_id = uuid.uuid4()
        ext = Path(file.filename or "upload").suffix
        key = f"{file_id}{ext}"

        if settings.STORAGE_BACKEND == "s3":
            await s3_storage.upload_file(
                file, tenant_id, key, file.content_type or "application/octet-stream"
            )
            file_path = f"s3://{s3_storage._get_bucket_name(tenant_id)}/{key}"
        else:
            upload_dir = Path(settings.STORAGE_PATH) / str(tenant_id)
            upload_dir.mkdir(parents=True, exist_ok=True)
            stored_path = upload_dir / f"{file_id}{ext}"
            
            async with aiofiles.open(stored_path, "wb") as f:
                await f.write(content)
            file_path = str(stored_path)

        row_count, column_defs = await self._extract_metadata(content, ext)
        if row_count > MAX_DATASET_ROWS:
            raise HTTPException(status_code=413, detail=f"Dataset has {row_count:,} rows, exceeding max of {MAX_DATASET_ROWS:,}.")

        dataset = Dataset(
            id=file_id,
            name=name,
            description=description,
            file_path=file_path,
            file_size_bytes=len(content),
            mime_type=file.content_type or "application/octet-stream",
            owner_id=owner.id,
            tenant_id=uuid.UUID(tenant_id),
            row_count=row_count,
            column_definitions=json.dumps(column_defs) if column_defs else "{}",
        )
        self.db.add(dataset)
        await self.db.flush()
        return dataset

    async def list_datasets(
        self,
        tenant_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Dataset], int]:
        query = (
            select(Dataset)
            .where(Dataset.tenant_id == uuid.UUID(tenant_id), Dataset.is_deleted == False)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .order_by(Dataset.created_at.desc())
        )
        count_query = (
            select(func.count())
            .select_from(Dataset)
            .where(Dataset.tenant_id == uuid.UUID(tenant_id), Dataset.is_deleted == False)
        )

        result = await self.db.execute(query)
        total = await self.db.scalar(count_query)
        return list(result.scalars().all()), total or 0

    async def get_dataset(self, dataset_id: str, tenant_id: str) -> Dataset | None:
        result = await self.db.execute(
            select(Dataset).where(
                Dataset.id == uuid.UUID(dataset_id),
                Dataset.tenant_id == uuid.UUID(tenant_id),
                Dataset.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()
