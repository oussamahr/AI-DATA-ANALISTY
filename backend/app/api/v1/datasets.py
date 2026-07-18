import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.core.dependencies import get_current_user
from app.core.security.audit import audit_logger
from app.core.security.validators import (
    validate_file_extension,
    validate_file_size,
    validate_magic_bytes,
    validate_no_html,
    validate_no_sql_injection,
)
from app.models.user import User
from app.schemas.dataset import DatasetListResponse, DatasetResponse
from app.services.dataset_service import DatasetService

router = APIRouter()


@router.post("/upload", response_model=DatasetResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    current_user: User = Depends(get_current_user),
    dataset_service: DatasetService = Depends(),
):
    validate_no_sql_injection(name)
    validate_no_html(name)
    if description:
        validate_no_sql_injection(description)
        validate_no_html(description)
    
    validate_file_extension(file.filename)
    validate_file_size(file)
    ext = os.path.splitext(file.filename)[1].lower()
    await validate_magic_bytes(file, ext)
    
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a tenant",
        )
    dataset = await dataset_service.upload(file, name, description, current_user, str(tenant_id))
    await audit_logger.create("dataset", str(dataset.id), str(current_user.id), str(tenant_id))
    return dataset


@router.get("", response_model=DatasetListResponse)
async def list_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    dataset_service: DatasetService = Depends(),
):
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to a tenant")
    items, total = await dataset_service.list_datasets(str(tenant_id), page, page_size)
    return DatasetListResponse(
        items=[DatasetResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    dataset_service: DatasetService = Depends(),
):
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="User must belong to a tenant")
    dataset = await dataset_service.get_dataset(dataset_id, str(tenant_id))
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    await audit_logger.read("dataset", dataset_id, str(current_user.id), str(tenant_id))
    return dataset
