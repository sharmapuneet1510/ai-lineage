from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.feedback import routes as feedback_routes
from app.feedback.models import Feedback, FeedbackKind, FeedbackStatus
from app.feedback.store import InMemoryFeedbackStore, JsonFileFeedbackStore


def _fb(**kw) -> Feedback:
    base = dict(
        id="a1", field_id="price", kind=FeedbackKind.NOTE, body="check this",
        author="jo", created_at=datetime(2026, 7, 15, tzinfo=timezone.utc),
    )
    base.update(kw)
    return Feedback(**base)


# ---- store --------------------------------------------------------------

def test_in_memory_store_lists_and_filters_by_field():
    s = InMemoryFeedbackStore()
    s.add(_fb(id="a", field_id="price"))
    s.add(_fb(id="b", field_id="discount"))
    assert len(s.list()) == 2
    assert [f.id for f in s.list(field_id="price")] == ["a"]


def test_json_store_round_trips_to_disk(tmp_path):
    path = tmp_path / "fb.json"
    s = JsonFileFeedbackStore(path)
    s.add(_fb(id="a", field_id="price"))
    # a fresh store reading the same file sees it
    s2 = JsonFileFeedbackStore(path)
    got = s2.get("a")
    assert got is not None
    assert got.field_id == "price"
    assert got.status == FeedbackStatus.UNVERIFIED


def test_json_store_update_persists(tmp_path):
    path = tmp_path / "fb.json"
    s = JsonFileFeedbackStore(path)
    fb = _fb(id="a")
    s.add(fb)
    fb.status = FeedbackStatus.VERIFIED
    s.update(fb)
    assert JsonFileFeedbackStore(path).get("a").status == FeedbackStatus.VERIFIED


def test_json_store_survives_a_corrupt_file(tmp_path):
    path = tmp_path / "fb.json"
    path.write_text("{ not json")
    s = JsonFileFeedbackStore(path)  # must not raise
    assert s.list() == []


# ---- validation ---------------------------------------------------------

def test_correct_feedback_requires_a_body():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Feedback(id="a", field_id="price", kind=FeedbackKind.CORRECT, body="",
                 author="jo", created_at=datetime(2026, 7, 15, tzinfo=timezone.utc))


def test_confirm_feedback_needs_no_body():
    fb = _fb(kind=FeedbackKind.CONFIRM, body="")
    assert fb.kind == FeedbackKind.CONFIRM


# ---- API ----------------------------------------------------------------

@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(feedback_routes.router, prefix="/api")
    feedback_routes.set_store(InMemoryFeedbackStore())
    return TestClient(app)


def test_post_then_list_feedback(client):
    r = client.post("/api/feedback", json={
        "field_id": "price", "kind": "correct", "target": "definition",
        "body": "discount is applied before tax, not after", "author": "auditor-1",
    })
    assert r.status_code == 200
    created = r.json()["data"]
    assert created["status"] == "unverified"
    assert created["id"]

    r2 = client.get("/api/feedback", params={"field_id": "price"})
    items = r2.json()["data"]
    assert len(items) == 1
    assert items[0]["body"].startswith("discount is applied")


def test_list_filters_by_field(client):
    client.post("/api/feedback", json={"field_id": "price", "kind": "confirm", "author": "a"})
    client.post("/api/feedback", json={"field_id": "discount", "kind": "confirm", "author": "a"})
    assert len(client.get("/api/feedback", params={"field_id": "price"}).json()["data"]) == 1
    assert len(client.get("/api/feedback").json()["data"]) == 2


def test_verify_flips_status_and_records_who(client):
    created = client.post("/api/feedback", json={
        "field_id": "price", "kind": "confirm", "author": "a"}).json()["data"]
    r = client.post(f"/api/feedback/{created['id']}/verify", json={"by": "lead-reviewer"})
    assert r.status_code == 200
    verified = r.json()["data"]
    assert verified["status"] == "verified"
    assert verified["verified_by"] == "lead-reviewer"
    assert verified["verified_at"]


def test_reject_flips_status(client):
    created = client.post("/api/feedback", json={
        "field_id": "price", "kind": "correct", "body": "wrong", "author": "a"}).json()["data"]
    r = client.post(f"/api/feedback/{created['id']}/reject", json={"by": "lead"})
    assert r.json()["data"]["status"] == "rejected"


def test_verify_unknown_id_is_404(client):
    r = client.post("/api/feedback/nope/verify", json={"by": "lead"})
    assert r.status_code == 404


def test_correct_without_body_is_rejected_by_the_api(client):
    r = client.post("/api/feedback", json={
        "field_id": "price", "kind": "correct", "body": "", "author": "a"})
    assert r.status_code == 422


def test_summary_counts_by_status(client):
    a = client.post("/api/feedback", json={"field_id": "price", "kind": "confirm", "author": "a"}).json()["data"]
    client.post("/api/feedback", json={"field_id": "x", "kind": "confirm", "author": "a"})
    client.post(f"/api/feedback/{a['id']}/verify", json={"by": "lead"})
    summary = client.get("/api/feedback/summary").json()["data"]
    assert summary["total"] == 2
    assert summary["by_status"]["verified"] == 1
    assert summary["by_status"]["unverified"] == 1
