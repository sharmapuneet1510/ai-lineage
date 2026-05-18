from fastapi import APIRouter
from app.api.routes import health_routes, auth_routes, lookup_routes, field_routes

router = APIRouter()
router.include_router(health_routes.router)
router.include_router(auth_routes.router)
router.include_router(lookup_routes.router)
router.include_router(field_routes.router)
