from fastapi import APIRouter
from app.api.routes import (
    health_routes,
    auth_routes,
    lookup_routes,
    field_routes,
    lineage_routes,
    impact_routes,
    comparison_routes,
    graph_routes,
    jurisdiction_routes,
    export_routes
)

router = APIRouter()
router.include_router(health_routes.router)
router.include_router(auth_routes.router)
router.include_router(lookup_routes.router)
router.include_router(field_routes.router)
router.include_router(lineage_routes.router)
router.include_router(impact_routes.router)
router.include_router(comparison_routes.router)
router.include_router(graph_routes.router)
router.include_router(jurisdiction_routes.router)
router.include_router(export_routes.router)
