"""Feedback API: capture → verify → reuse.

Routes never touch parsed facts — feedback is stored in its own layer. Only
verified feedback is intended for downstream reuse; the store keeps unverified
and rejected entries for the audit trail.
"""
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.core.response import ApiResponse
from app.feedback.models import (
    Feedback,
    FeedbackCreate,
    FeedbackStatus,
    VerifyRequest,
)
from app.feedback.store import FeedbackStore, JsonFileFeedbackStore

router = APIRouter(prefix="/feedback", tags=["feedback"])

_store: FeedbackStore = JsonFileFeedbackStore(
    os.environ.get("FEEDBACK_STORE", "feedback_store.json")
)


def set_store(store: FeedbackStore) -> None:
    """Swap the store (tests, or a future MSSQL-backed implementation)."""
    global _store
    _store = store


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("")
def create_feedback(payload: FeedbackCreate) -> ApiResponse[Feedback]:
    fb = Feedback(id=uuid.uuid4().hex, created_at=_now(), **payload.model_dump())
    _store.add(fb)
    return ApiResponse(success=True, data=fb, message="Feedback recorded")


@router.get("")
def list_feedback(
    field_id: str | None = Query(default=None),
) -> ApiResponse[list[Feedback]]:
    return ApiResponse(success=True, data=_store.list(field_id=field_id))


@router.post("/{feedback_id}/verify")
def verify_feedback(feedback_id: str, req: VerifyRequest) -> ApiResponse[Feedback]:
    fb = _store.get(feedback_id)
    if fb is None:
        raise HTTPException(status_code=404, detail="feedback not found")
    fb.status = FeedbackStatus.VERIFIED
    fb.verified_at = _now()
    fb.verified_by = req.by
    _store.update(fb)
    return ApiResponse(success=True, data=fb, message="Feedback verified")


@router.post("/{feedback_id}/reject")
def reject_feedback(feedback_id: str, req: VerifyRequest) -> ApiResponse[Feedback]:
    fb = _store.get(feedback_id)
    if fb is None:
        raise HTTPException(status_code=404, detail="feedback not found")
    fb.status = FeedbackStatus.REJECTED
    fb.verified_at = _now()
    fb.verified_by = req.by
    _store.update(fb)
    return ApiResponse(success=True, data=fb, message="Feedback rejected")


@router.get("/summary")
def feedback_summary() -> ApiResponse[dict]:
    items = _store.list()
    by_status: dict[str, int] = {}
    for f in items:
        by_status[f.status.value] = by_status.get(f.status.value, 0) + 1
    return ApiResponse(success=True, data={"total": len(items), "by_status": by_status})
