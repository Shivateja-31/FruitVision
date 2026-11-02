import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Film, 
  Image as ImageIcon,
  Sliders, 
  Layers, 
  Play, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  StopCircle, 
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { apiService } from '../services/api';
import { InspectionJob, ConfigResponse } from '../types';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'video' | 'image'
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('image');

  // Selected file and preview
  const [file, setFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isImageFile, setIsImageFile] = useState<boolean>(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [mediaResolution, setMediaResolution] = useState<{ width: number; height: number } | null>(null);

  // Settings
  const [confidence, setConfidence] = useState<number>(0.35);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
  const [qualityEnabled, setQualityEnabled] = useState<boolean>(true);
  const [frameStride, setFrameStride] = useState<number>(1);

  // Upload & Processing state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [activeJob, setActiveJob] = useState<InspectionJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSampleMedia = async (sampleType: 'image' | 'video') => {
    try {
      setLoadingSample(sampleType);
      setErrorMessage(null);
      const filename = sampleType === 'image' ? 'real_fruits.jpg' : 'conveyor_fruits.mp4';
      const response = await fetch(`http://localhost:8000/api/samples/${filename}`);
      if (!response.ok) {
        throw new Error('Could not fetch sample media from backend.');
      }
      const blob = await response.blob();
      const mimeType = sampleType === 'image' ? 'image/jpeg' : 'video/mp4';
      const sampleFile = new File([blob], filename, { type: mimeType });
      handleFileSelection(sampleFile);
    } catch (err: any) {
      setErrorMessage('Failed to load sample: ' + (err.message || err));
    } finally {
      setLoadingSample(null);
    }
  };

  // Fetch backend configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const cfg = await apiService.getConfig();
        setConfidence(cfg.default_confidence);
      } catch (err) {
        console.warn('Could not load backend config, using defaults.');
      }
    };
    fetchConfig();
  }, []);

  // Poll active job status if processing
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (activeJob && (activeJob.status === 'processing' || activeJob.status === 'pending')) {
      timer = setInterval(async () => {
        try {
          const updated = await apiService.getInspection(activeJob.id);
          setActiveJob(updated);
          if (updated.status === 'completed') {
            clearInterval(timer);
          } else if (updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(timer);
            setErrorMessage(updated.error_message || `Job ${updated.status}`);
          }
        } catch (err) {
          console.error('Error polling job status:', err);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeJob]);

  const handleFileSelection = (selectedFile: File) => {
    setErrorMessage(null);
    const validVideoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const validImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const allExts = [...validVideoExts, ...validImageExts];

    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!allExts.includes(ext)) {
      setErrorMessage(`Invalid format "${ext}". Supported: Images (JPG, PNG, WebP) or Videos (MP4, AVI, MOV).`);
      return;
    }

    if (selectedFile.size > 250 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 250MB limit.');
      return;
    }

    const isImg = validImageExts.includes(ext);
    setIsImageFile(isImg);
    if (isImg) {
      setActiveTab('image');
    } else {
      setActiveTab('video');
    }

    setFile(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);
    setMediaPreviewUrl(previewUrl);

    // If image, inspect resolution
    if (isImg) {
      const img = new Image();
      img.onload = () => {
        setMediaResolution({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewUrl;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setMediaResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
      setMediaPreviewUrl(null);
    }
    setVideoDuration(null);
    setMediaResolution(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      setErrorMessage('Please select an image or video file first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const job = await apiService.uploadInspection({
        file,
        confidence,
        trackingEnabled: !isImageFile && trackingEnabled,
        qualityEnabled,
        frameStride,
        onUploadProgress: (p) => {
          if (p.total) {
            setUploadProgress(Math.round((p.loaded / p.total) * 100));
          }
        }
      });

      setIsUploading(false);
      setActiveJob(job);
    } catch (err: any) {
      setIsUploading(false);
      const detail = err.response?.data?.detail || err.message || 'Failed to start inspection.';
      setErrorMessage(detail);
    }
  };

  const handleCancelJob = async () => {
    if (activeJob) {
      try {
        await apiService.cancelInspection(activeJob.id);
        setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      } catch (err) {
        console.error('Cancellation failed:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Inspection Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload fruit images or conveyor video streams to detect classes, count objects, and grade health & defect quality.
          </p>
        </div>

        {/* Media Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl w-fit">
          <button
            onClick={() => { setActiveTab('image'); clearSelectedFile(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'image'
                ? 'bg-brand-500 text-white shadow-glow-emerald'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Still Image</span>
          </button>

          <button
            onClick={() => { setActiveTab('video'); clearSelectedFile(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'video'
                ? 'bg-brand-500 text-white shadow-glow-emerald'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Video Stream</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold block">Inspection Notice</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Upload & Preview (Left) vs Settings & Execution (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Dropzone or Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card">
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {isImageFile ? <ImageIcon className="w-4 h-4 text-brand-400" /> : <Film className="w-4 h-4 text-brand-400" />}
                <span>{isImageFile ? 'Fruit Image Input' : 'Video Stream Input'}</span>
              </h3>
              {file && (
                <button
                  onClick={clearSelectedFile}
                  disabled={activeJob?.status === 'processing'}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove file</span>
                </button>
              )}
            </div>

            {!file ? (
              /* Dropzone */
              <div className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[300px] ${
                    isDragging
                      ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
                      : 'border-slate-700/80 hover:border-brand-500/60 bg-slate-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp,.mp4,.avi,.mov,.mkv,.webm,image/*,video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                  />
                  
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>

                  <h4 className="text-base font-bold text-white mb-1">
                    Drag & Drop Fruit Image or Video Stream
                  </h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-sm">
                    Accepts JPG, PNG, WebP photos or MP4, AVI, MOV, WebM videos up to 250MB. Auto-detects media format.
                  </p>

                  <span className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                    Browse Files
                  </span>
                </div>

                {/* Quick Sample Media Loader Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Demo Samples:</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => loadSampleMedia('image')}
                      disabled={loadingSample !== null}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-750 hover:border-sky-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      title="Load sample photo with apples and oranges"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{loadingSample === 'image' ? 'Loading...' : 'Try Fruit Photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => loadSampleMedia('video')}
                      disabled={loadingSample !== null}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-755 hover:border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      title="Load sample conveyor fruit stream"
                    >
                      <Film className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{loadingSample === 'video' ? 'Loading...' : 'Try Conveyor Video'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Preview */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center">
                  {isImageFile ? (
                    <img
                      src={mediaPreviewUrl || undefined}
                      alt="Uploaded Fruit Preview"
                      className="max-h-full max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={mediaPreviewUrl || undefined}
                      controls
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      className="max-h-full max-w-full rounded-2xl"
                    />
                  )}
                </div>

                {/* File Metadata Badges */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">File Name</span>
                    <span className="font-mono text-slate-200 truncate block mt-0.5" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">File Size</span>
                    <span className="font-mono text-slate-200 block mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {isImageFile ? 'Resolution' : 'Duration / Res'}
                    </span>
                    <span className="font-mono text-slate-200 block mt-0.5">
                      {isImageFile 
                        ? (mediaResolution ? `${mediaResolution.width}x${mediaResolution.height} px` : '--')
                        : (videoDuration ? `${videoDuration.toFixed(1)}s` : '--')
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Model Capabilities Notice */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-200 block">Supported Fruit Detection Categories</span>
              <span className="text-slate-400 text-[11px]">COCO Pretrained Detection Classes</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">Apple</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">Banana</span>
              <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-300 font-medium">Orange</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">+ Custom Classes</span>
            </div>
          </div>

        </div>

        {/* Right Column: Parameters & Execution */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <span>Inspection Parameters</span>
            </h3>

            {/* Confidence Threshold Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Detection Confidence Threshold</span>
                <span className="font-mono font-bold text-brand-400 text-sm">{(confidence * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                disabled={activeJob?.status === 'processing'}
                className="w-full accent-brand-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Lower confidence detects partially occluded fruits; higher confidence minimizes false detections.
              </p>
            </div>

            {/* Quality Inspection Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Visual Quality Inspection</span>
                <span className="text-xs text-slate-400">Identifies Healthy vs Damaged vs Rotten</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualityEnabled}
                  onChange={(e) => setQualityEnabled(e.target.checked)}
                  disabled={activeJob?.status === 'processing'}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>

            {/* Video-Only Options: Tracking & Stride */}
            {!isImageFile && (
              <>
                {/* Tracking Toggle */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">ByteTrack Object Tracking</span>
                    <span className="text-xs text-slate-400">Persistent track IDs & unique counts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackingEnabled}
                      onChange={(e) => setTrackingEnabled(e.target.checked)}
                      disabled={activeJob?.status === 'processing'}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                {/* Frame Stride Selector */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Sampling Rate</span>
                    <span className="font-mono text-slate-300">
                      {frameStride === 1 ? 'Every Frame (1x)' : `Every ${frameStride}nd Frame`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 4].map((stride) => (
                      <button
                        key={stride}
                        type="button"
                        onClick={() => setFrameStride(stride)}
                        disabled={activeJob?.status === 'processing'}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                          frameStride === stride
                            ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                            : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {stride === 1 ? '1x (Full)' : `${stride}x Speed`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action Button */}
            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={handleStartAnalysis}
                disabled={!file || isUploading || activeJob?.status === 'processing'}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                  !file || isUploading || activeJob?.status === 'processing'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow-emerald hover:shadow-glow-emerald-lg'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading Media ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{isImageFile ? 'Start Image Inspection' : 'Start Video Analysis'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Active Job Progress / Completion Card */}
          {activeJob && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-card animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeJob.status === 'processing' || activeJob.status === 'pending' ? (
                    <div className="w-3 h-3 rounded-full bg-brand-500 animate-ping" />
                  ) : activeJob.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-brand-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <h4 className="text-sm font-bold text-white capitalize">
                    {activeJob.status === 'processing' 
                      ? 'Running AI Inference...' 
                      : activeJob.status === 'completed' 
                      ? 'Inspection Completed!' 
                      : activeJob.status}
                  </h4>
                </div>

                {activeJob.status === 'processing' && (
                  <button
                    onClick={handleCancelJob}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {/* Progress Bar (Video) or Quick Stats (Image) */}
              {activeJob.media_type !== 'image' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Frame {activeJob.current_frame || 0} / {activeJob.total_frames || '--'}
                    </span>
                    <span className="font-bold text-brand-400">
                      {activeJob.progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${activeJob.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                activeJob.summary && (
                  <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>Total Fruits Detected:</span>
                      <span className="font-mono text-brand-400 text-sm">{activeJob.summary.unique_fruits}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Healthy: {activeJob.summary.quality_summary.healthy_count}</span>
                      <span>Defective: {activeJob.summary.quality_summary.defective_count}</span>
                    </div>
                  </div>
                )
              )}

              {/* When Completed: Direct View Results Button */}
              {activeJob.status === 'completed' && (
                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/results/${activeJob.id}`)}
                    className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all shadow-glow-emerald flex items-center justify-center gap-2"
                  >
                    <span>View Inspection Results</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
