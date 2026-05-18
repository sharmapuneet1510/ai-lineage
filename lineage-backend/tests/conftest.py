import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

TEST_DB = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    engine = create_engine(TEST_DB)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

@pytest.fixture
def test_client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)
