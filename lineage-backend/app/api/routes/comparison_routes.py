from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/comparison", tags=["comparison"])


@router.get("/business-concepts")
def get_business_concepts(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[])


@router.post("/fields")
def compare_fields(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"comparison_results": []})
