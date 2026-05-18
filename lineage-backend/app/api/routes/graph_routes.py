from fastapi import APIRouter, Depends
from app.api.dependencies import get_graph
from app.core.response import ApiResponse

router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/search")
def search_graph_nodes(db=Depends(get_graph)):
    return ApiResponse(success=True, data={"nodes": []})


@router.get("/node/{node_id}")
def get_graph_node(node_id: str, db=Depends(get_graph)):
    return ApiResponse(success=True, data={"node": None})


@router.post("/path")
def find_path(db=Depends(get_graph)):
    return ApiResponse(success=True, data={"path": []})
