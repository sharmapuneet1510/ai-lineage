from sqlalchemy import create_engine, Engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from app.core.config import settings
from typing import Optional
import pymssql

engine: Optional[Engine] = None
SessionLocal: Optional[sessionmaker] = None

def init_mssql() -> Engine:
    global engine, SessionLocal

    # Create custom connection function for pymssql with explicit parameters
    def get_conn():
        return pymssql.connect(
            host=settings.mssql_host,
            port=int(settings.mssql_port),
            user=settings.mssql_username,
            password=settings.mssql_password,
            database=settings.mssql_database,
            timeout=10
        )

    # Use creator function instead of connection URL string
    engine = create_engine(
        "mssql+pymssql://",
        creator=get_conn,
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        echo=False
    )
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
