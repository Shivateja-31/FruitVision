import React from 'react';
import { 
  Scan, 
  Layers, 
  Cpu, 
  BookOpen, 
  Target, 
  ShieldAlert, 
  Workflow, 
  GitBranch, 
  FileCode2, 
  CheckCircle2 
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Header */}
      <div className="space-y-3 text-center sm:text-left border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Academic Methodology & Architecture Guide</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          System Architecture & Technical Methodology
        </h1>
        <p className="text-slate-400 text-base max-w-3xl leading-relaxed">
          Comprehensive documentation of the FruitVision AI computer vision pipeline, tracking mechanisms, quality classification, and academic major project objectives.
        </p>
      </div>

      {/* 1. THREE PROJECT OBJECTIVES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-white">Major Project Core Objectives</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded border border-brand-500/20">
              Objective 1
            </span>
            <h3 className="text-base font-bold text-white">Multi-Fruit Deep Learning Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Develop a deep-learning-based computer vision pipeline for detecting multiple supported fruit categories (apples, bananas, oranges) in uploaded video streams using Ultralytics YOLOv8.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
              Objective 2
            </span>
            <h3 className="text-base font-bold text-white">Multi-Object Tracking & Counting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Implement multi-object tracking via ByteTrack to monitor fruit trajectories, maintain persistent IDs, and generate track-level statistics without duplicate frame-counting.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              Objective 3
            </span>
            <h3 className="text-base font-bold text-white">Defect Inspection & Uncertainty</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Integrate a configurable visual quality inspection model and analytics dashboard to assess visible fruit defects while explicitly handling uncertainty and unsupported categories.
            </p>
          </div>
        </div>
      </section>

      {/* 2. COMPUTER VISION PIPELINE FLOW */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Workflow className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-white">End-to-End Processing Pipeline</h2>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 font-mono text-xs">
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 text-center">
            
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 flex-1 space-y-1">
              <span className="text-brand-400 font-bold block">1. Input Ingestion</span>
              <p className="text-[11px] text-slate-400">Container signature check (JPEG/PNG/MP4/RIFF) & disk buffer</p>
            </div>

            <div className="self-center text-slate-500 hidden md:block">→</div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 flex-1 space-y-1">
              <span className="text-blue-400 font-bold block">2. YOLOv8 Inference</span>
              <p className="text-[11px] text-slate-400">Class filtering (apple, banana, orange) & box extraction</p>
            </div>

            <div className="self-center text-slate-500 hidden md:block">→</div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 flex-1 space-y-1">
              <span className="text-amber-400 font-bold block">3. ByteTrack Linkage</span>
              <p className="text-[11px] text-slate-400">Kalman motion state (Video) or Spatial registration (Images)</p>
            </div>

            <div className="self-center text-slate-500 hidden md:block">→</div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 flex-1 space-y-1">
              <span className="text-emerald-400 font-bold block">4. Quality & HUD</span>
              <p className="text-[11px] text-slate-400">Defect classification + Annotated image/video + JSON/CSV</p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. TRACKING & OBJECT COUNTING MECHANISM */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-400" />
          <span>ByteTrack Multi-Object Tracking Mechanism</span>
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            Standard object detectors evaluate each frame independently. Without temporal association, a single apple traversing 300 frames would be counted as 300 separate apples.
          </p>
          <p>
            FruitVision AI utilizes <strong>ByteTrack</strong> association. Unlike conventional SORT trackers that discard low-confidence detections, ByteTrack retains both high- and low-confidence detections to reconstruct obscured or blurry objects.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li><strong>Kalman Filter Motion Prediction:</strong> Tracks bounding box centroid velocity between frames.</li>
            <li><strong>Bipartite Matching:</strong> Uses intersection-over-union (IoU) matrices to associate existing tracks.</li>
            <li><strong>Unique Count Preservation:</strong> The unique count increases only when a newly unassociated track ID appears for more than consecutive validation frames.</li>
          </ul>
        </div>
      </section>

      {/* 4. EXTENDING SUPPORTED CLASSES GUIDE */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <span>Extension Roadmap for Additional Fruit Classes</span>
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs text-slate-300">
          <p>
            To expand detection to <strong>Mango, Grape, Pineapple, Strawberry, or Pear</strong>, follow this reproducible transfer learning workflow:
          </p>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2 text-slate-300 overflow-x-auto">
            <p className="text-brand-400 font-semibold"># 1. Dataset Configuration (data.yaml)</p>
            <p>names: ['apple', 'banana', 'orange', 'mango', 'grape', 'pineapple', 'strawberry', 'pear']</p>
            <p>nc: 8</p>
            <p className="text-brand-400 font-semibold pt-2"># 2. Train Custom Weights with Ultralytics</p>
            <p>yolo detect train data=fruits.yaml model=yolov8n.pt epochs=80 imgsz=640</p>
            <p className="text-brand-400 font-semibold pt-2"># 3. Mount Custom Model in Backend</p>
            <p>Set YOLO_MODEL_PATH=models/fruitvision_custom.pt in backend/.env</p>
          </div>

          <p className="text-slate-400">
            Once loaded, the backend's dynamic class inspector automatically registers the new categories in <code>/api/health</code> and displays them across the frontend.
          </p>
        </div>
      </section>

      {/* 5. LIMITATIONS & ETHICAL NOTICE */}
      <section className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>Scientific Disclaimer & Food Safety Scope</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          FruitVision AI evaluates external visual surface characteristics. Visual defect models can identify skin discoloration, dark blotches, and mechanical impact blemishes. They do NOT evaluate internal core rot, sugar brix content, bacterial safety, or chemical pesticide residues.
        </p>
      </section>

    </div>
  );
};

