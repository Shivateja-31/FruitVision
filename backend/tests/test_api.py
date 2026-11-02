import pytest
import os
import io
import asyncio
import cv2
import numpy as np
from pathlib import Path

from app.api.routes import (
    get_health,
    get_config,
    validate_media_file_header,
    sanitize_filename
)
from app.core.config import settings
from app.db.database import init_db, SessionLocal
from app.db.models import InspectionJobModel
from app.services.detection_service import DetectionService
from app.services.tracking_service import VideoTracker
from app.services.quality_service import QualityInspectionService
from app.services.report_service import ReportService
from app.services.image_processor import ImageProcessor

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

def test_health_endpoint():
    res = asyncio.run(get_health())
    assert res.status == "healthy"
    assert res.app_name == "FruitVision AI"
    assert "apple" in res.supported_classes
    assert "banana" in res.supported_classes
    assert "orange" in res.supported_classes
    assert res.quality_model_available is True

def test_config_endpoint():
    res = asyncio.run(get_config())
    assert ".mp4" in res.allowed_extensions
    assert res.default_confidence > 0.0
    assert res.max_upload_size_mb >= 100
    assert "apple" in res.supported_classes

def test_filename_sanitization():
    assert sanitize_filename("../../../malicious_path/test.mp4") == "test.mp4"
    assert sanitize_filename("fruit video (1).mp4") == "fruit_video__1_.mp4"
    assert sanitize_filename("") == "media_input.mp4"

def test_video_header_validation():
    # Valid MP4 signature (ftyp)
    valid_mp4 = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom'
    assert validate_media_file_header(valid_mp4, ".mp4") is True

    # Valid WebM / MKV
    valid_mkv = b'\x1a\x45\xdf\xa3\x9f\x42\x86\x81'
    assert validate_media_file_header(valid_mkv, ".mkv") is True

    # Invalid header
    assert validate_media_file_header(b'NOT_A_VIDEO_FILE', ".mp4") is False
    assert validate_media_file_header(b'', ".mp4") is False

def test_tracker_unique_counting():
    tracker = VideoTracker(tracking_enabled=True)
    
    # Frame 1: Fruit 1 and Fruit 2 appear
    f1_detections = [
        {"class_name": "apple", "confidence": 0.85, "bbox": [10, 10, 50, 50], "class_id": 47, "track_id": 1},
        {"class_name": "orange", "confidence": 0.90, "bbox": [100, 100, 150, 150], "class_id": 49, "track_id": 2}
    ]
    tracker.update_frame(f1_detections, frame_idx=1)
    assert tracker.get_unique_fruit_count() == 2
    assert tracker.get_fruit_counts() == {"apple": 1, "orange": 1}

    # Frame 2: Same fruits tracked with slight movement
    f2_detections = [
        {"class_name": "apple", "confidence": 0.88, "bbox": [12, 10, 52, 50], "class_id": 47, "track_id": 1},
        {"class_name": "orange", "confidence": 0.92, "bbox": [102, 100, 152, 150], "class_id": 49, "track_id": 2}
    ]
    tracker.update_frame(f2_detections, frame_idx=2)
    # Unique count must remain 2, not 4!
    assert tracker.get_unique_fruit_count() == 2
    assert tracker.total_frame_detections == 4

    # Frame 3: A new fruit (Banana #3) enters
    f3_detections = [
        {"class_name": "apple", "confidence": 0.82, "bbox": [15, 10, 55, 50], "class_id": 47, "track_id": 1},
        {"class_name": "banana", "confidence": 0.78, "bbox": [200, 200, 260, 260], "class_id": 46, "track_id": 3}
    ]
    tracker.update_frame(f3_detections, frame_idx=3)
    assert tracker.get_unique_fruit_count() == 3
    assert tracker.get_fruit_counts() == {"apple": 1, "orange": 1, "banana": 1}

def test_quality_service_crop_inspection():
    quality_service = QualityInspectionService.get_instance()
    
    # Healthy synthetic patch (clean green / red apple)
    healthy_crop = np.zeros((100, 100, 3), dtype=np.uint8)
    healthy_crop[:] = (34, 139, 34)  # Forest Green
    res_healthy = quality_service.inspect_crop(healthy_crop, fruit_class="apple")
    assert res_healthy["quality_label"] in ["Healthy", "Uncertain"]
    assert "mode" in res_healthy

    # Damaged / blemish patch (dark brown rot spots)
    damaged_crop = np.zeros((100, 100, 3), dtype=np.uint8)
    damaged_crop[:] = (20, 30, 40)  # Dark brownish black
    res_damaged = quality_service.inspect_crop(damaged_crop, fruit_class="apple")
    assert res_damaged["quality_label"] in ["Rotten / Spoiled", "Visible Damage"]

