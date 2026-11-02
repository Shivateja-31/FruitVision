import React from 'react';
import { Scan, Github, Award, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-navy-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>FruitVision AI</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-brand-400 border border-slate-700">v1.0</span>
            </div>
            <p className="text-xs text-slate-400">Academic Major Project Demonstration</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <Link to="/" className="hover:text-brand-400 transition-colors">Home</Link>
          <Link to="/workspace" className="hover:text-brand-400 transition-colors">Inspection Workspace</Link>
          <Link to="/history" className="hover:text-brand-400 transition-colors">History</Link>
          <Link to="/analytics" className="hover:text-brand-400 transition-colors">Analytics</Link>
          <Link to="/about" className="hover:text-brand-400 transition-colors">Methodology & Objectives</Link>
        </div>

        <div className="text-xs text-slate-400 text-center md:text-right">
          <p>© 2026 FruitVision AI. All rights reserved.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Powered by PyTorch, Ultralytics YOLOv8 & ByteTrack</p>
        </div>

      </div>
    </footer>
  );
};

