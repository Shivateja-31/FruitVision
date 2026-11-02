# Sample Videos Directory

This directory contains test streams and generator scripts for verifying FruitVision AI.

## Files
- `generate_sample_video.py`: Generates a synthetic industrial conveyor belt stream containing apples, bananas, and oranges moving across frames.
- `conveyor_fruits.mp4`: 120-frame demonstration video (800x600, 24 FPS) used for verifying the detection and ByteTrack tracking pipeline.
- `test_pipeline_run.py`: Executes the complete pipeline offline and verifies generated output video, JSON summary report, and CSV spreadsheet.

## Generating a New Test Video
Run:
```powershell
.\backend\venv\Scripts\python.exe sample_videos\generate_sample_video.py
```
This produces a fresh `sample_videos/conveyor_fruits.mp4` ready for upload in the workspace.

