import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Scan, 
  Layers, 
  BarChart3, 
  History, 
  HelpCircle, 
  Cpu, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import { apiService } from '../services/api';
import { HealthResponse } from '../types';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const data = await apiService.getHealth();
        if (isMounted) {
          setHealth(data);
          setIsOnline(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsOnline(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Inspection Workspace', path: '/workspace', icon: Scan },
    { name: 'History', path: '/history', icon: History },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Methodology', path: '/about', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/40 flex items-center justify-center text-brand-400 group-hover:scale-105 group-hover:border-brand-400 transition-all duration-300 shadow-glow-emerald">
              <Scan className="w-5 h-5 text-brand-400 group-hover:text-brand-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">FruitVision</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">AI</span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">Multi-Fruit Detection & Tracking</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-brand-400 bg-brand-500/10 border border-brand-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: System Status Badge */}
          <div className="hidden lg:flex items-center gap-3">
            {isOnline === true ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-brand-500/30 text-xs text-slate-300 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <span className="font-medium text-slate-200">
                  {health?.detection_model || 'YOLOv8'} ({health?.device.toUpperCase()})
                </span>
              </div>
            ) : isOnline === false ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Backend Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Connecting...</span>
              </div>
            )}

            <Link
              to="/workspace"
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-all duration-200 shadow-glow-emerald hover:shadow-glow-emerald-lg flex items-center gap-1.5"
            >
              <Scan className="w-4 h-4" />
              <span>New Analysis</span>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive
                    ? 'text-brand-400 bg-brand-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2">
            <Link
              to="/workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white font-medium"
            >
              <Scan className="w-4 h-4" />
              <span>Start Inspection</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

