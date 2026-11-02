import cv2
import numpy as np
import os
import math

def draw_apple(img, center, radius):
    cx, cy = center
    # Body (vibrant red with subtle gradient)
    cv2.circle(img, (cx - int(radius*0.3), cy), int(radius*0.75), (35, 45, 220), -1, cv2.LINE_AA)
    cv2.circle(img, (cx + int(radius*0.3), cy), int(radius*0.75), (35, 45, 220), -1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy + int(radius*0.2)), int(radius*0.8), (30, 40, 210), -1, cv2.LINE_AA)
    # Highlight
    cv2.ellipse(img, (cx - int(radius*0.4), cy - int(radius*0.3)), (int(radius*0.25), int(radius*0.4)), -30, 0, 360, (70, 80, 240), -1, cv2.LINE_AA)
    # Stem
    cv2.line(img, (cx, cy - int(radius*0.6)), (cx + 5, cy - int(radius*1.1)), (20, 60, 100), 3, cv2.LINE_AA)
    # Leaf
    cv2.ellipse(img, (cx + 12, cy - int(radius*0.9)), (10, 4), 30, 0, 360, (50, 180, 60), -1, cv2.LINE_AA)

def draw_orange(img, center, radius):
    cx, cy = center
    # Body (orange)
    cv2.circle(img, (cx, cy), radius, (25, 140, 255), -1, cv2.LINE_AA)
    # Texture dimples
    for dx in range(-radius + 10, radius - 10, 12):
        for dy in range(-radius + 10, radius - 10, 12):
            if dx*dx + dy*dy < (radius - 8)**2:
                cv2.circle(img, (cx + dx, cy + dy), 1, (20, 115, 230), -1)
    # Highlight
    cv2.circle(img, (cx - int(radius*0.35), cy - int(radius*0.35)), int(radius*0.25), (60, 175, 255), -1, cv2.LINE_AA)
    # Stem button
    cv2.circle(img, (cx, cy - radius + 3), 4, (40, 120, 40), -1, cv2.LINE_AA)

def draw_banana(img, center, scale=1.0):
    cx, cy = center
    # Curved banana body using polygon
    pts = []
    for angle in np.linspace(-0.8, 0.8, 20):
        r = 60 * scale
        x = cx + r * math.sin(angle)
        y = cy + (r * 0.7) * math.cos(angle)
        pts.append([int(x), int(y)])
    for angle in np.linspace(0.8, -0.8, 20):
        r = 45 * scale
        x = cx + r * math.sin(angle)
        y = cy + (r * 0.65) * math.cos(angle) + 8
        pts.append([int(x), int(y)])
    pts_arr = np.array(pts, np.int32)
    cv2.fillPoly(img, [pts_arr], (30, 215, 250), lineType=cv2.LINE_AA)
    # Stem tip
    cv2.circle(img, tuple(pts[0]), 5, (20, 80, 60), -1, cv2.LINE_AA)
    cv2.circle(img, tuple(pts[-1]), 4, (30, 70, 50), -1, cv2.LINE_AA)

def create_sample_video(output_path: str, num_frames: int = 120, fps: int = 24):
    width, height = 800, 600
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    for f in range(num_frames):
        # Conveyor belt style background with soft industrial lighting
        frame = np.full((height, width, 3), (35, 30, 28), dtype=np.uint8)
        # Conveyor belt surface
        cv2.rectangle(frame, (0, 120), (width, 480), (55, 50, 48), -1)
        # Conveyor moving roller slats
        offset = (f * 6) % 40
        for x in range(-40 + offset, width + 40, 40):
            cv2.line(frame, (x, 120), (x, 480), (45, 40, 38), 2)
        # Belt edges
        cv2.line(frame, (0, 120), (width, 120), (80, 75, 70), 3)
        cv2.line(frame, (0, 480), (width, 480), (80, 75, 70), 3)

        # Fruit 1: Red Apple moving horizontally from left to right
        x_apple = int(80 + (f * 5.0)) % (width + 100) - 50
        y_apple = 220 + int(math.sin(f * 0.1) * 8)
        draw_apple(frame, (x_apple, y_apple), radius=42)

        # Fruit 2: Orange moving along middle lane
        x_orange = int(240 + (f * 4.2)) % (width + 100) - 50
        y_orange = 360 + int(math.cos(f * 0.08) * 6)
        draw_orange(frame, (x_orange, y_orange), radius=38)

        # Fruit 3: Banana in top lane
        x_banana = int(450 + (f * 3.8)) % (width + 100) - 50
        y_banana = 280
        draw_banana(frame, (x_banana, y_banana), scale=1.1)

        out.write(frame)

    out.release()
    print(f"Sample video generated at: {output_path} ({num_frames} frames, {width}x{height}, {fps} FPS)")

if __name__ == "__main__":
    os.makedirs("sample_videos", exist_ok=True)
    create_sample_video("sample_videos/conveyor_fruits.mp4")

