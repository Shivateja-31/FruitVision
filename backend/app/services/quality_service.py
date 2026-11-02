import os
import logging
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import cv2
import torch
import torchvision.transforms as T
from PIL import Image
from app.core.config import settings

logger = logging.getLogger("fruitvision.quality")

QUALITY_CLASSES_STANDARD = ["Healthy", "Visible Damage", "Rotten / Spoiled", "Uncertain"]

class QualityInspectionService:
    _instance: Optional["QualityInspectionService"] = None

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.QUALITY_MODEL_PATH
        self.device = "cuda" if (torch.cuda.is_available() and not settings.FORCE_CPU) else "cpu"
        self.model = None
        self.mode = "unavailable"  # "model", "heuristic", "unavailable"
        self.model_identity = "None"
        self.supported_classes = []
        self._init_service()

    @classmethod
    def get_instance(cls) -> "QualityInspectionService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _init_service(self):
        if os.path.exists(self.model_path):
            try:
                logger.info(f"Attempting to load trained quality classifier from: {self.model_path}")
                checkpoint = torch.load(self.model_path, map_location=self.device)
                
                # Check for TorchScript or state dict
                if isinstance(checkpoint, torch.nn.Module):
                    self.model = checkpoint
                elif isinstance(checkpoint, dict) and "model" in checkpoint:
                    self.model = checkpoint["model"]
                else:
                    self.model = checkpoint
                
                self.model.to(self.device)
                self.model.eval()
                self.mode = "model"
                self.model_identity = f"Custom PyTorch Classifier ({os.path.basename(self.model_path)})"
                self.supported_classes = QUALITY_CLASSES_STANDARD
                logger.info("Deep learning quality classifier loaded successfully!")
            except Exception as e:
                logger.warning(f"Could not load custom quality classifier weights ({e}). Quality mode set to Heuristic / Documented Fallback.")
                self._fallback_heuristic()
        else:
            self._fallback_heuristic()

    def _fallback_heuristic(self):
        # When no custom neural network weights file is supplied, we offer an explicit heuristic analyzer
        # clearly labeled as non-deep-learning surface analysis, plus an unavailable mode.
        self.mode = "heuristic"
        self.model_identity = "FruitVision Heuristic Surface Analyzer v1.0 (Color/Defect Surface Heuristic - Not Deep Learning)"
        self.supported_classes = ["Healthy", "Visible Damage", "Rotten / Spoiled", "Uncertain"]

    def is_available(self) -> bool:
        return self.mode in ["model", "heuristic"]

    def inspect_crop(
        self,
        fruit_crop_bgr: np.ndarray,
        fruit_class: str,
        allow_heuristic: bool = True
    ) -> Dict[str, Any]:
        """
        Inspects a cropped fruit bounding box.
        Returns:
            - quality_label: str
            - confidence: float
            - is_uncertain: bool
            - mode: str
            - model_identity: str
        """
        if fruit_crop_bgr is None or fruit_crop_bgr.size == 0 or fruit_crop_bgr.shape[0] < 5 or fruit_crop_bgr.shape[1] < 5:
            return {
                "quality_label": "Uncertain",
                "confidence": 0.0,
                "is_uncertain": True,
                "mode": self.mode,
                "model_identity": self.model_identity,
                "defect_reason": "Crop too small or invalid"
            }

        # 1. Deep Learning Model Inference (if weights present)
        if self.mode == "model" and self.model is not None:
            try:
                rgb_img = cv2.cvtColor(fruit_crop_bgr, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_img)
                transform = T.Compose([
                    T.Resize((224, 224)),
                    T.ToTensor(),
                    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
                tensor = transform(pil_img).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    logits = self.model(tensor)
                    probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
                    pred_idx = int(np.argmax(probs))
                    confidence = float(probs[pred_idx])

                label_candidates = ["Healthy", "Visible Damage", "Rotten / Spoiled"]
                pred_label = label_candidates[pred_idx] if pred_idx < len(label_candidates) else "Uncertain"
                
                # Uncertainty check
                is_uncertain = confidence < 0.60
                if is_uncertain:
                    pred_label = "Uncertain"

                return {
                    "quality_label": pred_label,
                    "confidence": round(confidence, 4),
                    "is_uncertain": is_uncertain,
                    "mode": "model",
                    "model_identity": self.model_identity
                }
            except Exception as e:
                logger.error(f"Error during deep learning quality inspection: {e}")

        # 2. Transparent Heuristic Surface Analysis
        if allow_heuristic and self.mode == "heuristic":
            return self._heuristic_surface_inspection(fruit_crop_bgr, fruit_class)

        # 3. Quality Unavailable
        return {
            "quality_label": "Unavailable",
            "confidence": 0.0,
            "is_uncertain": True,
            "mode": "unavailable",
            "model_identity": "None configured"
        }

    def _heuristic_surface_inspection(self, crop_bgr: np.ndarray, fruit_class: str) -> Dict[str, Any]:
        """
        Analyzes visible surface discoloration, dark spots, and severe blemishes
        using HSV and color variation. Labeled strictly as a heuristic estimate.
        """
        try:
            hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            total_pixels = crop_bgr.shape[0] * crop_bgr.shape[1]

            # Blemish/dark spot detection: very low value/brightness and low saturation
            dark_mask = (v < 60) | ((v < 90) & (s > 100) & (h > 15) & (h < 35)) # brown/black spots
            dark_pixel_ratio = np.sum(dark_mask) / float(total_pixels)

            # High discoloration / abnormal patches
            gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
            std_dev = float(np.std(gray))

            # Heuristic decision rules
            if dark_pixel_ratio > 0.28:
                label = "Rotten / Spoiled"
                confidence = min(0.92, 0.65 + dark_pixel_ratio)
                is_uncertain = False
            elif dark_pixel_ratio > 0.12 or (std_dev > 65 and dark_pixel_ratio > 0.06):
                label = "Visible Damage"
                confidence = min(0.85, 0.60 + dark_pixel_ratio * 1.5)
                is_uncertain = False
            else:
                label = "Healthy"
                confidence = max(0.70, 0.95 - (dark_pixel_ratio * 2.0))
                is_uncertain = False

            return {
                "quality_label": label,
                "confidence": round(float(confidence), 3),
                "is_uncertain": is_uncertain,
                "mode": "heuristic",
                "model_identity": self.model_identity,
                "dark_spot_ratio": round(float(dark_pixel_ratio), 4)
            }
        except Exception as e:
            logger.warning(f"Heuristic inspection exception: {e}")
            return {
                "quality_label": "Uncertain",
                "confidence": 0.5,
                "is_uncertain": True,
                "mode": "heuristic",
                "model_identity": self.model_identity
            }

