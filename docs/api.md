# FruitVision AI — REST API Documentation

Base URL: `http://localhost:8000/api`

## Endpoints

### 1. System Health
- **Endpoint**: `GET /api/health`
- **Description**: Returns hardware device, loaded YOLO model, supported fruit categories, and quality inspection status.
- **Response**:
```json
{
  "status": "healthy",
  "app_name": "FruitVision AI",
  "version": "1.0.0",
  "device": "cpu",
  "detection_model": "yolov8n.pt",
  "supported_classes": ["apple", "banana", "orange"],
  "quality_model_available": true,
  "quality_model_mode": "heuristic",
  "timestamp": "2026-11-02T08:50:00.000Z"
}
```

### 2. Client Configuration
- **Endpoint**: `GET /api/config`
- **Description**: Returns allowed video upload extensions, upload size limits, default confidence thresholds, and frame stride defaults.

### 3. Create Inspection
- **Endpoint**: `POST /api/inspections`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: Video binary stream (MP4, AVI, MOV, MKV, WebM)
  - `confidence`: Float between 0.10 and 0.90 (default: 0.35)
  - `tracking_enabled`: Boolean (default: true)
  - `quality_inspection_enabled`: Boolean (default: false)
  - `frame_stride`: Integer (default: 1)
- **Status Code**: `201 Created`

### 4. Get Inspection Status & Results
- **Endpoint**: `GET /api/inspections/{job_id}`
- **Description**: Returns real-time progress (0–100%), current frame, total frames, throughput FPS, ETA, and final metrics upon completion.

### 5. Stream Processed Video
- **Endpoint**: `GET /api/inspections/{job_id}/video`
- **Description**: Streams the generated MP4 video with bounding box overlays and HUD telemetry.

### 6. Download Structured JSON Report
- **Endpoint**: `GET /api/inspections/{job_id}/report`
- **Description**: Exports the full structured JSON summary report.

### 7. Download CSV Track Spreadsheet
- **Endpoint**: `GET /api/inspections/{job_id}/csv`
- **Description**: Exports flat tabular track-level detections suitable for Excel and analytical analysis.

### 8. Cancel Inspection
- **Endpoint**: `POST /api/inspections/{job_id}/cancel`
- **Description**: Cooperatively halts an active analysis job and safely cleans up partial files.

### 9. Delete Inspection
- **Endpoint**: `DELETE /api/inspections/{job_id}`
- **Description**: Removes job metadata from SQLite and deletes generated video and report artifacts from local storage.

