# FruitVision AI — System Architecture

FruitVision AI is an agricultural computer vision web platform designed to detect, continuously track, count, and evaluate the quality of fruits on conveyor belts or post-harvest sorting lines.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite + Tailwind)"]
        UI_Home["Home Page"]
        UI_WS["Inspection Workspace"]
        UI_Res["Live Results Player"]
        UI_Dash["Analytics Dashboard"]
        UI_Hist["Inspection History"]
        API_Client["Axios API Client"]
    end

    subgraph Server ["FastAPI Backend Application"]
        Router["REST API Router (/api)"]
        Health_EP["GET /api/health & /config"]
        Inspect_EP["POST /api/inspections"]
        Job_EP["GET /api/inspections/:id"]
        Video_EP["GET /api/inspections/:id/video"]
        Report_EP["GET /api/inspections/:id/report (JSON/CSV)"]
    end

    subgraph CVPipeline ["Computer Vision Pipeline"]
        Validator["Input & Signature Validation"]
        Frame_Ext["Incremental Frame Extraction"]
        YOLO_Det["YOLOv8 Fruit Detection"]
        Byte_Track["ByteTrack Temporal Association"]
        Quality_Mod["Quality / Surface Inspection"]
        Annotator["HUD & Bounding Box Renderer"]
        Reporter["Report Generator (JSON & CSV)"]
    end

    subgraph Storage ["Local Storage & Persistence"]
        DB[(SQLite Database)]
        Uploads["storage/uploads/"]
        Processed["storage/processed/"]
        Reports["storage/reports/"]
        Weights["models/yolov8n.pt"]
    end

    UI_WS -->|Uploads video + settings| API_Client
    API_Client --> Router
    Router --> Inspect_EP
    Inspect_EP --> Validator
    Validator --> Uploads
    Inspect_EP --> DB

    Inspect_EP -->|Async Background Task| Frame_Ext
    Frame_Ext --> YOLO_Det
    Weights --> YOLO_Det
    YOLO_Det --> Byte_Track
    Byte_Track --> Quality_Mod
    Quality_Mod --> Annotator
    Annotator --> Processed
    Annotator --> Reporter
    Reporter --> Reports
    Reporter --> DB

    API_Client -->|Polls Status / Streams Video| Job_EP
    API_Client --> Video_EP
    API_Client --> Report_EP
    Job_EP --> DB
    Video_EP --> Processed
    Report_EP --> Reports
```

## Modular Components

1. **API Layer (`app/api/routes.py`)**:
   Provides RESTful endpoints for health checks, system configurations, asynchronous inspection execution, cancellation, and artifact downloads.

2. **Detection Service (`app/services/detection_service.py`)**:
   Singleton service that manages the Ultralytics YOLO model. Preloaded on startup to prevent per-frame model reloads. Detects recognized fruit categories with configurable confidence thresholds.

3. **Tracking Service (`app/services/tracking_service.py`)**:
   Implements ByteTrack association. Tracks bounding box centroids across time using Kalman filtering and Hungarian matching. Preserves track-level histories and ensures unique count incrementation.

4. **Quality Inspection Service (`app/services/quality_service.py`)**:
   Operates on cropped fruit bounding boxes. Supports deep learning classification adapters (PyTorch) or transparent surface color anomaly heuristics with uncertainty flags.

5. **Video Processor (`app/services/video_processor.py`)**:
   Coordinates streaming frame extraction, OpenCV video writing with HUD telemetry, and cancellation checks.

