from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/fields")
def export_fields(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"export_url": "/tmp/fields.csv"})


@router.post("/comparison")
def export_comparison(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"export_url": "/tmp/comparison.csv"})
