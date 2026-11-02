import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Scan, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  ShieldAlert, 
  BarChart3, 
  Cpu, 
  Zap, 
  Eye, 
  Activity,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Sliders,
  Boxes
} from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-24 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 lg:pt-20 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-10 w-[400px] h-[250px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Agricultural Computer Vision</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
                See Every Fruit. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-300 to-teal-200">
                  Track Every Detail.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                An intelligent dual-mode platform supporting both high-resolution still fruit images and continuous conveyor video streams. Powered by Ultralytics YOLOv8, ByteTrack, and surface defect grading for harvest inspection and post-harvest grading.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/workspace"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base transition-all duration-200 shadow-glow-emerald hover:shadow-glow-emerald-lg flex items-center justify-center gap-2 group"
                >
                  <Scan className="w-5 h-5" />
                  <span>Start Inspection</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/about"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Explore Capabilities</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Supported Pills Preview */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Target Categories:</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-850 border border-slate-700 text-emerald-400 font-medium">Apple</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-850 border border-slate-700 text-amber-400 font-medium">Banana</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-850 border border-slate-700 text-orange-400 font-medium">Orange</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-400">+ Custom Fine-Tuning</span>
              </div>
            </div>

            {/* Right Column: Computer Vision Dashboard Mockup Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-2xl bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 border border-slate-800 p-4 shadow-2xl shadow-black/80 glow-emerald-card">
                
                {/* Visual HUD Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                    <span className="font-mono text-slate-300 font-medium">CONVEYOR_CAM_01.MP4</span>
                  </div>
                  <span className="text-[11px] font-mono text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    28.4 FPS | GPU
                  </span>
                </div>

                {/* Simulated Visual Stream Display */}
                <div className="relative h-64 sm:h-72 mt-3 rounded-xl bg-navy-900 border border-slate-800 overflow-hidden flex items-center justify-center bg-grid-pattern">
                  
                  {/* Simulated Detected Apple */}
                  <div className="absolute top-10 left-8 border-2 border-rose-500 rounded-lg p-2 bg-rose-500/10 w-36 shadow-lg">
                    <div className="absolute -top-6 left-0 bg-slate-950 border border-rose-500 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>#104 APPLE 94%</span>
                    </div>
                    <div className="text-[9px] font-mono text-emerald-300 font-semibold bg-slate-950/80 px-1 py-0.5 rounded mt-4 text-center">
                      Grade: Healthy
                    </div>
                  </div>

                  {/* Simulated Detected Banana */}
                  <div className="absolute bottom-8 right-10 border-2 border-amber-400 rounded-lg p-2 bg-amber-400/10 w-40 shadow-lg">
                    <div className="absolute -top-6 left-0 bg-slate-950 border border-amber-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>#105 BANANA 89%</span>
                    </div>
                    <div className="text-[9px] font-mono text-amber-300 font-semibold bg-slate-950/80 px-1 py-0.5 rounded mt-5 text-center">
                      Grade: Surface Blemish
                    </div>
                  </div>

                  {/* Center Tracker Vector Graphic */}
                  <div className="text-center p-4">
                    <Scan className="w-12 h-12 text-brand-500/40 mx-auto animate-pulse" />
                    <span className="text-[11px] font-mono text-slate-400 block mt-2">Active ByteTrack Association</span>
                  </div>

                </div>

                {/* Bottom Real-time Telemetry Bar */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
                  <div className="bg-slate-850/80 rounded-lg p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Unique Fruits</span>
                    <span className="text-base font-extrabold font-mono text-white">48</span>
                  </div>
                  <div className="bg-slate-850/80 rounded-lg p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Avg Confidence</span>
                    <span className="text-base font-extrabold font-mono text-brand-400">92.4%</span>
                  </div>
                  <div className="bg-slate-850/80 rounded-lg p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Healthy Ratio</span>
                    <span className="text-base font-extrabold font-mono text-emerald-400">94.1%</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CORE FEATURES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">High-Precision Computer Vision</h2>
          <p className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Engineered for Precision Harvesting and Conveyor Sorting
          </p>
          <p className="text-slate-400 mt-3 text-base">
            Every module is designed to solve real-world agricultural sorting challenges with reproducible computer vision models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all duration-300 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-5">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">YOLO Object Detection</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detects supported fruit categories on every selected frame with low latency, reporting precise bounding boxes and class probabilities.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all duration-300 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">ByteTrack Association</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Maintains persistent track IDs across frames using Kalman filtering and bipartite matching, ensuring accurate counts without duplicate increments.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all duration-300 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Defect & Quality Grading</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Inspects cropped fruit regions for visible surface damage, rot discoloration, or bruises, explicitly reporting uncertainty flags.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-brand-500/40 transition-all duration-300 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Actionable Telemetry</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generates distribution charts, per-track logs, annotated video streams, and downloadable JSON/CSV reports for academic review.
            </p>
          </div>

        </div>
      </section>

      {/* 3. THREE-STEP WORKFLOW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800/90 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">System Methodology</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">Three-Step Video Inspection Pipeline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="relative space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white font-extrabold text-lg flex items-center justify-center shadow-glow-emerald">
                1
              </div>
              <h4 className="text-lg font-bold text-white">Upload Stream</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Submit an MP4, AVI, or WebM video file. Configure your detection confidence threshold, frame stride, and toggle ByteTrack or quality analysis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-brand-500/40 text-brand-400 font-extrabold text-lg flex items-center justify-center">
                2
              </div>
              <h4 className="text-lg font-bold text-white">Neural Processing</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                The backend extracts frames incrementally, applies YOLOv8 inference, attaches persistent track IDs via ByteTrack, and grades surface quality.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-extrabold text-lg flex items-center justify-center">
                3
              </div>
              <h4 className="text-lg font-bold text-white">Insights & Export</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Inspect the annotated video with visual HUD badges, explore class distributions, review individual track history, and export data in JSON/CSV formats.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. ACADEMIC MAJOR PROJECT OBJECTIVES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">College Project Scope</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">Formal Project Objectives</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
            <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-1 rounded">Objective 1</span>
            <h4 className="text-base font-bold text-white mt-3 mb-2">Deep Learning Multi-Fruit Detection</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Develop a deep-learning-based computer vision pipeline for detecting multiple supported fruit categories (apples, bananas, oranges) in uploaded video streams using Ultralytics YOLO.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Objective 2</span>
            <h4 className="text-base font-bold text-white mt-3 mb-2">Multi-Object Tracking & Counting</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Implement multi-object tracking via ByteTrack to monitor fruit trajectories, maintain persistent IDs, and generate track-level statistics without duplicate frame-counting.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">Objective 3</span>
            <h4 className="text-base font-bold text-white mt-3 mb-2">Quality Grading & Analytics Dashboard</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integrate a configurable visual quality inspection module and interactive dashboard to assess visible fruit defects while explicitly handling uncertainty and unsupported categories.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CAPABILITIES & TRANSPARENT LIMITATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Capabilities & Scientific Limitations</h3>
              <p className="text-sm text-slate-400 mt-1">Honest distinction between supported models and extension roadmaps.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>Academic Integrity Notice</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Out-of-the-Box Capabilities</span>
              </h4>
              <ul className="space-y-2 text-slate-300 text-xs leading-relaxed">
                <li>• Detects <strong>Apple</strong>, <strong>Banana</strong>, and <strong>Orange</strong> using verified COCO pretrained weights.</li>
                <li>• ByteTrack tracking assigns unique ID numbers that follow fruits across conveyor frames.</li>
                <li>• Total unique count is incremented only once per fruit track.</li>
                <li>• Generates downloadable MP4 video with real bounding boxes and HUD metrics.</li>
                <li>• SQLite persistence for job history and metadata retention.</li>
              </ul>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-amber-400 font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Extension Roadmaps & Boundary Limits</span>
              </h4>
              <ul className="space-y-2 text-slate-300 text-xs leading-relaxed">
                <li>• Categories like <strong>Mango, Grape, Pear, Strawberry, Pineapple</strong> require custom YOLO fine-tuning (documented in methodology).</li>
                <li>• Never silently guesses unsupported fruits; unmodeled fruits are ignored rather than misclassified.</li>
                <li>• Quality grading evaluates <strong>external surface blemishes only</strong>. It does not infer internal rot, sweetness, or bacterial safety.</li>
                <li>• Tracking IDs can reset if an object experiences severe long-term occlusion.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl bg-gradient-to-r from-brand-950/60 via-slate-900 to-brand-950/60 border border-brand-500/30 p-10 sm:p-16 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Ready to Inspect Your Fruit Stream?
            </h2>
            <p className="text-slate-300 text-base">
              Upload a test conveyor video or field recording to test multi-object detection, tracking, and quality analytics right now.
            </p>
            <div className="pt-2">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base transition-all shadow-glow-emerald hover:shadow-glow-emerald-lg"
              >
                <Scan className="w-5 h-5" />
                <span>Open Inspection Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

