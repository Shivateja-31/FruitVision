import os
import time
import math
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from collections import Counter
from datetime import datetime
from pathlib import Path
import cv2
import numpy as np

from app.core.config import settings
from app.services.detection_service import DetectionService, FRUIT_COLORS
from app.services.tracking_service import VideoTracker
from app.services.quality_service import QualityInspectionService
from app.services.report_service import ReportService

logger = logging.getLogger("fruitvision.processor")

# Quality badge color schemes (BGR)
QUALITY_COLORS: Dict[str, Tuple[int, int, int]] = {
    "Healthy": (74, 222, 128),            # Vibrant Emerald Green
    "Visible Damage": (30, 165, 245),      # Amber / Orange
    "Rotten / Spoiled": (68, 68, 239),     # Crimson Red
    "Uncertain": (156, 163, 175),          # Slate Gray
    "Unavailable": (100, 116, 139)        # Muted Slate
}

# Registry for active job status in memory for zero-latency polling
active_jobs_status: Dict[str, Dict[str, Any]] = {}
cancelled_jobs: Set[str] = set()

class VideoProcessor:
    def __init__(
        self,
        job_id: str,
        input_path: str,
        output_path: str,
        report_json_path: str,
        report_csv_path: str,
        confidence_threshold: float = settings.DEFAULT_CONFIDENCE,
        tracking_enabled: bool = True,
        quality_inspection_enabled: bool = False,
        frame_stride: int = 1,
        progress_callback = None
    ):
        self.job_id = job_id
        self.input_path = input_path
        self.output_path = output_path
        self.report_json_path = report_json_path
        self.report_csv_path = report_csv_path
        self.confidence_threshold = confidence_threshold
        self.tracking_enabled = tracking_enabled
        self.quality_inspection_enabled = quality_inspection_enabled
        self.frame_stride = max(1, frame_stride)
        self.progress_callback = progress_callback

        self.detection_service = DetectionService.get_instance()
        self.quality_service = QualityInspectionService.get_instance()
        self.tracker = VideoTracker(tracking_enabled=tracking_enabled)

    @staticmethod
    def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
        return active_jobs_status.get(job_id)

    @staticmethod
    def cancel_job(job_id: str) -> bool:
        cancelled_jobs.add(job_id)
        if job_id in active_jobs_status:
            active_jobs_status[job_id]["status"] = "cancelled"
            active_jobs_status[job_id]["error_message"] = "Analysis cancelled by user."
            return True
        return False

    @staticmethod
    def extract_metadata(video_path: str) -> Dict[str, Any]:
        """Validates video and retrieves basic container metadata."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video file. Format may be corrupted or unsupported.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        if width <= 0 or height <= 0 or frame_count <= 0:
            raise ValueError("Invalid video stream dimensions or frame count.")

        filesize_mb = round(os.path.getsize(video_path) / (1024 * 1024), 2)
        duration = round(frame_count / fps, 2) if fps > 0 else 0.0

        return {
            "filename": os.path.basename(video_path),
            "filesize_mb": filesize_mb,
            "duration_seconds": duration,
            "fps": round(fps, 2),
            "frame_count": frame_count,
            "width": width,
            "height": height,
            "codec": "mp4v"
        }

    def process(self) -> Dict[str, Any]:
        """
        Executes the video processing pipeline:
        Frame extraction -> YOLO detection -> ByteTrack tracking -> Quality inspection -> Annotated video generation
        """
        start_time = time.time()
        logger.info(f"Starting inspection job {self.job_id} for {self.input_path}")

        # Initialize active status
        active_jobs_status[self.job_id] = {
            "status": "processing",
            "progress": 0.0,
            "current_frame": 0,
            "total_frames": 0,
            "fps": 0.0,
            "eta_seconds": 0.0,
            "started_at": datetime.utcnow().isoformat()
        }

        cap = cv2.VideoCapture(self.input_path)
        if not cap.isOpened():
            active_jobs_status[self.job_id]["status"] = "failed"
            active_jobs_status[self.job_id]["error_message"] = "Cannot open video input."
            raise ValueError("Could not open input video stream.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        active_jobs_status[self.job_id]["total_frames"] = total_frames

        # Setup output video writer
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        # Try mp4v codec (standard cross-platform)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_writer = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))
        
        if not out_writer.isOpened():
            # Fallback to avc1 or MJPG if mp4v fails
            logger.warning("mp4v codec failed, trying fallback avc1")
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            out_writer = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))
            if not out_writer.isOpened():
                cap.release()
                raise RuntimeError("Failed to initialize video writer with supported codecs (mp4v, avc1).")

        frame_idx = 0
        processed_frames_count = 0
        last_progress_time = time.time()
        smoothed_fps = 0.0

        try:
            while cap.isOpened():
                if self.job_id in cancelled_jobs:
                    logger.info(f"Job {self.job_id} cancelled during frame {frame_idx}.")
                    active_jobs_status[self.job_id]["status"] = "cancelled"
                    break

                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                frame_idx += 1

                # Frame stride logic: if stride > 1, reuse or skip
                should_process_frame = (frame_idx % self.frame_stride == 0)

                raw_detections = []
                if should_process_frame:
                    if self.tracking_enabled and self.detection_service.model is not None:
                        # Use Ultralytics ByteTrack tracking
                        classes_filter = list(self.detection_service.fruit_class_ids) if self.detection_service.fruit_class_ids else None
                        track_results = self.detection_service.model.track(
                            source=frame,
                            persist=True,
                            tracker="bytetrack.yaml",
                            conf=self.confidence_threshold,
                            classes=classes_filter,
                            verbose=False
                        )
                        if track_results and len(track_results) > 0 and track_results[0].boxes is not None:
                            boxes = track_results[0].boxes
                            for box in boxes:
                                cls_id = int(box.cls[0].item())
                                if cls_id in self.detection_service.fruit_class_names:
                                    conf = float(box.conf[0].item())
                                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                                    t_id = int(box.id[0].item()) if box.id is not None else None
                                    raw_detections.append({
                                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                                        "confidence": round(conf, 4),
                                        "class_id": cls_id,
                                        "class_name": self.detection_service.fruit_class_names[cls_id],
                                        "track_id": t_id
                                    })
                    else:
                        # Detection only without tracking
                        raw_detections = self.detection_service.detect_frame(
                            frame,
                            conf_threshold=self.confidence_threshold
                        )

                # Update tracker with detections
                tracked_detections = self.tracker.update_frame(raw_detections, frame_idx)

                # Quality inspection on detected crops (if enabled)
                if self.quality_inspection_enabled and should_process_frame:
                    for det in tracked_detections:
                        bx1, by1, bx2, by2 = det["bbox"]
                        bx1 = max(0, min(width - 1, bx1))
                        by1 = max(0, min(height - 1, by1))
                        bx2 = max(0, min(width, bx2))
                        by2 = max(0, min(height, by2))
                        
                        if (bx2 - bx1) >= 20 and (by2 - by1) >= 20:
                            crop = frame[by1:by2, bx1:bx2]
                            q_res = self.quality_service.inspect_crop(
                                crop,
                                fruit_class=det["class_name"]
                            )
                            det["quality_label"] = q_res["quality_label"]
                            det["quality_confidence"] = q_res["confidence"]
                            det["is_uncertain"] = q_res["is_uncertain"]

                            # Also persist onto the Track object
                            tid = det.get("track_id")
                            if tid and tid in self.tracker.tracks:
                                track_obj = self.tracker.tracks[tid]
                                # Keep most confident quality assessment
                                if track_obj.quality_confidence is None or (q_res["confidence"] > track_obj.quality_confidence):
                                    track_obj.quality_label = q_res["quality_label"]
                                    track_obj.quality_confidence = q_res["confidence"]
                                    track_obj.is_uncertain = q_res["is_uncertain"]

                # Render annotations onto frame
                annotated_frame = self._render_annotations(
                    frame.copy(),
                    tracked_detections,
                    frame_idx,
                    total_frames,
                    fps
                )

                out_writer.write(annotated_frame)
                processed_frames_count += 1

                # Update progress calculation
                now = time.time()
                if (now - last_progress_time) >= 0.25 or frame_idx == total_frames:
                    elapsed = now - start_time
                    current_fps = processed_frames_count / elapsed if elapsed > 0 else 0.0
                    smoothed_fps = 0.8 * smoothed_fps + 0.2 * current_fps if smoothed_fps > 0 else current_fps
                    progress_pct = round((frame_idx / total_frames) * 100.0, 1)
                    remaining_frames = max(0, total_frames - frame_idx)
                    eta_seconds = round(remaining_frames / smoothed_fps, 1) if smoothed_fps > 0 else 0.0

                    active_jobs_status[self.job_id].update({
                        "progress": progress_pct,
                        "current_frame": frame_idx,
                        "fps": round(smoothed_fps, 1),
                        "eta_seconds": eta_seconds
                    })
                    last_progress_time = now

                    if self.progress_callback:
                        self.progress_callback(self.job_id, progress_pct, frame_idx, total_frames)

        finally:
            cap.release()
            out_writer.release()

        # Handle cancellation cleanup
        if self.job_id in cancelled_jobs:
            logger.info(f"Cleaning up cancelled job {self.job_id}")
            if os.path.exists(self.output_path):
                try:
                    os.remove(self.output_path)
                except Exception:
                    pass
            active_jobs_status[self.job_id]["status"] = "cancelled"
            return {"status": "cancelled", "job_id": self.job_id}

        processing_time = round(time.time() - start_time, 2)
        avg_throughput = round(processed_frames_count / processing_time, 2) if processing_time > 0 else 0.0

        # Build summary metrics
        unique_fruits = self.tracker.get_unique_fruit_count()
        fruit_counts = self.tracker.get_fruit_counts()
        fruit_percentages = self.tracker.get_fruit_percentages()
        track_summaries = self.tracker.get_track_summaries()
        avg_confidence = round(self.tracker.get_average_confidence(), 4)

        # Quality breakdown
        healthy_count = sum(1 for t in track_summaries if t.get("quality_label") == "Healthy")
        defective_count = sum(1 for t in track_summaries if t.get("quality_label") in ["Visible Damage", "Rotten / Spoiled"])
        uncertain_count = sum(1 for t in track_summaries if t.get("quality_label") == "Uncertain" or t.get("is_uncertain"))

        defect_breakdown = {
            "Visible Damage": sum(1 for t in track_summaries if t.get("quality_label") == "Visible Damage"),
            "Rotten / Spoiled": sum(1 for t in track_summaries if t.get("quality_label") == "Rotten / Spoiled")
        }

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
            "total_frames_processed": processed_frames_count,
            "total_detections": self.tracker.total_frame_detections,
            "unique_fruits": unique_fruits,
            "fruit_counts": fruit_counts,
            "fruit_percentages": fruit_percentages,
            "quality_summary": quality_summary,
            "avg_confidence": avg_confidence,
            "processing_time_seconds": processing_time,
            "fps_throughput": avg_throughput
        }

        video_metadata = self.extract_metadata(self.input_path)

        settings_info = {
            "confidence_threshold": self.confidence_threshold,
            "tracking_enabled": self.tracking_enabled,
            "quality_inspection_enabled": self.quality_inspection_enabled,
            "frame_stride": self.frame_stride,
            "detection_model": os.path.basename(self.detection_service.model_path),
            "device": self.detection_service.device
        }

        # Generate JSON and CSV reports
        ReportService.generate_json_report(
            job_id=self.job_id,
            filename=os.path.basename(self.input_path),
            video_metadata=video_metadata,
            summary=summary,
            tracks=track_summaries,
            settings_info=settings_info,
            output_filepath=self.report_json_path
        )

        ReportService.generate_csv_report(
            job_id=self.job_id,
            tracks=track_summaries,
            output_filepath=self.report_csv_path
        )

        # Mark completed
        active_jobs_status[self.job_id].update({
            "status": "completed",
            "progress": 100.0,
            "current_frame": total_frames,
            "fps": avg_throughput,
            "eta_seconds": 0.0,
            "completed_at": datetime.utcnow().isoformat()
        })

        logger.info(f"Job {self.job_id} successfully completed in {processing_time}s! Unique fruits: {unique_fruits}")

        return {
            "job_id": self.job_id,
            "status": "completed",
            "metadata": video_metadata,
            "summary": summary,
            "tracks": track_summaries,
            "video_path": self.output_path,
            "report_path": self.report_json_path,
            "csv_path": self.report_csv_path
        }

    def _render_annotations(
        self,
        frame: np.ndarray,
        detections: List[Dict],
        frame_idx: int,
        total_frames: int,
        video_fps: float
    ) -> np.ndarray:
        """
        Renders aesthetic bounding boxes, tracking badges, quality tags, and HUD telemetry banner.
        """
        h, w, _ = frame.shape

        # 1. Top HUD Banner
        hud_height = 42
        # Overlay translucent black bar
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, hud_height), (15, 23, 42), -1) # Dark navy
        cv2.line(overlay, (0, hud_height), (w, hud_height), (16, 185, 129), 2) # Emerald accent border
        cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

        # FruitVision AI brand text
        brand_text = "FruitVision AI"
        cv2.putText(frame, brand_text, (14, 26), cv2.FONT_HERSHEY_DUPLEX, 0.65, (16, 185, 129), 2, cv2.LINE_AA)

        # Frame progress & throughput
        frame_text = f"FRAME {frame_idx}/{total_frames}  |  UNIQUE: {self.tracker.get_unique_fruit_count()}"
        cv2.putText(frame, frame_text, (200, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (241, 245, 249), 1, cv2.LINE_AA)

        # Active fruits breakdown on top right
        active_counts = Counter([d["class_name"] for d in detections])
        counts_str = " ".join([f"{k.capitalize()}:{v}" for k, v in active_counts.items()]) if active_counts else "No targets"
        (t_w, _), _ = cv2.getTextSize(counts_str, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.putText(frame, counts_str, (max(w - t_w - 18, 500), 26), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (52, 211, 153), 1, cv2.LINE_AA)

        # 2. Render each detected fruit
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            class_name = det["class_name"]
            conf = det["confidence"]
            track_id = det.get("track_id")
            quality_label = det.get("quality_label")

            color = self.detection_service.get_fruit_color(class_name)

            # Draw smooth bounding box with corner accents
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)
            
            # Corner accents
            corner_len = min(16, int((x2 - x1) * 0.25), int((y2 - y1) * 0.25))
            if corner_len > 4:
                # Top-left
                cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 3, cv2.LINE_AA)
                # Top-right
                cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 3, cv2.LINE_AA)
                # Bottom-left
                cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 3, cv2.LINE_AA)
                # Bottom-right
                cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 3, cv2.LINE_AA)
                cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 3, cv2.LINE_AA)

            # Compose label badge text
            label_text = f"#{track_id} {class_name.upper()} {int(conf * 100)}%" if track_id else f"{class_name.upper()} {int(conf * 100)}%"
            if quality_label:
                label_text += f" | {quality_label}"

            font_scale = 0.48
            thickness = 1
            (lw, lh), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
            
            badge_y1 = max(hud_height + 2, y1 - lh - 10)
            badge_y2 = badge_y1 + lh + 8
            badge_x2 = min(w - 2, x1 + lw + 12)

            # Draw label background badge
            cv2.rectangle(frame, (x1, badge_y1), (badge_x2, badge_y2), (15, 23, 42), -1)
            cv2.rectangle(frame, (x1, badge_y1), (badge_x2, badge_y2), color, 1)

            # Quality color indicator dot if quality present
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
