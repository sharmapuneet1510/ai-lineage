from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    LineageException,
    AccessDeniedException,
    NotFoundException,
    ValidationException
)


def register_error_handlers(app: FastAPI):
    """Register global exception handlers for the FastAPI app."""

    @app.exception_handler(AccessDeniedException)
    async def access_denied_handler(request: Request, exc: AccessDeniedException):
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": exc.message,
                "errors": [],
                "data": None
            }
        )

    @app.exception_handler(NotFoundException)
    async def not_found_handler(request: Request, exc: NotFoundException):
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": exc.message,
                "errors": [],
                "data": None
            }
        )

    @app.exception_handler(ValidationException)
    async def validation_exception_handler(request: Request, exc: ValidationException):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": exc.message,
                "errors": [],
                "data": None
            }
        )

    @app.exception_handler(LineageException)
    async def lineage_exception_handler(request: Request, exc: LineageException):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": getattr(exc, 'message', str(exc)),
                "errors": [],
                "data": None
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        print(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "errors": [],
                "data": None
            }
        )
