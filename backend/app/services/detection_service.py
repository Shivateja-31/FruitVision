import os
import logging
from typing import Dict, List, Optional, Tuple, Set, Any
import torch
from ultralytics import YOLO
from app.core.config import settings

logger = logging.getLogger("fruitvision.detection")

# Known fruit names we look for across COCO and specialized fruit models
RECOGNIZED_FRUIT_NAMES = {
    "apple", "banana", "orange", "mango", "grape", "pear",
    "pineapple", "strawberry", "watermelon", "lemon", "lime",
    "peach", "cherry", "kiwi", "pomegranate"
}

# Color palette for fruit classes (BGR format for OpenCV)
FRUIT_COLORS: Dict[str, Tuple[int, int, int]] = {
    "apple": (46, 50, 230),       # Vibrant Red
    "banana": (30, 215, 250),     # Golden Yellow
    "orange": (34, 139, 255),     # Bright Orange
    "mango": (40, 180, 240),      # Amber/Mango
    "grape": (180, 50, 140),      # Purple
    "pear": (70, 200, 120),       # Pear Green
    "pineapple": (50, 190, 230),  # Pineapple Gold
    "strawberry": (60, 40, 220),  # Strawberry Crimson
    "lemon": (40, 230, 240),      # Citrus Yellow
    "lime": (50, 210, 80),        # Lime Green
    "default": (16, 185, 129)     # FruitVision Emerald
}

class DetectionService:
    _instance: Optional["DetectionService"] = None

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.YOLO_MODEL_PATH
        self.device = "cuda" if (torch.cuda.is_available() and not settings.FORCE_CPU) else "cpu"
        self.model: Optional[YOLO] = None
        self.fruit_class_ids: Set[int] = set()
        self.fruit_class_names: Dict[int, str] = {}
        self.all_model_classes: Dict[int, str] = {}
        self._load_model()

    @classmethod
    def get_instance(cls) -> "DetectionService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self):
        try:
            logger.info(f"Loading YOLO model from: {self.model_path} on device: {self.device}")
            if not os.path.exists(self.model_path):
                # Fallback to standard yolov8n if not present at configured path
                logger.warning(f"Configured model path {self.model_path} not found. Attempting to load yolov8n.pt")
                self.model = YOLO("yolov8n.pt")
            else:
                self.model = YOLO(self.model_path)
            
            # Map classes
            self.all_model_classes = self.model.names
            self.fruit_class_ids = set()
            self.fruit_class_names = {}

            for class_id, class_name in self.all_model_classes.items():
                clean_name = str(class_name).lower().strip()
                # Check if this class is a recognized fruit category
                if clean_name in RECOGNIZED_FRUIT_NAMES:
                    self.fruit_class_ids.add(class_id)
                    self.fruit_class_names[class_id] = clean_name

            logger.info(
                f"Model successfully loaded! Total classes: {len(self.all_model_classes)}. "
                f"Supported fruit classes: {list(self.fruit_class_names.values())}"
            )
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}", exc_info=True)
            raise RuntimeError(f"Computer Vision Model initialization failed: {str(e)}")

    def get_supported_classes(self) -> List[str]:
        """Returns sorted list of currently supported fruit class names."""
        return sorted(list(set(self.fruit_class_names.values())))

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_path": os.path.basename(self.model_path),
            "device": self.device,
            "total_model_classes": len(self.all_model_classes),
            "supported_fruit_classes": self.get_supported_classes(),
            "fruit_class_ids": list(self.fruit_class_ids)
        }

    def get_fruit_color(self, fruit_name: str) -> Tuple[int, int, int]:
        return FRUIT_COLORS.get(fruit_name.lower(), FRUIT_COLORS["default"])

    def detect_frame(
        self,
        frame,
        conf_threshold: float = settings.DEFAULT_CONFIDENCE,
        imgsz: int = 640
    ) -> List[Dict]:
        """
        Run inference on a single frame. Returns list of detections filtered for supported fruits.
        Does NOT reload the model.
        """
        if self.model is None:
            raise RuntimeError("YOLO model not loaded")

        # Run inference filtering by fruit class IDs if available
        classes_filter = list(self.fruit_class_ids) if self.fruit_class_ids else None
        
        results = self.model.predict(
            source=frame,
            conf=conf_threshold,
            classes=classes_filter,
            imgsz=imgsz,
            device=self.device,
            verbose=False
        )

        detections = []
        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    # Validate class is indeed a fruit
                    if cls_id in self.fruit_class_names:
                        conf = float(box.conf[0].item())
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        detections.append({
                            "bbox": [int(x1), int(y1), int(x2), int(y2)],
                            "confidence": round(conf, 4),
                            "class_id": cls_id,
                            "class_name": self.fruit_class_names[cls_id]
                        })

        return detections
