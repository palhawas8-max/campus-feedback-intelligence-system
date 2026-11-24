"""
main.py — FastAPI application entry point.
Mounts all routers, configures CORS, error handlers, and creates DB tables on startup.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, surveys, admin, locations
from app.mongodb import init_mongo, close_mongo, check_mongo_health

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables, initialize MongoDB connection, and pre-warm NLP models on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize MongoDB connection
    await init_mongo()

    # Pre-load NLP singletons in background so first request is fast
    try:
        from app.nlp.preprocess import _get_lemmatizer
        from app.nlp.urgency import _get_vader
        _get_lemmatizer()
        _get_vader()
        # KeyBERT loads lazily on first request (heavy model — skip pre-warm to speed startup)
    except Exception as e:
        print(f"[NLP warm-up] Warning: {e}")

    yield  # App running

    await close_mongo()
    await engine.dispose()


app = FastAPI(
    title="Campus Feedback Intelligence System",
    description="NLP-powered campus issue reporting and analytics for J.C. Bose University",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Error Handlers ───────────────────────────────────────────────────

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Database integrity error — duplicate or invalid reference."},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    # Don't swallow HTTP exceptions (they have their own handler)
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again."},
    )


# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(surveys.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health():
    mongo_status = await check_mongo_health()
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "mongodb": mongo_status,
    }
