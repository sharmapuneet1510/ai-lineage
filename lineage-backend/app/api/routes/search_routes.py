from fastapi import APIRouter, Query
from app.core.response import ApiResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/global")
def global_search(q: str = Query(..., min_length=1)):
    """Global search across all entities (fields, variables, methods, etc.)."""
    return ApiResponse(success=True, data={
        "items": [],
        "query": q,
        "total": 0,
    })
