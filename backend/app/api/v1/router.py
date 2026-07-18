from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    ai_analytics,
    auth,
    charts,
    datasets,
    db_connections,
    exports,
    health,
    llm,
    roles,
    tenants,
    transforms,
    visualizations,
)

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
router.include_router(llm.router, prefix="/llm", tags=["llm"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
router.include_router(roles.router, prefix="/roles", tags=["roles"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(ai_analytics.router, prefix="/ai", tags=["ai-analytics"])
router.include_router(transforms.router, prefix="/transforms", tags=["transforms"])
router.include_router(visualizations.router, prefix="/visualizations", tags=["visualizations"])
router.include_router(exports.router, prefix="/exports", tags=["exports"])
router.include_router(charts.router, prefix="/charts", tags=["charts"])
router.include_router(db_connections.router, prefix="/db-connections", tags=["db-connections"])