def test_report_service_generation(tmp_path):
    json_path = str(tmp_path / "test_report.json")
    csv_path = str(tmp_path / "test_report.csv")

    summary = {
        "total_frames_processed": 50,
        "total_detections": 100,
        "unique_fruits": 2,
        "fruit_counts": {"apple": 1, "banana": 1},
        "fruit_percentages": {"apple": 50.0, "banana": 50.0},
        "quality_summary": {
            "mode": "heuristic",
            "healthy_count": 2,
            "defective_count": 0,
            "uncertain_count": 0
        },
        "avg_confidence": 0.87,
        "processing_time_seconds": 2.5,
        "fps_throughput": 20.0
    }

    tracks = [
        {"track_id": 1, "class_name": "apple", "detection_count": 25, "avg_confidence": 0.88, "first_frame": 1, "last_frame": 25, "quality_label": "Healthy", "quality_confidence": 0.9, "is_uncertain": False},
        {"track_id": 2, "class_name": "banana", "detection_count": 25, "avg_confidence": 0.86, "first_frame": 1, "last_frame": 25, "quality_label": "Healthy", "quality_confidence": 0.85, "is_uncertain": False}
    ]

    ReportService.generate_json_report(
        job_id="test-job-123",
        filename="video.mp4",
        video_metadata={"width": 640, "height": 480, "fps": 25.0, "frame_count": 50, "duration_seconds": 2.0, "filesize_mb": 1.2, "codec": "mp4v"},
        summary=summary,
        tracks=tracks,
        settings_info={"confidence": 0.35},
        output_filepath=json_path
    )

    ReportService.generate_csv_report(
        job_id="test-job-123",
        tracks=tracks,
        output_filepath=csv_path
    )

    assert os.path.exists(json_path)
    assert os.path.exists(csv_path)
    assert os.path.getsize(json_path) > 100
    assert os.path.getsize(csv_path) > 50

def test_database_crud():
    db = SessionLocal()
    try:
        test_job = InspectionJobModel(
            id="test-crud-id",
            filename="sample.mp4",
            status="completed",
            progress=100.0,
            total_frames=120
        )
        db.add(test_job)
        db.commit()

        queried = db.query(InspectionJobModel).filter(InspectionJobModel.id == "test-crud-id").first()
        assert queried is not None
        assert queried.filename == "sample.mp4"
        assert queried.status == "completed"

        db.delete(queried)
        db.commit()

        deleted = db.query(InspectionJobModel).filter(InspectionJobModel.id == "test-crud-id").first()
        assert deleted is None
    finally:
        db.close()

def test_media_header_validation():
    # JPEG
    jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF'
    assert validate_media_file_header(jpeg_header, ".jpg") is True
    assert validate_media_file_header(jpeg_header, ".jpeg") is True

    # PNG
    png_header = b'\x89PNG\r\n\x1a\n\x00\x00'
    assert validate_media_file_header(png_header, ".png") is True

    # BMP
    bmp_header = b'BM\x36\x00\x00\x00'
    assert validate_media_file_header(bmp_header, ".bmp") is True

    # Invalid image
    assert validate_media_file_header(b'NOT_AN_IMAGE', ".png") is False

def test_image_processor_execution(tmp_path):
    # Create a test synthetic image
    test_img = np.zeros((300, 300, 3), dtype=np.uint8)
    # Draw a green circular fruit (simulating an apple)
    cv2.circle(test_img, (150, 150), 60, (34, 139, 34), -1)
    
    input_path = str(tmp_path / "test_fruit.jpg")
    output_path = str(tmp_path / "test_annotated.jpg")
    report_json_path = str(tmp_path / "test_report.json")
    report_csv_path = str(tmp_path / "test_report.csv")
    cv2.imwrite(input_path, test_img)

    processor = ImageProcessor(
        job_id="test-img-job",
        input_path=input_path,
        output_path=output_path,
        report_json_path=report_json_path,
        report_csv_path=report_csv_path,
        confidence_threshold=0.10,
        quality_inspection_enabled=True
    )
    result = processor.process()

    assert result["media_type"] == "image"
    assert "summary" in result
    assert "tracks" in result
    assert os.path.exists(output_path)

