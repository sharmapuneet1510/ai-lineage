from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/impact-analysis", tags=["impact"])


@router.post("/run")
def run_impact_analysis(
    source_type: str = Query(...),
    source_value: str = Query(...),
    db: Session = Depends(get_db)
):
    return ApiResponse(
        success=True,
        data={
            "source_type": source_type,
            "source_value": source_value,
            "impacted_fields": [],
            "impact_depth": 0
        }
    )


@router.get("/fields/{field_id}")
def field_impact(field_id: int, db: Session = Depends(get_db)):
    return ApiResponse(
        success=True,
        data={"field_id": field_id, "direct_impact": [], "indirect_impact": []}
    )
