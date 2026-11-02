from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON
from datetime import datetime
from app.db.database import Base

class InspectionJobModel(Base):
    __tablename__ = "inspection_jobs"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    status = Column(String(32), default="pending", index=True)  # pending, processing, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    current_frame = Column(Integer, default=0)
    total_frames = Column(Integer, default=0)
    fps = Column(Float, default=0.0)
    eta_seconds = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    error_message = Column(Text, nullable=True)
    media_type = Column(String(16), default="video") # "video" or "image"
    
    # File paths (relative to base storage)
    video_path = Column(String(512), nullable=True)
    processed_video_path = Column(String(512), nullable=True)
    image_path = Column(String(512), nullable=True)
    report_path = Column(String(512), nullable=True)
    csv_path = Column(String(512), nullable=True)
    
    # Metadata and serialised results
    video_metadata = Column(JSON, nullable=True)
    settings = Column(JSON, nullable=True)
    results_summary = Column(JSON, nullable=True)
    tracks_data = Column(JSON, nullable=True)

