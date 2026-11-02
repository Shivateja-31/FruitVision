import logging
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict, Counter
import numpy as np

logger = logging.getLogger("fruitvision.tracking")

class TrackedFruit:
    def __init__(self, track_id: int, class_name: str, class_id: int, initial_conf: float, frame_idx: int, bbox: List[int]):
        self.track_id = track_id
        self.class_votes: Counter = Counter([class_name])
        self.canonical_class: str = class_name
        self.class_id = class_id
        self.confidences: List[float] = [initial_conf]
        self.first_frame: int = frame_idx
        self.last_frame: int = frame_idx
        self.detection_count: int = 1
        self.last_bbox: List[int] = bbox
        self.quality_label: Optional[str] = None
        self.quality_confidence: Optional[float] = None
        self.is_uncertain: bool = False

    def update(self, class_name: str, conf: float, frame_idx: int, bbox: List[int]):
        self.class_votes[class_name] += 1
        self.canonical_class = self.class_votes.most_common(1)[0][0]
        self.confidences.append(conf)
        self.last_frame = frame_idx
        self.detection_count += 1
        self.last_bbox = bbox

    @property
    def avg_confidence(self) -> float:
        return float(np.mean(self.confidences)) if self.confidences else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "class_name": self.canonical_class,
            "detection_count": self.detection_count,
            "avg_confidence": round(self.avg_confidence, 4),
            "first_frame": self.first_frame,
            "last_frame": self.last_frame,
            "quality_label": self.quality_label,
            "quality_confidence": round(self.quality_confidence, 4) if self.quality_confidence is not None else None,
            "is_uncertain": self.is_uncertain
        }

class VideoTracker:
    """
    Manages tracking state and track aggregation for a single video analysis job.
    """
    def __init__(self, tracking_enabled: bool = True):
        self.tracking_enabled = tracking_enabled
        self.tracks: Dict[int, TrackedFruit] = {}
        self.next_untracked_id: int = 100000
        self.total_frame_detections: int = 0

    def update_frame(
        self,
        raw_detections: List[Dict],
        frame_idx: int,
        tracking_results=None
    ) -> List[Dict]:
        """
        Takes raw detections and optional Ultralytics tracking results.
        Returns tracked detections with track_id attached.
        """
        self.total_frame_detections += len(raw_detections)
        processed_frame_detections = []

        for det in raw_detections:
            track_id = det.get("track_id")
            
            # If tracking is disabled or track_id is absent, assign a synthetic sequential ID per detection
            if not self.tracking_enabled or track_id is None:
                self.next_untracked_id += 1
                assigned_id = self.next_untracked_id
            else:
                assigned_id = int(track_id)

            class_name = det["class_name"]
            conf = det["confidence"]
            bbox = det["bbox"]

            if assigned_id in self.tracks:
                self.tracks[assigned_id].update(class_name, conf, frame_idx, bbox)
            else:
                self.tracks[assigned_id] = TrackedFruit(
                    track_id=assigned_id,
                    class_name=class_name,
                    class_id=det.get("class_id", -1),
                    initial_conf=conf,
                    frame_idx=frame_idx,
                    bbox=bbox
                )

            # Build enriched detection for current frame rendering
            tracked_det = {
                "bbox": bbox,
                "confidence": conf,
                "class_name": self.tracks[assigned_id].canonical_class,
                "track_id": assigned_id if self.tracking_enabled else None,
                "quality_label": self.tracks[assigned_id].quality_label,
                "quality_confidence": self.tracks[assigned_id].quality_confidence,
                "is_uncertain": self.tracks[assigned_id].is_uncertain
            }
            processed_frame_detections.append(tracked_det)

        return processed_frame_detections

    def get_unique_fruit_count(self) -> int:
        return len(self.tracks)

    def get_fruit_counts(self) -> Dict[str, int]:
        counts: Dict[str, int] = defaultdict(int)
        for track in self.tracks.values():
            counts[track.canonical_class] += 1
        return dict(counts)

    def get_fruit_percentages(self) -> Dict[str, float]:
        counts = self.get_fruit_counts()
        total = sum(counts.values())
        if total == 0:
            return {}
        return {k: round((v / total) * 100.0, 2) for k, v in counts.items()}

    def get_track_summaries(self) -> List[Dict[str, Any]]:
        return [track.to_dict() for track in sorted(self.tracks.values(), key=lambda t: t.track_id)]

    def get_average_confidence(self) -> float:
        if not self.tracks:
            return 0.0
        all_confs = [c for t in self.tracks.values() for c in t.confidences]
        return float(np.mean(all_confs)) if all_confs else 0.0

