from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/jurisdictions", tags=["jurisdictions"])


@router.get("")
def list_jurisdictions(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[])


@router.get("/{jurisdiction_code}")
def get_jurisdiction(jurisdiction_code: str, db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={})
