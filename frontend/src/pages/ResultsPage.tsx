import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  BarChart3, 
  AlertCircle, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Image as ImageIcon,
  Film,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { apiService } from '../services/api';
import { InspectionJob } from '../types';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [job, setJob] = useState<InspectionJob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'annotated' | 'original' | 'sideBySide'>('annotated');

  useEffect(() => {
    if (!id) return;
    const fetchJob = async () => {
      try {
        setLoading(true);
        const data = await apiService.getInspection(id);
        setJob(data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to retrieve inspection results.');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading inspection analysis...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Results Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested inspection job does not exist.'}</p>
        <Link
          to="/workspace"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm shadow-glow-emerald"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>
      </div>
    );
  }

  const isImage = job.media_type === 'image';
  const mediaUrl = isImage ? apiService.getImageStreamUrl(job.id) : apiService.getVideoStreamUrl(job.id);
  const originalMediaUrl = apiService.getOriginalMediaUrl(job.id);
  const reportDownloadUrl = apiService.getReportDownloadUrl(job.id);
  const csvDownloadUrl = apiService.getCsvDownloadUrl(job.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link to="/history" className="hover:text-brand-400">History</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200 font-mono">{job.id.slice(0, 8)}...</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Inspection Results: {job.filename}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isImage 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                : 'bg-brand-500/20 text-brand-400 border-brand-500/30'
            }`}>
              {isImage ? 'Still Image' : 'Video Stream'}
            </span>
          </h1>
        </div>

        {/* Action Buttons: Export & Analytics */}
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={mediaUrl}
            download={isImage ? `annotated_${job.filename}` : `annotated_${job.filename}`}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>{isImage ? 'Download Annotated Image' : 'Download Video'}</span>
          </a>

          <a
            href={reportDownloadUrl}
            download={`${job.id}_report.json`}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>JSON Report</span>
          </a>

          <a
            href={csvDownloadUrl}
            download={`${job.id}_tracks.csv`}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV Spreadsheet</span>
          </a>

          <Link
            to={`/analytics/${job.id}`}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-glow-emerald"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Full Analytics</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Media Viewer (Left) vs Real-Time Summary & Fruit Inventory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Processed Media Viewer */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
            
            {/* View Tab Selector */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" />
                <span>
                  {isImage ? 'Detected Fruits & Defect Bounding Boxes' : 'AI Processed Video (with Tracking & HUD)'}
                </span>
              </h3>

              {isImage && (
                <div className="flex items-center gap-1 bg-slate-850 border border-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setViewTab('annotated')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewTab === 'annotated' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Annotated
                  </button>
                  <button
                    onClick={() => setViewTab('original')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewTab === 'original' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setViewTab('sideBySide')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      viewTab === 'sideBySide' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Compare
                  </button>
                </div>
              )}
            </div>

            {/* Media Display Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center p-1">
              {isImage ? (
                viewTab === 'sideBySide' ? (
                  <div className="grid grid-cols-2 gap-2 w-full h-full">
                    <div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-300 font-mono z-10">Original</span>
                      <img src={originalMediaUrl} alt="Original Fruit" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-brand-500/80 text-[10px] text-white font-mono z-10">AI Detection</span>
                      <img src={mediaUrl} alt="Annotated Fruit" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={viewTab === 'original' ? originalMediaUrl : mediaUrl}
                    alt="Fruit Inspection"
                    className="max-h-full max-w-full object-contain rounded-2xl"
                  />
                )
              ) : (
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  loop
                  className="max-h-full max-w-full rounded-2xl"
                />
              )}
            </div>

            {/* Stream / Image Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">
                  {isImage ? 'Image Resolution' : 'Frames Sampled'}
                </span>
                <span className="font-mono text-slate-100 font-bold block mt-0.5">
                  {isImage 
                    ? `${job.metadata?.width || '--'}x${job.metadata?.height || '--'} px`
                    : `${job.summary?.total_frames_processed || job.total_frames} frames`
                  }
                </span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Inference Speed</span>
                <span className="font-mono text-brand-400 font-bold block mt-0.5">
                  {job.summary?.fps_throughput ? `${job.summary.fps_throughput} FPS` : '--'}
                </span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Avg Confidence</span>
                <span className="font-mono text-slate-100 font-bold block mt-0.5">
                  {job.summary?.avg_confidence ? `${(job.summary.avg_confidence * 100).toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Processing Latency</span>
                <span className="font-mono text-slate-100 font-bold block mt-0.5">
                  {job.summary?.processing_time_seconds ? `${job.summary.processing_time_seconds}s` : '--'}
                </span>
              </div>
            </div>

          </div>

          {/* Model Attribution Notice */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200 block">AI Inspection Pipeline</span>
              <span>
                Detection: YOLOv8n (Apple, Banana, Orange). Quality Model: {job.summary?.quality_summary.model_identity || 'Surface Anomaly Analyzer'}. Quality grading detects visible surface damage & blemishes.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Fruit Breakdown & Defect Classification */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Metrics Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>{isImage ? 'Detected Fruit Counts' : 'Tracked Fruit Counts'}</span>
              <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                {job.summary?.unique_fruits || 0} Total
              </span>
            </h3>

            {/* Class Breakdown Bars */}
            <div className="space-y-3">
              {job.summary?.fruit_counts && Object.keys(job.summary.fruit_counts).length > 0 ? (
                Object.entries(job.summary.fruit_counts).map(([cls, count]) => {
                  const pct = job.summary?.fruit_percentages[cls] || 0;
                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 capitalize">{cls}</span>
                        <span className="font-mono font-bold text-white">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-2">No fruit detections recorded above confidence threshold.</p>
              )}
            </div>

            {/* Quality Summary */}
            {job.summary?.quality_summary && (
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block uppercase">Health & Defect Grading</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Healthy</span>
                    <span className="font-mono font-bold text-white text-base">
                      {job.summary.quality_summary.healthy_count}
                    </span>
                  </div>
                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 block font-semibold">Defective</span>
                    <span className="font-mono font-bold text-white text-base">
                      {job.summary.quality_summary.defective_count}
                    </span>
                  </div>
                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Uncertain</span>
                    <span className="font-mono font-bold text-white text-base">
                      {job.summary.quality_summary.uncertain_count}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Individual Fruit Items Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>{isImage ? 'Detected Fruits' : 'Track Inventory'}</span>
              <span className="text-xs text-slate-400 font-mono">
                {job.tracks?.length || 0} Items
              </span>
            </h3>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {job.tracks && job.tracks.length > 0 ? (
                job.tracks.map((track) => (
                  <div
                    key={track.track_id}
                    className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-brand-400">#{track.track_id}</span>
                        <span className="font-semibold text-white capitalize">{track.class_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isImage 
                          ? `Box: [${(track as any).bbox?.join(', ')}]`
                          : `Frames ${track.first_frame}–${track.last_frame} (${track.detection_count} hits)`
                        }
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-slate-300 block">
                        {(track.avg_confidence * 100).toFixed(0)}%
                      </span>
                      {track.quality_label && (
                        <span className={`text-[10px] font-semibold ${
                          track.quality_label === 'Healthy'
                            ? 'text-emerald-400'
                            : track.quality_label === 'Visible Damage'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {track.quality_label}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No fruit objects detected.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
