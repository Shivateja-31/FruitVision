import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Trash2,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Scan,
  RefreshCw,
  Search,
  Filter,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { apiService } from '../services/api';
import { InspectionJob } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Deletion modal state
  const [jobToDelete, setJobToDelete] = useState<InspectionJob | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await apiService.listInspections(1, 50);
      setJobs(res.jobs);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch inspection history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      await apiService.deleteInspection(jobToDelete.id);
      setJobs(prev => prev.filter(j => j.id !== jobToDelete.id));
      setJobToDelete(null);
    } catch (err) {
      console.error('Failed to delete inspection:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-brand-400" />
            <span>Inspection History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persisted metadata, detection runs, and generated reports stored in SQLite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/workspace"
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-all shadow-glow-emerald flex items-center gap-1.5"
          >
            <Scan className="w-4 h-4" />
            <span>New Inspection</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="status-filter" className="text-xs text-slate-400 font-medium">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-850 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading inspection history...</p>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No Inspection Records Found"
          description="Your inspection history is currently empty. Run your first video through the inspection workspace to see it recorded here."
          actionText="Open Workspace"
          actionHref="/workspace"
        />
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850/90 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Type & Media / Job</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Fruits Found</th>
                  <th className="py-3.5 px-4">Performance</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => {
                    const fruitCounts = job.summary?.fruit_counts || {};
                    const countsString = Object.entries(fruitCounts)
                      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                      .join(', ');

                    return (
                      <tr key={job.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 mb-1">
                            {job.media_type === 'image' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                <ImageIcon className="w-3 h-3" /> Image
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <Video className="w-3 h-3" /> Video
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-white truncate max-w-xs" title={job.filename}>
                            {job.filename}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                            ID: {job.id.slice(0, 12)}...
                          </span>
                        </td>

                        <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(job.created_at).toLocaleString()}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] capitalize ${job.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : job.status === 'processing'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                            {job.status}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold text-white text-sm font-mono block">
                            {job.summary?.unique_fruits ?? 0}
                          </span>
                          {countsString && (
                            <span className="text-[10px] text-slate-400 truncate block max-w-xs">
                              {countsString}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-mono text-slate-300">
                          {job.media_type === 'image'
                            ? (job.summary?.processing_time_seconds ? `${job.summary.processing_time_seconds}s` : 'Instant')
                            : (job.summary?.fps_throughput ? `${job.summary.fps_throughput} FPS` : '--')}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {job.status === 'completed' && (
                              <>
                                <Link
                                  to={`/results/${job.id}`}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-brand-400 hover:bg-slate-700 transition-colors"
                                  title="View Results"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>

                                <a
                                  href={apiService.getReportDownloadUrl(job.id)}
                                  download={`${job.id}_report.json`}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                                  title="Download JSON Report"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>

                                <a
                                  href={apiService.getCsvDownloadUrl(job.id)}
                                  download={`${job.id}_tracks.csv`}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                                  title="Download CSV"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                </a>
                              </>
                            )}

                            <button
                              onClick={() => setJobToDelete(job)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No inspection jobs found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Job Deletion */}
      <ConfirmDialog
        isOpen={Boolean(jobToDelete)}
        title="Delete Inspection Record?"
        message={`Are you sure you want to permanently delete the inspection job for "${jobToDelete?.filename}"? This will delete the SQLite record and associated video and report files from disk.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setJobToDelete(null)}
      />

    </div>
  );
};

