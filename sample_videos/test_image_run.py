import os
import sys
import cv2
import numpy as np

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))

from sample_videos.generate_sample_video import draw_apple, draw_orange, draw_banana
from app.services.image_processor import ImageProcessor

def run_test():
    h, w = 600, 800
    img = np.full((h, w, 3), (35, 30, 28), dtype=np.uint8)

    # Table surface
    cv2.rectangle(img, (0, 150), (w, h), (55, 48, 44), -1)
    cv2.line(img, (0, 150), (w, 150), (80, 72, 65), 3)

    # 1. Healthy Red Apple
    draw_apple(img, (180, 320), radius=50)

    # 2. Damaged Apple with dark rot spots
    draw_apple(img, (360, 320), radius=52)
    # Add visible dark rot spots on surface
    cv2.circle(img, (345, 310), 16, (15, 20, 30), -1)
    cv2.circle(img, (370, 335), 14, (12, 18, 25), -1)
    cv2.ellipse(img, (350, 330), (12, 8), 45, 0, 360, (20, 25, 40), -1)

    # 3. Healthy Orange
    draw_orange(img, (540, 330), radius=48)

    # 4. Golden Banana
    draw_banana(img, (400, 480), scale=1.3)

    test_img_path = "sample_videos/test_fruit_basket.jpg"
    cv2.imwrite(test_img_path, img)
    print("Generated test image at:", test_img_path)

    # Run ImageProcessor
    processor = ImageProcessor(
        job_id="test-image-demo",
        input_path=test_img_path,
        output_path="sample_videos/test_fruit_annotated.jpg",
        report_json_path="sample_videos/test_image_report.json",
        report_csv_path="sample_videos/test_image_tracks.csv",
        confidence_threshold=0.25,
        quality_inspection_enabled=True
    )

    res = processor.process()
    print("\n=== Image Processing Results ===")
    print("Total detected fruits:", res["summary"]["unique_fruits"])
    print("Fruit counts:", res["summary"]["fruit_counts"])
    print("Quality breakdown:", res["summary"]["quality_summary"])
    print("Individual items:")
    for item in res["tracks"]:
        print(f"  - Fruit #{item['track_id']} {item['class_name'].upper()}: {item['quality_label']} (confidence: {item['quality_confidence']})")
    print(f"Annotated image saved: {os.path.exists('sample_videos/test_fruit_annotated.jpg')} (size: {os.path.getsize('sample_videos/test_fruit_annotated.jpg')} bytes)")

if __name__ == "__main__":
    run_test()

