from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.services.access_service import AccessService
from app.models.access_models import CurrentUserResponse
from app.core.response import ApiResponse
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_current_user(db: Session = Depends(get_db), x_user: str = Header(default="puneet.sharma")):
    try:
        access_service = AccessService(db)
        access_info = access_service.get_current_user_access(x_user)
        return ApiResponse(success=True, data=access_info)
    except NotFoundException as e:
        return ApiResponse(success=False, message=e.message, errors=[{"code": "NOT_FOUND", "detail": e.message}])
