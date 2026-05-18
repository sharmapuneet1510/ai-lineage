from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db import init_mssql, init_neo4j, close_neo4j
from app.api.router import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing MSSQL...")
    init_mssql()
    print("Initializing Neo4j...")
    init_neo4j()
    yield
    print("Closing Neo4j...")
    close_neo4j()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Lineage Platform API"}
