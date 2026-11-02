import csv
import json
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

class ReportService:
    @staticmethod
    def generate_json_report(
        job_id: str,
        filename: str,
        video_metadata: Dict[str, Any],
        summary: Dict[str, Any],
        tracks: List[Dict[str, Any]],
        settings_info: Dict[str, Any],
        output_filepath: str
    ) -> str:
        report_data = {
            "project": "FruitVision AI",
            "title": "Automated Multi-Fruit Detection, Tracking and Quality Inspection Report",
            "job_id": job_id,
            "filename": filename,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "academic_project_objectives": [
                "Objective 1: Multi-fruit object detection using deep learning YOLO model",
                "Objective 2: Multi-object tracking (ByteTrack) and unique object counting",
                "Objective 3: Quality inspection and defect assessment with uncertainty handling"
            ],
            "video_metadata": video_metadata,
            "analysis_settings": settings_info,
            "summary_metrics": summary,
            "tracked_objects": tracks,
            "disclaimer": "Quality classifications are external visual defect assessments only. Heuristics or models do not verify internal flesh integrity or bacterial safety."
        }
        
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        with open(output_filepath, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)
            
        return output_filepath

    @staticmethod
    def generate_csv_report(
        job_id: str,
        tracks: List[Dict[str, Any]],
        output_filepath: str
    ) -> str:
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        fieldnames = [
            "track_id",
            "class_name",
            "detection_count",
            "avg_confidence",
            "first_frame",
            "last_frame",
            "quality_label",
            "quality_confidence",
            "is_uncertain"
        ]
        
        with open(output_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for track in tracks:
                row = {
                    "track_id": track.get("track_id", ""),
                    "class_name": track.get("class_name", ""),
                    "detection_count": track.get("detection_count", 0),
                    "avg_confidence": track.get("avg_confidence", 0.0),
                    "first_frame": track.get("first_frame", 0),
                    "last_frame": track.get("last_frame", 0),
                    "quality_label": track.get("quality_label", "N/A"),
                    "quality_confidence": track.get("quality_confidence", ""),
                    "is_uncertain": track.get("is_uncertain", False)
                }
                writer.writerow(row)
                
        return output_filepath

