from neo4j import GraphDatabase, Driver
from app.core.config import settings
from typing import Optional

driver: Optional[Driver] = None

def init_neo4j() -> Driver:
    global driver
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password)
    )
    return driver

def get_neo4j_driver() -> Driver:
    if driver is None:
        init_neo4j()
    return driver

def get_neo4j_session():
    if driver is None:
        init_neo4j()
    session = driver.session(database=settings.neo4j_database)
    try:
        yield session
    finally:
        session.close()

def check_neo4j_connection() -> bool:
    try:
        if driver is None:
            init_neo4j()
        with driver.session(database=settings.neo4j_database) as session:
            session.run("RETURN 1")
        return True
    except Exception as e:
        print(f"Neo4j connection failed: {e}")
        return False

def close_neo4j():
    global driver
    if driver is not None:
        driver.close()
