#!/usr/bin/env python3
import sys
from app.core.config import settings
from app.db import check_mssql_connection, check_neo4j_connection

def main():
    print("Validating database connections...\n")
    mssql_ok = check_mssql_connection()
    print("✓ MSSQL OK\n" if mssql_ok else "✗ MSSQL FAILED\n")
    neo4j_ok = check_neo4j_connection()
    print("✓ Neo4j OK\n" if neo4j_ok else "✗ Neo4j FAILED\n")
    if mssql_ok and neo4j_ok:
        print("✅ All connections validated!\n")
        return 0
    return 1

if __name__ == "__main__":
    sys.exit(main())
