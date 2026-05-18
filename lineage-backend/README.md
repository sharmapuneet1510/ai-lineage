# Lineage Backend

FastAPI backend for the Data Lineage Platform.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Tests

```bash
pytest tests/ -v
```
