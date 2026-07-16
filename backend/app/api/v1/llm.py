from fastapi import APIRouter, Depends, Query, Request

from app.core.dependencies import get_current_user, require_verified
from app.core.security.audit import audit_logger
from app.core.security.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.llm import LLMQueryHistoryItem, LLMQueryRequest, LLMQueryResponse
from app.services.llm_service import LLMService

router = APIRouter()


@router.post("/query", response_model=LLMQueryResponse)
async def query_llm(
    data: LLMQueryRequest,
    request: Request,
    current_user: User = Depends(require_verified),
    llm_service: LLMService = Depends(),
):
    await rate_limit_dependency("30/minute", "llm_query", request)
    result = await llm_service.query(
        prompt=data.prompt,
        user=current_user,
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
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


@router.get("/history", response_model=list[LLMQueryHistoryItem])
async def query_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(),
):
    results = await llm_service.get_history(str(current_user.id), limit, offset)
    return [
        LLMQueryHistoryItem(
            id=r.id,
            prompt_redacted=r.prompt[:200],
            model=r.model,
            success=r.success,
            created_at=r.created_at,
        )
        for r in results
    ]
