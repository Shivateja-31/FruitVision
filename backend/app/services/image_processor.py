import os
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
from collections import Counter
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np

from app.core.config import settings
from app.services.detection_service import DetectionService, FRUIT_COLORS
from app.services.quality_service import QualityInspectionService
from app.services.report_service import ReportService
from app.services.video_processor import QUALITY_COLORS

logger = logging.getLogger("fruitvision.image_processor")

class ImageProcessor:
    def __init__(
        self,
        job_id: str,
        input_path: str,
        output_path: str,
        report_json_path: str,
        report_csv_path: str,
        confidence_threshold: float = settings.DEFAULT_CONFIDENCE,
        quality_inspection_enabled: bool = True
    ):
        self.job_id = job_id
        self.input_path = input_path
        self.output_path = output_path
        self.report_json_path = report_json_path
        self.report_csv_path = report_csv_path
        self.confidence_threshold = confidence_threshold
        self.quality_inspection_enabled = quality_inspection_enabled

        self.detection_service = DetectionService.get_instance()
        self.quality_service = QualityInspectionService.get_instance()

    @staticmethod
    def extract_metadata(image_path: str) -> Dict[str, Any]:
        """Validates image and extracts basic metadata."""
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found at {image_path}")

        img = cv2.imread(image_path)
        if img is None or img.size == 0:
            raise ValueError("Unable to decode image file. File may be corrupted or unsupported.")

        height, width, channels = img.shape
        filesize_mb = round(os.path.getsize(image_path) / (1024 * 1024), 2)

        return {
            "filename": os.path.basename(image_path),
            "filesize_mb": filesize_mb,
            "duration_seconds": 0.0,
            "fps": 0.0,
            "frame_count": 1,
            "width": width,
            "height": height,
            "codec": Path(image_path).suffix.replace(".", "").upper()
        }

    def process(self) -> Dict[str, Any]:
        """
        Executes the still image inspection pipeline:
        Image loading -> YOLO fruit detection -> Quality inspection on each crop -> Annotated image generation -> Report export
        """
        start_time = time.time()
        logger.info(f"Starting image inspection job {self.job_id} for {self.input_path}")

        image = cv2.imread(self.input_path)
        if image is None or image.size == 0:
            raise ValueError("Could not decode image.")

        height, width, _ = image.shape

        # 1. Run YOLO object detection
        raw_detections = self.detection_service.detect_frame(
            image,
            conf_threshold=self.confidence_threshold
        )

        # 2. Inspect each detected fruit crop for quality / defects
        fruit_items: List[Dict[str, Any]] = []
        fruit_counts: Dict[str, int] = Counter()
        all_confidences: List[float] = []

        healthy_count = 0
        defective_count = 0
        uncertain_count = 0
        defect_breakdown: Dict[str, int] = {"Visible Damage": 0, "Rotten / Spoiled": 0}

        for idx, det in enumerate(raw_detections, start=1):
            class_name = det["class_name"]
            conf = det["confidence"]
            bx1, by1, bx2, by2 = det["bbox"]
            fruit_counts[class_name] += 1
            all_confidences.append(conf)

            # Crop bounds safety
            cx1 = max(0, min(width - 1, bx1))
            cy1 = max(0, min(height - 1, by1))
            cx2 = max(0, min(width, bx2))
            cy2 = max(0, min(height, by2))

            quality_label = "Unavailable"
            quality_confidence = None
            is_uncertain = False

            if self.quality_inspection_enabled and (cx2 - cx1) >= 10 and (cy2 - cy1) >= 10:
                crop = image[cy1:cy2, cx1:cx2]
                q_res = self.quality_service.inspect_crop(crop, fruit_class=class_name)
                quality_label = q_res["quality_label"]
                quality_confidence = q_res["confidence"]
                is_uncertain = q_res.get("is_uncertain", False)

                if quality_label == "Healthy":
                    healthy_count += 1
                elif quality_label in ["Visible Damage", "Rotten / Spoiled"]:
                    defective_count += 1
                    defect_breakdown[quality_label] = defect_breakdown.get(quality_label, 0) + 1
                else:
                    uncertain_count += 1

            fruit_items.append({
                "track_id": idx,
                "class_name": class_name,
                "confidence": conf,
                "avg_confidence": conf,
                "detection_count": 1,
                "first_frame": 1,
                "last_frame": 1,
                "bbox": [bx1, by1, bx2, by2],
                "quality_label": quality_label if self.quality_inspection_enabled else None,
                "quality_confidence": quality_confidence if self.quality_inspection_enabled else None,
                "is_uncertain": is_uncertain
            })

        # 3. Render Annotations
        annotated_image = self._render_annotations(
            image.copy(),
            fruit_items,
            fruit_counts,
            healthy_count,
            defective_count
        )

        # 4. Save output annotated image
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        cv2.imwrite(self.output_path, annotated_image)

        processing_time = round(time.time() - start_time, 3)
        total_fruits = len(fruit_items)
        avg_confidence = round(float(np.mean(all_confidences)), 4) if all_confidences else 0.0

        fruit_percentages = {}
        if total_fruits > 0:
            fruit_percentages = {k: round((v / total_fruits) * 100.0, 2) for k, v in fruit_counts.items()}

        quality_mode = self.quality_service.mode if self.quality_inspection_enabled else "unavailable"
        quality_summary = {
            "mode": quality_mode,
            "model_identity": self.quality_service.model_identity if self.quality_inspection_enabled else "Quality inspection disabled",
            "healthy_count": healthy_count,
            "defective_count": defective_count,
            "uncertain_count": uncertain_count,
            "defect_breakdown": defect_breakdown
        }

        summary = {
            "total_frames_processed": 1,
            "total_detections": total_fruits,
            "unique_fruits": total_fruits,
            "fruit_counts": dict(fruit_counts),
            "fruit_percentages": fruit_percentages,
            "quality_summary": quality_summary,
            "avg_confidence": avg_confidence,
            "processing_time_seconds": processing_time,
            "fps_throughput": round(1.0 / processing_time, 1) if processing_time > 0 else 0.0
        }

        metadata = self.extract_metadata(self.input_path)

        settings_info = {
            "confidence_threshold": self.confidence_threshold,
            "tracking_enabled": False,
            "quality_inspection_enabled": self.quality_inspection_enabled,
            "media_type": "image",
            "detection_model": os.path.basename(self.detection_service.model_path),
            "device": self.detection_service.device
        }

        # Generate Reports
        ReportService.generate_json_report(
            job_id=self.job_id,
            filename=os.path.basename(self.input_path),
            video_metadata=metadata,
            summary=summary,
            tracks=fruit_items,
            settings_info=settings_info,
            output_filepath=self.report_json_path
        )

        ReportService.generate_csv_report(
            job_id=self.job_id,
            tracks=fruit_items,
            output_filepath=self.report_csv_path
        )

        logger.info(f"Image job {self.job_id} completed: {total_fruits} fruits detected ({healthy_count} healthy, {defective_count} defective)")

        return {
            "job_id": self.job_id,
            "status": "completed",
            "metadata": metadata,
            "summary": summary,
            "tracks": fruit_items,
            "image_path": self.output_path,
            "report_path": self.report_json_path,
            "csv_path": self.report_csv_path
        }

    def _render_annotations(
        self,
        frame: np.ndarray,
        fruit_items: List[Dict[str, Any]],
        fruit_counts: Counter,
        healthy_count: int,
        defective_count: int
    ) -> np.ndarray:
        h, w, _ = frame.shape

        # 1. Top HUD Banner
        hud_height = max(44, int(h * 0.065))
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, hud_height), (15, 23, 42), -1)
        cv2.line(overlay, (0, hud_height), (w, hud_height), (16, 185, 129), 2)
        cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)

        # Brand Text
        brand_font_scale = max(0.5, hud_height * 0.012)
        cv2.putText(
            frame,
            "FruitVision AI — Image Inspection",
            (14, int(hud_height * 0.65)),
            cv2.FONT_HERSHEY_DUPLEX,
            brand_font_scale,
            (16, 185, 129),
            2,
            cv2.LINE_AA
        )

        # Telemetry counts string
        total_fruits = len(fruit_items)
        hud_summary = f"TOTAL: {total_fruits}  |  HEALTHY: {healthy_count}  |  DEFECTIVE: {defective_count}"
        (sw, _), _ = cv2.getTextSize(hud_summary, cv2.FONT_HERSHEY_SIMPLEX, brand_font_scale * 0.8, 1)
        cv2.putText(
            frame,
            hud_summary,
            (max(int(w * 0.45), w - sw - 20), int(hud_height * 0.65)),
            cv2.FONT_HERSHEY_SIMPLEX,
            brand_font_scale * 0.8,
            (241, 245, 249),
            1,
            cv2.LINE_AA
        )

        # 2. Render Fruit Bounding Boxes and Badges
        for item in fruit_items:
            x1, y1, x2, y2 = item["bbox"]
            class_name = item["class_name"]
            conf = item["confidence"]
            item_id = item["track_id"]
            quality_label = item.get("quality_label")

            color = self.detection_service.get_fruit_color(class_name)

            # Draw box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

            # Corner accents
            corner_len = min(20, int((x2 - x1) * 0.2), int((y2 - y1) * 0.2))
            if corner_len > 4:
                cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 3, cv2.LINE_AA)

            # Label badge
            label_text = f"#{item_id} {class_name.upper()} {int(conf * 100)}%"
            if quality_label:
                label_text += f" | {quality_label}"

            font_scale = 0.5
            thickness = 1
            (lw, lh), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)

            badge_y1 = max(hud_height + 2, y1 - lh - 10)
            badge_y2 = badge_y1 + lh + 8
            badge_x2 = min(w - 2, x1 + lw + 14)

            cv2.rectangle(frame, (x1, badge_y1), (badge_x2, badge_y2), (15, 23, 42), -1)
            cv2.rectangle(frame, (x1, badge_y1), (badge_x2, badge_y2), color, 1)

            text_x = x1 + 6
            if quality_label:
                q_color = QUALITY_COLORS.get(quality_label, (156, 163, 175))
                cv2.circle(frame, (x1 + 8, badge_y1 + (lh // 2) + 4), 4, q_color, -1)
                text_x = x1 + 18

            cv2.putText(
                frame,
                label_text,
                (text_x, badge_y1 + lh + 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (248, 250, 252),
                thickness,
                cv2.LINE_AA
            )

        return frame

