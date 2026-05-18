from fastapi import APIRouter
from app.api.routes import health_routes

router = APIRouter()
router.include_router(health_routes.router)
