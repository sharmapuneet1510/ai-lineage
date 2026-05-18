#!/usr/bin/env python3
import sys
import os
from pathlib import Path
from sqlalchemy import create_engine, text

# Add the parent directory to the path to import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

def insert_mssql_seed():
    connection_string = (
        f"mssql+pyodbc://{settings.mssql_username}:{settings.mssql_password}"
        f"@{settings.mssql_host}:{settings.mssql_port}/{settings.mssql_database}"
        f"?driver={settings.mssql_driver}&TrustServerCertificate={settings.mssql_trust_certificate}"
    )
    engine = create_engine(connection_string)

    seed_file = Path(__file__).parent.parent / "db" / "mssql" / "seed_data.sql"

    with open(seed_file, 'r') as f:
        sql_script = f.read()

    with engine.connect() as conn:
        for statement in sql_script.split(';'):
            if statement.strip():
                conn.execute(text(statement))
        conn.commit()

    print("✓ MSSQL seed data inserted")

if __name__ == "__main__":
    insert_mssql_seed()
