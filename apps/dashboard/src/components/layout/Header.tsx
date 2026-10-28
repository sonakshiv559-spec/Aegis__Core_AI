import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { EmergencyStopModal } from './EmergencyStopModal';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Header: React.FC = () => {
  const { operatingMode, setOperatingMode, emergencyHaltActive, currentUser } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between font-sans">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">AEGISCORE</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">
                SOC
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* Operating Mode Selector */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setOperatingMode('approval')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium text-xs",
                operatingMode === 'approval'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approval Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setOperatingMode('automatic')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium text-xs",
                operatingMode === 'automatic'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Automatic Mode</span>
            </button>
          </div>

          {/* Emergency Stop Switch */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
              emergencyHaltActive
                ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                : "bg-rose-950/30 text-rose-300 border-rose-800/40 hover:bg-rose-900/40 hover:text-white"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">
              {emergencyHaltActive ? 'HALTED' : 'Emergency Stop'}
            </span>
          </button>

          {/* User Profile */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
              SV
            </div>
            <div className="text-left text-xs">
              <div className="text-slate-200 font-medium leading-none">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {currentUser.role}
              </div>
            </div>
          </div>
        </div>
      </header>

      <EmergencyStopModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
