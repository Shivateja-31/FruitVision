import os
import uuid
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db, SessionLocal
from app.db.models import InspectionJobModel
from app.models.schemas import (
    HealthResponse,
    ConfigResponse,
    InspectionJobResponse,
    InspectionListResponse,
    CancelJobResponse,
    VideoMetadata,
    InspectionSummary,
    TrackSummary,
    QualitySummary
)
from app.services.detection_service import DetectionService
from app.services.quality_service import QualityInspectionService
from app.services.video_processor import VideoProcessor, active_jobs_status, cancelled_jobs
from app.services.image_processor import ImageProcessor

logger = logging.getLogger("fruitvision.api")
router = APIRouter()

def sanitize_filename(filename: str) -> str:
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    return clean_name or "media_input.mp4"

def validate_media_file_header(first_bytes: bytes, file_ext: str) -> bool:
    if len(first_bytes) < 4:
        return False
    
    # Images
    if file_ext in settings.ALLOWED_IMAGE_EXTENSIONS:
        # JPEG
        if first_bytes.startswith(b'\xff\xd8\xff'):
            return True
        # PNG
        if first_bytes.startswith(b'\x89PNG'):
            return True
        # BMP
        if first_bytes.startswith(b'BM'):
            return True
        # WebP
        if first_bytes.startswith(b'RIFF') and b'WEBP' in first_bytes[:16]:
            return True
        return False

    # Videos
    # MP4 / QuickTime signature (ftyp)
    if b'ftyp' in first_bytes[:32]:
        return True
    # Matroska / WebM
    if first_bytes.startswith(b'\x1a\x45\xdf\xa3'):
        return True
    # AVI / RIFF
    if first_bytes.startswith(b'RIFF') and b'AVI ' in first_bytes[:16]:
        return True
    return False

def run_inspection_background(
    job_id: str,
    upload_path: str,
    processed_path: str,
    report_json_path: str,
    report_csv_path: str,
    confidence: float,
    tracking_enabled: bool,
    quality_enabled: bool,
    frame_stride: int
):
    db = SessionLocal()
    try:
        job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database for background execution.")
            return

        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        processor = VideoProcessor(
            job_id=job_id,
            input_path=upload_path,
            output_path=processed_path,
            report_json_path=report_json_path,
            report_csv_path=report_csv_path,
            confidence_threshold=confidence,
            tracking_enabled=tracking_enabled,
            quality_inspection_enabled=quality_enabled,
            frame_stride=frame_stride
        )

        res = processor.process()

        job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
        if not job:
            return

        if res.get("status") == "cancelled":
            job.status = "cancelled"
            job.error_message = "Inspection was cancelled by user."
        else:
            job.status = "completed"
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            job.processed_video_path = str(Path(processed_path).relative_to(settings.BASE_DIR))
            job.report_path = str(Path(report_json_path).relative_to(settings.BASE_DIR))
            job.csv_path = str(Path(report_csv_path).relative_to(settings.BASE_DIR))
            job.video_metadata = res.get("metadata")
            job.results_summary = res.get("summary")
            job.tracks_data = res.get("tracks")

        db.commit()

    except Exception as e:
        logger.error(f"Error during processing job {job_id}: {e}", exc_info=True)
        try:
            job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to record job failure in DB: {db_err}")
    finally:
        db.close()

@router.get("/health", response_model=HealthResponse)
async def get_health():
    detection_service = DetectionService.get_instance()
    quality_service = QualityInspectionService.get_instance()
    model_info = detection_service.get_model_info()

    return HealthResponse(
        status="healthy",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        device=detection_service.device,
        detection_model=model_info["model_path"],
        supported_classes=detection_service.get_supported_classes(),
        quality_model_available=quality_service.is_available(),
        quality_model_mode=quality_service.mode,
        timestamp=datetime.utcnow()
    )

@router.get("/config", response_model=ConfigResponse)
async def get_config():
    detection_service = DetectionService.get_instance()
    quality_service = QualityInspectionService.get_instance()

    return ConfigResponse(
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        supported_classes=detection_service.get_supported_classes(),
        extension_path_documented=True,
        allowed_extensions=list(settings.ALLOWED_EXTENSIONS),
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB,
        default_confidence=settings.DEFAULT_CONFIDENCE,
        default_frame_stride=settings.DEFAULT_FRAME_STRIDE,
        supported_quality_labels=quality_service.supported_classes,
        device=detection_service.device
    )

