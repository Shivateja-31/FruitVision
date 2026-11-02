import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Scan, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Download, 
  Search, 
  Filter,
  FileSpreadsheet,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { apiService } from '../services/api';
import { InspectionJob } from '../types';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';

// Theme colors for charts
const FRUIT_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
const QUALITY_COLORS = {
  'Healthy': '#10b981',
  'Visible Damage': '#f59e0b',
  'Rotten / Spoiled': '#ef4444',
  'Uncertain': '#94a3b8'
};

export const AnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<InspectionJob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const listData = await apiService.listInspections(1, 50);
        setJobs(listData.jobs);

        if (id) {
          const match = listData.jobs.find(j => j.id === id);
          if (match) {
            setSelectedJob(match);
          } else {
            const direct = await apiService.getInspection(id);
            setSelectedJob(direct);
          }
        } else if (listData.jobs.length > 0) {
          // Select most recent completed job
          const firstCompleted = listData.jobs.find(j => j.status === 'completed') || listData.jobs[0];
          setSelectedJob(firstCompleted);
        }
      } catch (err) {
        console.error('Error fetching analytics jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading telemetry & analytics...</p>
      </div>
    );
  }

  if (!selectedJob || jobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <EmptyState
          icon={BarChart3}
          title="No Inspection Analytics Available"
          description="You haven't run any video inspections yet. Upload a video stream in the workspace to generate analytics, track IDs, and quality metrics."
          actionText="Go to Workspace"
          actionHref="/workspace"
        />
      </div>
    );
  }

  // Prepare chart data
  const fruitCounts = selectedJob.summary?.fruit_counts || {};
  const barChartData = Object.entries(fruitCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count
  }));

  const qualitySummary = selectedJob.summary?.quality_summary;
  const pieChartData = qualitySummary ? [
    { name: 'Healthy', value: qualitySummary.healthy_count, color: QUALITY_COLORS['Healthy'] },
    { name: 'Visible Damage', value: qualitySummary.defect_breakdown?.['Visible Damage'] || 0, color: QUALITY_COLORS['Visible Damage'] },
    { name: 'Rotten / Spoiled', value: qualitySummary.defect_breakdown?.['Rotten / Spoiled'] || 0, color: QUALITY_COLORS['Rotten / Spoiled'] },
    { name: 'Uncertain', value: qualitySummary.uncertain_count, color: QUALITY_COLORS['Uncertain'] },
  ].filter(d => d.value > 0) : [];

  // Filtered tracks
  const filteredTracks = (selectedJob.tracks || []).filter(track => {
    const matchesSearch = track.track_id.toString().includes(searchQuery) ||
                          track.class_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || track.class_name.toLowerCase() === classFilter.toLowerCase();
    return matchesSearch && matchesClass;
  });

  const availableClasses = Array.from(new Set((selectedJob.tracks || []).map(t => t.class_name)));

  const isImage = selectedJob.media_type === 'image';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header with Job Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Analytics Dashboard</span>
            {isImage ? (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Still Image Run
              </span>
            ) : (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center gap-1">
                <Video className="w-3 h-3" /> Video Stream Run
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quantitative metrics, multi-object counts, and defect distributions derived from neural computer vision inspection.
          </p>
        </div>

        {/* Job Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="job-selector" className="text-xs text-slate-400 font-medium">Select Job:</label>
          <select
            id="job-selector"
            value={selectedJob.id}
            onChange={(e) => {
              const found = jobs.find(j => j.id === e.target.value);
              if (found) setSelectedJob(found);
            }}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.media_type === 'image' ? '[IMAGE]' : '[VIDEO]'} {j.filename} ({new Date(j.created_at).toLocaleDateString()}) - {j.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label={isImage ? "Detected Fruit Count" : "Unique Tracked Fruits"}
          value={selectedJob.summary?.unique_fruits ?? 0}
          subtext={isImage ? "Distinct fruit crops located" : "Persistent object count via ByteTrack"}
          icon={Layers}
          badge="Verified"
          badgeColor="emerald"
        />
        <StatCard
          label={isImage ? "Target Frames" : "Total Frame Detections"}
          value={isImage ? 1 : (selectedJob.summary?.total_detections || 0)}
          subtext={isImage ? "Single high-resolution still image" : `${selectedJob.summary?.total_frames_processed || 0} frames sampled`}
          icon={Scan}
          badge={isImage ? "Image Mode" : "Inference Hits"}
          badgeColor="blue"
        />
        <StatCard
          label="Average Confidence"
          value={selectedJob.summary?.avg_confidence ? `${(selectedJob.summary.avg_confidence * 100).toFixed(1)}%` : '--'}
          subtext="YOLOv8 bounding box confidence"
          icon={BarChart3}
          badge="Model Accuracy"
          badgeColor="emerald"
        />
        <StatCard
          label={isImage ? "Inference Latency" : "Processing Throughput"}
          value={isImage 
            ? `${selectedJob.summary?.processing_time_seconds || 0}s` 
            : (selectedJob.summary?.fps_throughput ? `${selectedJob.summary.fps_throughput} FPS` : '--')}
          subtext={isImage ? "End-to-end detection & grading" : `Completed in ${selectedJob.summary?.processing_time_seconds || 0}s`}
          icon={Clock}
          badge={isImage ? "Latency" : "Compute Rate"}
          badgeColor="amber"
        />
      </div>

      {/* Two Column Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Chart: Fruit Class Distribution */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Fruit Category Distribution</h3>
              <p className="text-xs text-slate-400">Total unique fruits identified per category</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-brand-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 600 }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No fruit detections recorded for this stream.
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Quality Inspection Breakdown */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Quality Inspection Breakdown</h3>
              <p className="text-xs text-slate-400">Visual defect grading on unique tracked fruits</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Legend
                    formatter={(val) => <span className="text-xs text-slate-300 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                <p>Quality inspection was disabled or not available for this run.</p>
                <span className="text-[11px] text-slate-400">Enable quality analysis toggle in workspace.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Detailed Per-Track Telemetry Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-card space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">
              {isImage ? 'Fruit-Level Object Inventory' : 'Track-Level Object Telemetry'}
            </h3>
            <p className="text-xs text-slate-400">
              {isImage ? 'Per-fruit bounding box detection and surface defect classification' : 'Comprehensive per-fruit spatial and temporal data records'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isImage ? "Search Object ID or Class..." : "Search Track ID or Class..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Class Filter Dropdown */}
            {availableClasses.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 capitalize"
              >
                <option value="all">All Classes</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* CSV Download Button */}
            <a
              href={apiService.getCsvDownloadUrl(selectedJob.id)}
              download={`${selectedJob.id}_tracks.csv`}
              className="px-3 py-1.5 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/40 text-xs font-semibold hover:bg-brand-500/30 transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">{isImage ? 'Item #' : 'Track ID'}</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">{isImage ? 'Frame Reference' : 'Active Frames'}</th>
                <th className="py-3 px-4">{isImage ? 'Observations' : 'Total Detections'}</th>
                <th className="py-3 px-4 rounded-r-xl">Quality Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTracks.length > 0 ? (
                filteredTracks.map((track) => (
                  <tr key={track.track_id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-400">
                      #{track.track_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white capitalize">
                      {track.class_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {(track.avg_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {isImage ? 'Static 1/1' : `${track.first_frame} – ${track.last_frame}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {isImage ? '1 Hit' : track.detection_count}
                    </td>
                    <td className="py-3.5 px-4">
                      {track.quality_label ? (
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                          track.quality_label === 'Healthy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : track.quality_label === 'Visible Damage'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {track.quality_label}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No tracked objects found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

