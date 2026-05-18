from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Lineage Platform API"
    app_env: str = "local"
    app_port: int = 8000
    log_level: str = "INFO"
    cors_allowed_origins: str = "http://localhost:5173"
    mssql_host: str
    mssql_port: int = 1433
    mssql_database: str
    mssql_username: str
    mssql_password: str
    mssql_driver: str = "ODBC Driver 18 for SQL Server"
    mssql_trust_certificate: str = "yes"
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    neo4j_database: str = "neo4j"
    access_mode: str = "READ_ONLY"
    default_page_size: int = 25
    max_page_size: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
