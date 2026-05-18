#!/usr/bin/env python3
import sys
import os
from pathlib import Path
from neo4j import GraphDatabase

# Add the parent directory to the path to import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

def insert_neo4j_seed():
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password)
    )

    seed_file = Path(__file__).parent.parent / "db" / "neo4j" / "seed_graph.cypher"

    with open(seed_file, 'r') as f:
        cypher_script = f.read()

    with driver.session(database=settings.neo4j_database) as session:
        for statement in cypher_script.split('\n\n'):
            if statement.strip() and not statement.strip().startswith('--'):
                session.run(statement)

    driver.close()
    print("✓ Neo4j seed data inserted")

if __name__ == "__main__":
    insert_neo4j_seed()
