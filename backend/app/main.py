"""
Main FastAPI application for Facial Biometrics System.
Supports Verification (1:1) and Identification (1:N) modes.
"""

import os
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.routes import enrollment, verification, identification, metrics, llm

# ============================================================================
# Lifespan context manager for startup/shutdown events
# ============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown events.
    """
    # Startup
    print("Facial Biometrics System Backend Starting...")
    yield
    # Shutdown
    print("Facial Biometrics System Backend Shutting Down...")


# ============================================================================
# Application initialization
# ============================================================================
app = FastAPI(
    title="Facial Biometrics System API",
    description="LLM-assisted facial verification and identification system",
    version="1.0.0",
    lifespan=lifespan
)

# ============================================================================
# CORS Configuration
# ============================================================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Routes Registration
# ============================================================================
app.include_router(
    enrollment.router,
    prefix="/api/v1/enrollment",
    tags=["Enrollment"]
)
app.include_router(
    verification.router,
    prefix="/api/v1/verification",
    tags=["Verification"]
)
app.include_router(
    identification.router,
    prefix="/api/v1/identification",
    tags=["Identification"]
)
app.include_router(
    metrics.router,
    prefix="/api/v1/metrics",
    tags=["Metrics"]
)
app.include_router(
    llm.router,
    prefix="/api/v1/llm",
    tags=["LLM Analysis"]
)

# ============================================================================
# Health Check Endpoint
# ============================================================================
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint. Returns system status.
    
    Returns:
        dict: System status including API version, environment, and services.
    """
    return {
        "status": "healthy",
        "service": "Facial Biometrics System API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "frontend_url": FRONTEND_URL,
        "message": "All systems operational"
    }


@app.get("/")
async def root() -> Dict[str, str]:
    """
    Root endpoint. Provides API information.
    """
    return {
        "message": "Welcome to Facial Biometrics System API",
        "docs": "/docs",
        "health": "/health"
    }


# ============================================================================
# Error Handlers
# ============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled exceptions.
    """
    return {
        "error": "Internal Server Error",
        "message": str(exc),
        "detail": "An unexpected error occurred"
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
