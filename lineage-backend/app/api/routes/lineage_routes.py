from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.core.response import ApiResponse

router = APIRouter(prefix="/fields", tags=["lineage"])


@router.get("/{field_id}/xslt-drilldown")
def xslt_drilldown(field_id: int, db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"field_id": field_id, "xslt_variables": []})


@router.get("/{field_id}/java-drilldown")
def java_drilldown(field_id: int, db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"field_id": field_id, "java_methods": []})


@router.get("/{field_id}/downstream/systems")
def downstream_systems(field_id: int, db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"field_id": field_id, "systems": []})


@router.get("/{field_id}/used-by")
def field_used_by(field_id: int, db: Session = Depends(get_db)):
    return ApiResponse(success=True, data={"field_id": field_id, "used_by": []})
