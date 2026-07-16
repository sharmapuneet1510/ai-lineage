"""User feedback on discovered fields.

Feedback is a SEPARATE layer over parsed knowledge. It never overwrites facts —
a reviewer's correction is recorded alongside the provenance, and only becomes
reusable once it has been verified. This mirrors the review workflow: capture →
verify → reuse, with parsed facts always preserved.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, field_validator


class FeedbackKind(str, Enum):
    CONFIRM = "confirm"    # the field's knowledge looks right
    CORRECT = "correct"    # a value/definition is wrong; body carries the correction
    FLAG_GAP = "flag_gap"  # lineage is incomplete / a source is missing
    NOTE = "note"          # a comment for other reviewers


class FeedbackTarget(str, Enum):
    DEFINITION = "definition"
    VALUE = "value"
    LINEAGE = "lineage"
    DOWNSTREAM = "downstream"
    GENERAL = "general"


class FeedbackStatus(str, Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    REJECTED = "rejected"


class FeedbackCreate(BaseModel):
    field_id: str
    kind: FeedbackKind
    target: FeedbackTarget = FeedbackTarget.GENERAL
    body: str = ""
    author: str

    @field_validator("field_id", "author")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v.strip()

    @field_validator("body")
    @classmethod
    def _body_present_when_needed(cls, v: str, info) -> str:
        kind = info.data.get("kind")
        if kind in (FeedbackKind.CORRECT, FeedbackKind.NOTE) and not v.strip():
            raise ValueError(f"body is required for {kind.value} feedback")
        return v.strip()


class Feedback(FeedbackCreate):
    id: str
    status: FeedbackStatus = FeedbackStatus.UNVERIFIED
    created_at: datetime
    verified_at: datetime | None = None
    verified_by: str | None = None


class VerifyRequest(BaseModel):
    by: str

    @field_validator("by")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v.strip()
