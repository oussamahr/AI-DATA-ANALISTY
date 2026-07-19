import json
import warnings

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.core.dependencies import get_current_user
from app.core.security.audit import audit_logger
from app.core.security.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.llm import LLMQueryHistoryItem, LLMQueryRequest, LLMQueryResponse
from app.services.llm_service import LLMService

router = APIRouter()


def deprecated_response(message: str = "This endpoint is deprecated. Use /api/v1/ai/chat/{dataset_id} instead.") -> JSONResponse:
    """Return a deprecation response with warning header."""
    return JSONResponse(
        status_code=200,
        content={"message": message, "deprecated": True},
        headers={"Deprecation": "true", "Link": '</api/v1/ai/chat/{dataset_id}>; rel="successor-version"'}
    )


@router.post("/query", response_model=LLMQueryResponse, deprecated=True)
async def query_llm(
    request: Request,
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(),
):
    """
    Deprecated: Use /api/v1/ai/chat/{dataset_id} instead.
    
    This endpoint is maintained for backward compatibility but will be removed in a future version.
    """
    warnings.warn(
        "The /api/v1/llm/query endpoint is deprecated. Use /api/v1/ai/chat/{dataset_id} instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=400, detail="Request body is empty")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = raw.decode("utf-8", errors="replace").strip()
    if isinstance(parsed, str):
        data = LLMQueryRequest(prompt=parsed)
    elif isinstance(parsed, dict):
        data = LLMQueryRequest(**parsed)
    else:
        raise HTTPException(status_code=400, detail="Request body must be a JSON object or string")
    
    await rate_limit_dependency("30/minute", "llm_query", request)
    result = await llm_service.query(
        prompt=data.prompt,
        user=current_user,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        dataset_id=str(data.dataset_id) if data.dataset_id else None,
    )
    await audit_logger.log(
        "LLM_QUERY",
        "llm_query",
        str(result.id),
        str(current_user.id),
        str(current_user.tenant_id) if current_user.tenant_id else None,
        details={
            "success": result.success,
            "tokens": result.tokens_prompt + result.tokens_completion,
        },
    )
    return result


@router.get("/history", response_model=list[LLMQueryHistoryItem], deprecated=True)
async def query_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(),
):
    """
    Deprecated: Use /api/v1/ai/chat/conversations/{dataset_id} instead.
    
    This endpoint is maintained for backward compatibility but will be removed in a future version.
    """
    warnings.warn(
        "The /api/v1/llm/history endpoint is deprecated. Use /api/v1/ai/chat/conversations/{dataset_id} instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    results = await llm_service.get_history(str(current_user.id), limit, offset)
    return [
        LLMQueryHistoryItem(
            id=r.id,
            prompt=r.prompt,
            response=r.response,
            model=r.model,
            success=r.success,
            created_at=r.created_at,
        )
        for r in results
    ]
