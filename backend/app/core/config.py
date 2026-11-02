import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    BASE_DIR: Path = BASE_DIR
    PROJECT_NAME: str = "FruitVision AI"
    PROJECT_DESCRIPTION: str = "An Intelligent Multi-Fruit Detection, Tracking and Quality Inspection System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
    
    # Storage settings
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    PROCESSED_DIR: Path = STORAGE_DIR / "processed"
    REPORTS_DIR: Path = STORAGE_DIR / "reports"
    
    # Model paths
    MODEL_DIR: Path = BASE_DIR / "models"
    YOLO_MODEL_PATH: str = str(MODEL_DIR / "yolov8n.pt")
    QUALITY_MODEL_PATH: str = str(MODEL_DIR / "quality_classifier.pt")
    
    # Computer Vision parameters
    DEFAULT_CONFIDENCE: float = 0.35
    DEFAULT_IOU_THRESHOLD: float = 0.45
    DEFAULT_FRAME_STRIDE: int = 1
    MAX_UPLOAD_SIZE_MB: int = 250
    ALLOWED_VIDEO_EXTENSIONS: set[str] = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ALLOWED_EXTENSIONS: set[str] = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    
    # Database
    DATABASE_URL: str = f"sqlite:///{STORAGE_DIR.as_posix()}/fruitvision.db"
    
    # Hardware acceleration
    FORCE_CPU: bool = False

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
