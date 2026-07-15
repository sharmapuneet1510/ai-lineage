"""Standalone feedback API — no MSSQL / Neo4j required.

Serves just the feedback routes with permissive CORS so the static viewer can
POST review feedback while it reads facts from files. Feedback persists to the
JSON file named by FEEDBACK_STORE (default ./feedback_store.json).

    cd lineage-backend
    FEEDBACK_STORE=../lineage-viewer/feedback_store.json \
        python3 -m uvicorn scripts.feedback_server:app --port 8000

The viewer then talks to it via ?api=http://localhost:8000/api
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.core.error_handlers import register_error_handlers  # noqa: E402
from app.feedback.routes import router  # noqa: E402

app = FastAPI(title="Lineage Feedback API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"service": "lineage-feedback", "status": "ok"}
