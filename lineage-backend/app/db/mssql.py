from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from typing import Optional

engine: Optional[Engine] = None
SessionLocal: Optional[sessionmaker] = None

def init_mssql() -> Engine:
    global engine, SessionLocal
    connection_string = (
        f"mssql+pyodbc://{settings.mssql_username}:{settings.mssql_password}"
        f"@{settings.mssql_host}:{settings.mssql_port}/{settings.mssql_database}"
        f"?driver={settings.mssql_driver}&TrustServerCertificate={settings.mssql_trust_certificate}"
    )
    engine = create_engine(connection_string, pool_size=10, max_overflow=20, pool_pre_ping=True, echo=False)
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    return engine

def get_mssql_session() -> Session:
    if SessionLocal is None:
        init_mssql()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def check_mssql_connection() -> bool:
    try:
        if engine is None:
            init_mssql()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"MSSQL connection failed: {e}")
        return False
