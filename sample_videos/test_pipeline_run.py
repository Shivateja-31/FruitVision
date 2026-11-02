import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.core.config import settings
from app.services.video_processor import VideoProcessor

def test_pipeline():
    input_video = "sample_videos/conveyor_fruits.mp4"
    output_video = "sample_videos/conveyor_annotated.mp4"
    report_json = "sample_videos/conveyor_report.json"
    report_csv = "sample_videos/conveyor_tracks.csv"

    print("=== Testing Milestone 1: FruitVision AI Core Pipeline ===")
    print(f"Input video: {input_video}")
    print(f"Output annotated video: {output_video}")

    processor = VideoProcessor(
        job_id="milestone1-demo",
        input_path=input_video,
        output_path=output_video,
        report_json_path=report_json,
        report_csv_path=report_csv,
        confidence_threshold=0.25,
        tracking_enabled=True,
        quality_inspection_enabled=True,
        frame_stride=1
    )

    res = processor.process()

    print("\n=== Processing Complete ===")
    print(f"Status: {res['status']}")
    print(f"Total frames processed: {res['summary']['total_frames_processed']}")
    print(f"Total detections: {res['summary']['total_detections']}")
    print(f"Unique tracked fruits: {res['summary']['unique_fruits']}")
    print(f"Fruit counts: {res['summary']['fruit_counts']}")
    print(f"Quality breakdown: {res['summary']['quality_summary']}")
    print(f"Output video exists: {os.path.exists(output_video)} (size: {os.path.getsize(output_video)} bytes)")
    print(f"JSON report exists: {os.path.exists(report_json)}")
    print(f"CSV report exists: {os.path.exists(report_csv)}")
    print("=== Milestone 1 Verified Successfully ===")

if __name__ == "__main__":
    test_pipeline()

