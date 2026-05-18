from fastapi import APIRouter
from app.db import check_mssql_connection, check_neo4j_connection
from app.core.response import ApiResponse

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    return ApiResponse(success=True, data={"status": "ok"}, message="API is healthy")

@router.get("/health/dependencies")
def health_dependencies():
    mssql_ok = check_mssql_connection()
    neo4j_ok = check_neo4j_connection()
    if mssql_ok and neo4j_ok:
        status, success = "healthy", True
    else:
        status = "degraded" if (mssql_ok or neo4j_ok) else "unhealthy"
        success = mssql_ok and neo4j_ok
    return ApiResponse(success=success, data={
        "status": status,
        "mssql": "ok" if mssql_ok else "fail",
        "neo4j": "ok" if neo4j_ok else "fail"
    })
