from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.services.field_service import FieldService
from app.core.response import ApiResponse, PaginatedResponse, PaginatedData
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/fields", tags=["fields"])


@router.get("")
def search_fields(
    db: Session = Depends(get_db),
    jurisdiction: str = Query(None),
    search: str = Query(None),
    page: int = Query(1),
    pageSize: int = Query(25)
):
    service = FieldService(db)
    fields = service.search_fields(jurisdiction, search, page, pageSize)
    total = len(fields)  # Simplified
    total_pages = (total + pageSize - 1) // pageSize

    data = PaginatedData(
        items=fields,
        page=page,
        pageSize=pageSize,
        totalItems=total,
        totalPages=total_pages,
        hasNext=page < total_pages,
        hasPrevious=page > 1
    )
    return PaginatedResponse(success=True, data=data)


@router.get("/{field_id}")
def get_field(field_id: int, db: Session = Depends(get_db)):
    try:
        service = FieldService(db)
        field_360 = service.get_field_360(field_id)
        return ApiResponse(success=True, data=field_360)
    except NotFoundException as e:
        return ApiResponse(success=False, message=e.message, errors=[{"code": "NOT_FOUND", "detail": e.message}])
