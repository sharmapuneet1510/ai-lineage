from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={
        "total_jurisdictions": 3,
        "total_fields": 150,
        "fields_with_lineage": 120,
        "fields_missing_business_interpretation": 15,
        "fields_missing_technical_interpretation": 10,
        "high_risk_fields": 5,
    })

@router.get("/lineage-coverage")
def get_lineage_coverage(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[
        {"jurisdiction": "JFSA", "coverage": 85},
        {"jurisdiction": "MAS", "coverage": 75},
        {"jurisdiction": "ASIC", "coverage": 60},
    ])

@router.get("/high-risk-fields")
def get_high_risk_fields(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[
        {"field_id": 1, "field_name": "TRADE_ID", "risk_score": 9.5},
    ])

@router.get("/recent-changes")
def get_recent_changes(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[])

@router.get("/top-impacted-dependencies")
def get_top_dependencies(db: Session = Depends(get_db)):
    return ApiResponse(success=True, data=[])
