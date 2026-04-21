from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import json
from datetime import datetime

from api.routes import router as api_router
from api.auth_routes import router as auth_router
from api.proxy import router as proxy_router
from models.database import init_db, get_db, TrainingSession

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Neural Network Visualization API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(api_router, prefix="/api")
app.include_router(proxy_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Neural Network Visualization API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