@router.post("/inspections", response_model=InspectionJobResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    file: UploadFile = File(...),
    confidence: float = Form(settings.DEFAULT_CONFIDENCE),
    tracking_enabled: bool = Form(True),
    quality_inspection_enabled: bool = Form(True),
    frame_stride: int = Form(1),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    clean_name = sanitize_filename(file.filename or "media_input.mp4")
    file_ext = Path(clean_name).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    first_chunk = await file.read(64)
    if not first_chunk or len(first_chunk) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty or corrupted."
        )

    if not validate_media_file_header(first_chunk, file_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid media container signature (Video or Image)."
        )

    job_id = str(uuid.uuid4())
    upload_filename = f"{job_id}_{clean_name}"
    upload_path = settings.UPLOAD_DIR / upload_filename

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_bytes = len(first_chunk)

    try:
        with open(upload_path, "wb") as f:
            f.write(first_chunk)
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    f.close()
                    if upload_path.exists():
                        upload_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if upload_path.exists():
            upload_path.unlink()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save upload: {e}")

    # Determine if Still Image or Video Stream
    is_image = file_ext in settings.ALLOWED_IMAGE_EXTENSIONS
    media_type = "image" if is_image else "video"

    report_json_path = settings.REPORTS_DIR / f"{job_id}_report.json"
    report_csv_path = settings.REPORTS_DIR / f"{job_id}_tracks.csv"

    # ==========================
    # 1. STILL IMAGE PIPELINE
    # ==========================
    if is_image:
        try:
            image_metadata = ImageProcessor.extract_metadata(str(upload_path))
        except Exception as e:
            if upload_path.exists():
                upload_path.unlink()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid image file: {e}")

        annotated_image_filename = f"{job_id}_annotated.jpg"
        annotated_image_path = settings.PROCESSED_DIR / annotated_image_filename

        job_settings = {
            "confidence": confidence,
            "tracking_enabled": False,
            "quality_inspection_enabled": quality_inspection_enabled,
            "media_type": "image"
        }

        # Process image directly
        processor = ImageProcessor(
            job_id=job_id,
            input_path=str(upload_path),
            output_path=str(annotated_image_path),
            report_json_path=str(report_json_path),
            report_csv_path=str(report_csv_path),
            confidence_threshold=confidence,
            quality_inspection_enabled=quality_inspection_enabled
        )

        res = processor.process()

        new_job = InspectionJobModel(
            id=job_id,
            filename=clean_name,
            media_type="image",
            status="completed",
            progress=100.0,
            current_frame=1,
            total_frames=1,
            fps=res["summary"]["fps_throughput"],
            eta_seconds=0.0,
            video_path=str(upload_path.relative_to(settings.BASE_DIR)),
            processed_video_path=str(annotated_image_path.relative_to(settings.BASE_DIR)), # also accessible via processed_video_path
            image_path=str(annotated_image_path.relative_to(settings.BASE_DIR)),
            report_path=str(report_json_path.relative_to(settings.BASE_DIR)),
            csv_path=str(report_csv_path.relative_to(settings.BASE_DIR)),
            video_metadata=res["metadata"],
            settings=job_settings,
            results_summary=res["summary"],
            tracks_data=res["tracks"],
            created_at=datetime.utcnow(),
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return InspectionJobResponse(
            id=new_job.id,
            filename=new_job.filename,
            media_type="image",
            status="completed",
            progress=100.0,
            current_frame=1,
            total_frames=1,
            fps=new_job.fps,
            eta_seconds=0.0,
            created_at=new_job.created_at,
            started_at=new_job.started_at,
            completed_at=new_job.completed_at,
            metadata=VideoMetadata(**res["metadata"]),
            summary=InspectionSummary(**res["summary"]),
            tracks=[TrackSummary(**t) for t in res["tracks"]],
            has_video=False,
            has_image=True,
            has_report=True,
            has_csv=True
        )

    # ==========================
    # 2. VIDEO STREAM PIPELINE
    # ==========================
    try:
        video_metadata = VideoProcessor.extract_metadata(str(upload_path))
    except Exception as e:
        if upload_path.exists():
            upload_path.unlink()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid video file: {e}")

    processed_filename = f"{job_id}_annotated.mp4"
    processed_path = settings.PROCESSED_DIR / processed_filename

    job_settings = {
        "confidence": confidence,
        "tracking_enabled": tracking_enabled,
        "quality_inspection_enabled": quality_inspection_enabled,
        "frame_stride": frame_stride,
        "media_type": "video"
    }

    new_job = InspectionJobModel(
        id=job_id,
        filename=clean_name,
        media_type="video",
        status="pending",
        progress=0.0,
        total_frames=video_metadata["frame_count"],
        video_path=str(upload_path.relative_to(settings.BASE_DIR)),
        video_metadata=video_metadata,
        settings=job_settings,
        created_at=datetime.utcnow()
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    background_tasks.add_task(
        run_inspection_background,
        job_id=job_id,
        upload_path=str(upload_path),
        processed_path=str(processed_path),
        report_json_path=str(report_json_path),
        report_csv_path=str(report_csv_path),
        confidence=confidence,
        tracking_enabled=tracking_enabled,
        quality_enabled=quality_inspection_enabled,
        frame_stride=frame_stride
    )

    return InspectionJobResponse(
        id=new_job.id,
        filename=new_job.filename,
        media_type="video",
        status=new_job.status,
        progress=0.0,
        current_frame=0,
        total_frames=video_metadata["frame_count"],
        fps=0.0,
        eta_seconds=0.0,
        created_at=new_job.created_at,
        metadata=VideoMetadata(**video_metadata),
        has_video=False,
        has_image=False,
        has_report=False,
        has_csv=False
    )

@router.get("/inspections", response_model=InspectionListResponse)
async def list_inspections(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    total = db.query(InspectionJobModel).count()
    db_jobs = (
        db.query(InspectionJobModel)
        .order_by(InspectionJobModel.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    jobs_response = []
    for job in db_jobs:
        live = active_jobs_status.get(job.id, {})
        current_status = live.get("status", job.status)
        current_progress = live.get("progress", job.progress)
        current_frame = live.get("current_frame", job.current_frame)
        current_fps = live.get("fps", job.fps)
        eta = live.get("eta_seconds", job.eta_seconds)

        meta = VideoMetadata(**job.video_metadata) if job.video_metadata else None
        summary = InspectionSummary(**job.results_summary) if job.results_summary else None
        tracks = [TrackSummary(**t) for t in job.tracks_data] if job.tracks_data else None

        has_vid = bool(job.processed_video_path and (settings.BASE_DIR / job.processed_video_path).exists() and job.media_type != "image")
        has_img = bool((job.image_path and (settings.BASE_DIR / job.image_path).exists()) or (job.media_type == "image" and job.processed_video_path and (settings.BASE_DIR / job.processed_video_path).exists()))

        jobs_response.append(
            InspectionJobResponse(
                id=job.id,
                filename=job.filename,
                media_type=getattr(job, "media_type", "video") or "video",
                status=current_status,
                progress=current_progress,
                current_frame=current_frame,
                total_frames=job.total_frames,
                fps=current_fps,
                eta_seconds=eta,
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error_message=job.error_message,
                metadata=meta,
                summary=summary,
                tracks=tracks,
                has_video=has_vid,
                has_image=has_img,
                has_report=bool(job.report_path and (settings.BASE_DIR / job.report_path).exists()),
                has_csv=bool(job.csv_path and (settings.BASE_DIR / job.csv_path).exists())
            )
        )

    return InspectionListResponse(
        jobs=jobs_response,
        total=total,
        page=page,
        page_size=limit
    )

@router.get("/inspections/{job_id}", response_model=InspectionJobResponse)
async def get_inspection(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection job '{job_id}' not found.")

    live = active_jobs_status.get(job.id, {})
    current_status = live.get("status", job.status)
    current_progress = live.get("progress", job.progress)
    current_frame = live.get("current_frame", job.current_frame)
    current_fps = live.get("fps", job.fps)
    eta = live.get("eta_seconds", job.eta_seconds)

    meta = VideoMetadata(**job.video_metadata) if job.video_metadata else None
    summary = InspectionSummary(**job.results_summary) if job.results_summary else None
    tracks = [TrackSummary(**t) for t in job.tracks_data] if job.tracks_data else None

    has_vid = bool(job.processed_video_path and (settings.BASE_DIR / job.processed_video_path).exists() and job.media_type != "image")
    has_img = bool((job.image_path and (settings.BASE_DIR / job.image_path).exists()) or (job.media_type == "image" and job.processed_video_path and (settings.BASE_DIR / job.processed_video_path).exists()))

    return InspectionJobResponse(
        id=job.id,
        filename=job.filename,
        media_type=getattr(job, "media_type", "video") or "video",
        status=current_status,
        progress=current_progress,
        current_frame=current_frame,
        total_frames=job.total_frames,
        fps=current_fps,
        eta_seconds=eta,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        metadata=meta,
        summary=summary,
        tracks=tracks,
        has_video=has_vid,
        has_image=has_img,
        has_report=bool(job.report_path and (settings.BASE_DIR / job.report_path).exists()),
        has_csv=bool(job.csv_path and (settings.BASE_DIR / job.csv_path).exists())
    )

@router.get("/inspections/{job_id}/video")
async def get_inspection_video(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job or not job.processed_video_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processed media not available or job not found.")

    abs_path = settings.BASE_DIR / job.processed_video_path
    if not abs_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processed file is missing on storage.")

    media_type = "image/jpeg" if getattr(job, "media_type", "video") == "image" else "video/mp4"

    return FileResponse(
        path=str(abs_path),
        media_type=media_type,
        filename=f"fruitvision_{job.filename}"
    )

@router.get("/inspections/{job_id}/image")
async def get_inspection_image(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    path_candidate = job.image_path or job.processed_video_path
    if not path_candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotated image not available.")

    abs_path = settings.BASE_DIR / path_candidate
    if not abs_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file missing from storage.")

    return FileResponse(
        path=str(abs_path),
        media_type="image/jpeg",
        filename=f"annotated_{job.filename}"
    )

@router.get("/inspections/{job_id}/original")
async def get_original_media(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job or not job.video_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original upload not found.")

    abs_path = settings.BASE_DIR / job.video_path
    if not abs_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original upload file missing on disk.")

    media_type = "image/jpeg" if getattr(job, "media_type", "video") == "image" else "video/mp4"

    return FileResponse(
        path=str(abs_path),
        media_type=media_type,
        filename=job.filename
    )

@router.get("/inspections/{job_id}/report")
async def get_inspection_report(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job or not job.report_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found for this inspection.")

    abs_path = settings.BASE_DIR / job.report_path
    if not abs_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file missing from storage.")

    return FileResponse(
        path=str(abs_path),
        media_type="application/json",
        filename=f"{job_id}_report.json"
    )

@router.get("/inspections/{job_id}/csv")
async def get_inspection_csv(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job or not job.csv_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV data not found for this inspection.")

    abs_path = settings.BASE_DIR / job.csv_path
    if not abs_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV file missing from storage.")

    return FileResponse(
        path=str(abs_path),
        media_type="text/csv",
        filename=f"{job_id}_tracks.csv"
    )

@router.post("/inspections/{job_id}/cancel", response_model=CancelJobResponse)
async def cancel_inspection(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

    if job.status in ["completed", "failed", "cancelled"]:
        return CancelJobResponse(
            id=job_id,
            message=f"Job is already in terminal state: {job.status}",
            status=job.status
        )

    VideoProcessor.cancel_job(job_id)
    job.status = "cancelled"
    job.error_message = "Cancelled by user."
    job.completed_at = datetime.utcnow()
    db.commit()

    return CancelJobResponse(
        id=job_id,
        message="Inspection job cancellation requested successfully.",
        status="cancelled"
    )

@router.delete("/api/inspections/{job_id}", status_code=status.HTTP_200_OK)
@router.delete("/inspections/{job_id}", status_code=status.HTTP_200_OK)
async def delete_inspection(job_id: str, db: Session = Depends(get_db)):
    job = db.query(InspectionJobModel).filter(InspectionJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

    for path_attr in [job.video_path, job.processed_video_path, job.image_path, job.report_path, job.csv_path]:
        if path_attr:
            abs_p = settings.BASE_DIR / path_attr
            if abs_p.exists():
                try:
                    abs_p.unlink()
                except Exception as e:
                    logger.warning(f"Could not delete file {abs_p}: {e}")

    db.delete(job)
    db.commit()

    active_jobs_status.pop(job_id, None)
    cancelled_jobs.discard(job_id)

    return {"status": "deleted", "job_id": job_id, "message": "Inspection metadata and files removed successfully."}

@router.get("/samples/{filename}")
async def get_sample_file(filename: str):
    clean = os.path.basename(filename)
    sample_dir = settings.BASE_DIR.parent / "sample_videos"
    if not sample_dir.exists():
        sample_dir = settings.BASE_DIR / "sample_videos"
    
    file_path = sample_dir / clean
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sample file '{clean}' not found.")
    
    media_type = "image/jpeg" if clean.endswith((".jpg", ".jpeg")) else "video/mp4"
    return FileResponse(str(file_path), media_type=media_type, filename=clean)
