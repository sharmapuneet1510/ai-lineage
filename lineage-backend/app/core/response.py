from pydantic import BaseModel
from typing import Optional, List, Generic, TypeVar

T = TypeVar('T')


class ErrorDetail(BaseModel):
    code: str
    field: Optional[str] = None
    detail: str


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    errors: List[ErrorDetail] = []


class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int
    hasNext: bool
    hasPrevious: bool


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[PaginatedData[T]] = None
    message: Optional[str] = None
    errors: List[ErrorDetail] = []
