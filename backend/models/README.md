# FruitVision AI — Model Directory & Setup

This directory contains neural network weights for object detection and visual quality grading.

## 1. Object Detection Model (`yolov8n.pt`)
- **Architecture**: Ultralytics YOLOv8 Nano
- **Pretrained Dataset**: COCO (Common Objects in Context)
- **Supported Native Fruit Classes**:
  - `apple` (class ID 47)
  - `banana` (class ID 46)
  - `orange` (class ID 49)
- **Tracking Algorithm**: ByteTrack association with Kalman filtering and bipartite matching.

## 2. Quality Classifier Adapter (`quality_classifier.pt`)
- When custom PyTorch classifier weights are placed here:
  - Architecture: ResNet / EfficientNet / Custom TorchScript
  - Expected Input: RGB cropped fruit bounding box resized to `224x224`
  - Output Classes: `Healthy`, `Visible Damage`, `Rotten / Spoiled`
  - Uncertainty Threshold: Softmax probability `< 0.60` flags `Uncertain`
- **Fallback Mode**: When no custom weights are provided, the system operates in **Transparent Heuristic Mode** (HSV surface blemish & color anomaly analyzer), explicitly labeled as non-deep-learning surface estimation.

## 3. Extending Fruit Classes
To add categories such as `mango`, `grape`, `pear`, `strawberry`, and `pineapple`:
1. Prepare a labeled YOLO format dataset (`data.yaml`).
2. Train using:
   ```powershell
   yolo detect train data=fruits.yaml model=yolov8n.pt epochs=80 imgsz=640
   ```
3. Copy the resulting `best.pt` to `backend/models/yolov8_fruits.pt`.
4. Update `YOLO_MODEL_PATH=models/yolov8_fruits.pt` in `backend/.env`.

