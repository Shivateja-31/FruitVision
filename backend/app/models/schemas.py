from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime

class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str
    device: str
    detection_model: str
    supported_classes: List[str]
    quality_model_available: bool
    quality_model_mode: str
    timestamp: datetime

class ConfigResponse(BaseModel):
    app_name: str
    version: str
    supported_classes: List[str]
    extension_path_documented: bool
    allowed_extensions: List[str]
    max_upload_size_mb: int
    default_confidence: float
    default_frame_stride: int
    supported_quality_labels: List[str]
    device: str

class VideoMetadata(BaseModel):
    filename: str
    filesize_mb: float
    duration_seconds: float
    fps: float
    frame_count: int
    width: int
    height: int
    codec: str

class FruitClassCount(BaseModel):
    class_name: str
    count: int
    percentage: float

class QualitySummary(BaseModel):
    mode: str  # "model", "heuristic", "unavailable"
    model_identity: Optional[str] = None
    healthy_count: int = 0
    defective_count: int = 0
    uncertain_count: int = 0
    defect_breakdown: Dict[str, int] = Field(default_factory=dict)

class TrackSummary(BaseModel):
    track_id: int
    class_name: str
    detection_count: int
    avg_confidence: float
    first_frame: int
    last_frame: int
    quality_label: Optional[str] = None
    quality_confidence: Optional[float] = None
    is_uncertain: bool = False

class InspectionSummary(BaseModel):
    total_frames_processed: int
    total_detections: int
    unique_fruits: int
    fruit_counts: Dict[str, int]
    fruit_percentages: Dict[str, float]
    quality_summary: QualitySummary
    avg_confidence: float
    processing_time_seconds: float
    fps_throughput: float

class InspectionJobResponse(BaseModel):
    id: str
    filename: str
    media_type: str = "video"  # "video" or "image"
    status: str  # "pending", "processing", "completed", "failed", "cancelled"
    progress: float = 0.0
    current_frame: int = 0
    total_frames: int = 0
    fps: float = 0.0
    eta_seconds: float = 0.0
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Optional[VideoMetadata] = None
    summary: Optional[InspectionSummary] = None
    tracks: Optional[List[TrackSummary]] = None
    has_video: bool = False
    has_image: bool = False
    has_report: bool = False
    has_csv: bool = False

class InspectionListResponse(BaseModel):
    jobs: List[InspectionJobResponse]
    total: int
    page: int
    page_size: int

class CancelJobResponse(BaseModel):
    id: str
    message: str
    status: str

