#!/usr/bin/env python3
import sys, argparse
from app.db import check_mssql_connection, check_neo4j_connection

def main():
    parser = argparse.ArgumentParser(description="Insert sample seed data")
    parser.add_argument("--reset", default="false", choices=["true", "false"])
    parser.add_argument("--only", choices=["mssql", "neo4j"])
    args = parser.parse_args()

    if not check_mssql_connection() or not check_neo4j_connection():
        print("Database connection failed")
        return 1

    print("TODO: Implement seed data loading")
    return 0

if __name__ == "__main__":
    sys.exit(main())
