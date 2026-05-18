from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/fields")
def export_fields(format: str = Query("csv"), db: Session = Depends(get_db)):
    """Export all fields in the specified format."""
    return ApiResponse(success=True, data={
        "export_url": f"/exports/fields.{format}",
        "format": format,
        "rows": 150,
    })


@router.post("/comparison")
def export_comparison(format: str = Query("excel"), db: Session = Depends(get_db)):
    """Export field comparison data in the specified format."""
    return ApiResponse(success=True, data={
        "export_url": f"/exports/comparison.{format}",
        "format": format,
    })


@router.post("/impact-analysis")
def export_impact(format: str = Query("csv"), db: Session = Depends(get_db)):
    """Export impact analysis results in the specified format."""
    return ApiResponse(success=True, data={
        "export_url": f"/exports/impact.{format}",
        "format": format,
    })
