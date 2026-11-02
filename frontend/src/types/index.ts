export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  device: string;
  detection_model: string;
  supported_classes: string[];
  quality_model_available: boolean;
  quality_model_mode: string;
  timestamp: string;
}

export interface ConfigResponse {
  app_name: string;
  version: string;
  supported_classes: string[];
  extension_path_documented: boolean;
  allowed_extensions: string[];
  max_upload_size_mb: number;
  default_confidence: number;
  default_frame_stride: number;
  supported_quality_labels: string[];
  device: string;
}

export interface VideoMetadata {
  filename: string;
  filesize_mb: number;
  duration_seconds: number;
  fps: number;
  frame_count: number;
  width: number;
  height: number;
  codec: string;
}

export interface QualitySummary {
  mode: string;
  model_identity?: string;
  healthy_count: number;
  defective_count: number;
  uncertain_count: number;
  defect_breakdown?: Record<string, number>;
}

export interface TrackSummary {
  track_id: number;
  class_name: string;
  detection_count: number;
  avg_confidence: number;
  first_frame: number;
  last_frame: number;
  quality_label?: string;
  quality_confidence?: number;
  is_uncertain?: boolean;
}

export interface InspectionSummary {
  total_frames_processed: number;
  total_detections: number;
  unique_fruits: number;
  fruit_counts: Record<string, number>;
  fruit_percentages: Record<string, number>;
  quality_summary: QualitySummary;
  avg_confidence: number;
  processing_time_seconds: number;
  fps_throughput: number;
}

export interface InspectionJob {
  id: string;
  filename: string;
  media_type?: 'video' | 'image';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_frame: number;
  total_frames: number;
  fps: number;
  eta_seconds: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata?: VideoMetadata;
  summary?: InspectionSummary;
  tracks?: TrackSummary[];
  has_video: boolean;
  has_image?: boolean;
  has_report: boolean;
  has_csv: boolean;
}

export interface InspectionListResponse {
  jobs: InspectionJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface InspectionUploadOptions {
  file: File;
  confidence: number;
  trackingEnabled: boolean;
  qualityEnabled: boolean;
  frameStride: number;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
}

