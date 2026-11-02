import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import router as api_router
from app.services.detection_service import DetectionService
from app.services.quality_service import QualityInspectionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fruitvision")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FruitVision AI backend services...")
    # 1. Initialize Database Tables
    init_db()
    logger.info("SQLite database tables initialized successfully.")

    # 2. Preload YOLO Model
    try:
        det_svc = DetectionService.get_instance()
        logger.info(f"Loaded YOLO detection model. Supported classes: {det_svc.get_supported_classes()}")
    except Exception as e:
        logger.error(f"Failed to load detection model on startup: {e}")

    # 3. Preload Quality Classifier
    try:
        qual_svc = QualityInspectionService.get_instance()
        logger.info(f"Quality inspection initialized in '{qual_svc.mode}' mode ({qual_svc.model_identity}).")
    except Exception as e:
        logger.error(f"Failed to initialize quality inspection service: {e}")

    yield

    logger.info("FruitVision AI backend shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan
)

# Configure CORS for local React development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred during video processing or request handling.", "error": str(exc)}
    )

# Include API Router under /api
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "description": settings.PROJECT_DESCRIPTION,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_prefix": settings.API_PREFIX
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
