from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.core.security.audit import audit_logger
from app.models.user import User
from app.schemas.analytics import TaskResponse
from app.schemas.dataset import DatasetResponse
from app.schemas.transform import (
    ApplyTransformsRequest,
    CastConfig,
    DropConfig,
    EncodeConfig,
    FilterConfig,
    ImputeConfig,
    NormalizeConfig,
    OutlierConfig,
    RenameConfig,
    TransformResponse,
)
from app.schemas.user import MessageResponse
from app.services.transform_service import TransformService

router = APIRouter()


@router.post("/impute", response_model=TransformResponse, status_code=201)
async def impute_missing(
    data: ImputeConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "impute", data.model_dump(), current_user, name)
    await audit_logger.create("transform", str(t.id), str(current_user.id))
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/remove-outliers", response_model=TransformResponse, status_code=201)
async def remove_outliers(
    data: OutlierConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(
        dataset_id, "remove_outliers", data.model_dump(), current_user, name
    )
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/cast", response_model=TransformResponse, status_code=201)
async def cast_column(
    data: CastConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "cast", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/filter", response_model=TransformResponse, status_code=201)
async def filter_rows(
    data: FilterConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "filter", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/rename", response_model=TransformResponse, status_code=201)
async def rename_column(
    data: RenameConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "rename", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/drop", response_model=TransformResponse, status_code=201)
async def drop_columns(
    data: DropConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "drop", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/normalize", response_model=TransformResponse, status_code=201)
async def normalize_column(
    data: NormalizeConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "normalize", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/encode", response_model=TransformResponse, status_code=201)
async def encode_column(
    data: EncodeConfig,
    dataset_id: str = Query(...),
    name: str = Query(""),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    t = await service.add_transform(dataset_id, "encode", data.model_dump(), current_user, name)
    return TransformResponse(
        id=t.id,
        dataset_id=t.dataset_id,
        transform_type=t.transform_type,
        name=t.name,
        config=t.config,
        applied_order=t.applied_order,
        created_at=t.created_at,
    )


@router.post("/apply", response_model=DatasetResponse | TaskResponse, status_code=201)
async def apply_transforms(
    data: ApplyTransformsRequest,
    async_mode: bool = Query(False, alias="async"),
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    if async_mode:
        from app.tasks.transform_tasks import apply_transforms_task

        apply_transforms_task.delay(str(data.dataset_id), str(current_user.id), data.output_name)
        return TaskResponse(
            run_id=data.dataset_id,
            status="pending",
            message="Transform apply task queued",
        )

    ds = await service.apply_transforms(str(data.dataset_id), current_user, data.output_name)
    await audit_logger.create("cleaned_dataset", str(ds.id), str(current_user.id))
    return ds


@router.get("/{dataset_id}", response_model=list[TransformResponse])
async def list_transforms(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    transforms = await service.list_transforms(dataset_id, current_user)
    return [
        TransformResponse(
            id=t.id,
            dataset_id=t.dataset_id,
            transform_type=t.transform_type,
            name=t.name,
            config=t.config,
            applied_order=t.applied_order,
            created_at=t.created_at,
        )
        for t in transforms
    ]


@router.delete("/{transform_id}")
async def delete_transform(
    transform_id: str,
    current_user: User = Depends(get_current_user),
    service: TransformService = Depends(),
):
    await service.delete_transform(transform_id, current_user)
    return MessageResponse(message="Transform deleted")
