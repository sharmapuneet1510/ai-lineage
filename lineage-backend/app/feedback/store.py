"""Where feedback is persisted.

File-backed by default so the review workflow runs with zero infrastructure,
consistent with the parser subsystem. `FeedbackStore` is a seam: a
MSSQL-backed implementation can replace `JsonFileFeedbackStore` without touching
the routes.
"""
import json
import os
import tempfile
from pathlib import Path
from typing import Protocol

from app.feedback.models import Feedback


class FeedbackStore(Protocol):
    def add(self, fb: Feedback) -> None: ...
    def get(self, feedback_id: str) -> Feedback | None: ...
    def update(self, fb: Feedback) -> None: ...
    def list(self, field_id: str | None = None) -> list[Feedback]: ...


class InMemoryFeedbackStore:
    """For tests."""

    def __init__(self) -> None:
        self._items: dict[str, Feedback] = {}

    def add(self, fb: Feedback) -> None:
        self._items[fb.id] = fb

    def get(self, feedback_id: str) -> Feedback | None:
        return self._items.get(feedback_id)

    def update(self, fb: Feedback) -> None:
        self._items[fb.id] = fb

    def list(self, field_id: str | None = None) -> list[Feedback]:
        items = list(self._items.values())
        if field_id is not None:
            items = [f for f in items if f.field_id == field_id]
        return sorted(items, key=lambda f: f.created_at)


class JsonFileFeedbackStore:
    """A JSON list on disk. Loaded on init, rewritten atomically on each change.

    Human-scale review volume, single writer. A DB-backed store should replace
    this when concurrency matters.
    """

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._items: dict[str, Feedback] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return
        for row in raw:
            fb = Feedback(**row)
            self._items[fb.id] = fb

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = [f.model_dump(mode="json") for f in self._items.values()]
        # atomic: write to a temp file in the same dir, then replace
        fd, tmp = tempfile.mkstemp(dir=str(self.path.parent), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2)
            os.replace(tmp, self.path)
        except BaseException:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise

    def add(self, fb: Feedback) -> None:
        self._items[fb.id] = fb
        self._save()

    def get(self, feedback_id: str) -> Feedback | None:
        return self._items.get(feedback_id)

    def update(self, fb: Feedback) -> None:
        self._items[fb.id] = fb
        self._save()

    def list(self, field_id: str | None = None) -> list[Feedback]:
        items = list(self._items.values())
        if field_id is not None:
            items = [f for f in items if f.field_id == field_id]
        return sorted(items, key=lambda f: f.created_at)
