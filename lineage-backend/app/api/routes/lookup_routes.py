from fastapi import APIRouter
from app.core.response import ApiResponse

router = APIRouter(prefix="/lookups", tags=["lookups"])


@router.get("/jurisdictions")
def get_jurisdictions():
    jurisdictions = [
        {"code": "JFSA", "name": "Japan FSA"},
        {"code": "MAS", "name": "Monetary Authority Singapore"},
        {"code": "ASIC", "name": "Australian Securities"},
        {"code": "HKMA", "name": "Hong Kong"},
    ]
    return ApiResponse(success=True, data=jurisdictions)


@router.get("/criticalities")
def get_criticalities():
    return ApiResponse(success=True, data=["LOW", "MEDIUM", "HIGH", "CRITICAL"])


@router.get("/statuses")
def get_statuses():
    return ApiResponse(success=True, data=["DRAFT", "APPROVED", "DEPRECATED"])


@router.get("/source-types")
def get_source_types():
    return ApiResponse(success=True, data=["XSLT", "JAVA", "DATABASE", "API"])


@router.get("/node-types")
def get_node_types():
    return ApiResponse(success=True, data=["Field", "XsltVariable", "JavaMethod", "XPath", "DownstreamSystem"])
