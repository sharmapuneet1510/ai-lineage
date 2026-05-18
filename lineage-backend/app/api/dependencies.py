from fastapi import Depends
from sqlalchemy.orm import Session
from app.db import get_mssql_session, get_neo4j_session

async def get_db(session: Session = Depends(get_mssql_session)):
    return session

async def get_graph(session = Depends(get_neo4j_session)):
    return session
