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
      <header className="sticky top-0 z-40 w-full h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Platform Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-950">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">AEGISCORE AI</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded">
                ENTERPRISE SOC
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono hidden sm:block">
              Evidence-Driven • Policy-Constrained • Verified Response
            </p>
          </div>
        </div>

        {/* Global Safety Controls & Mode */}
        <div className="flex items-center gap-3">
          {/* Operating Mode Selector (Default: Approval Mode) */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setOperatingMode('approval')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium",
                operatingMode === 'approval'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approval Mode (Default)</span>
            </button>
            <button
              type="button"
              onClick={() => setOperatingMode('automatic')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium",
                operatingMode === 'automatic'
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Automatic Mode: Preapproved low-risk actions only. Production changes mandate approval."
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Automatic Mode (Opt-In)</span>
            </button>
          </div>

          {/* Emergency Stop Switch */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all shadow-md",
              emergencyHaltActive
                ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-rose-950"
                : "bg-rose-950/40 text-rose-300 border-rose-700/60 hover:bg-rose-900/60 hover:text-white"
            )}
            title="Immediate emergency kill switch for all automated connectors"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="hidden md:inline">
              {emergencyHaltActive ? 'AUTOMATION HALTED' : 'STOP ALL AUTOMATION'}
            </span>
          </button>

          {/* User Profile Badge */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono text-xs font-semibold">
              SV
            </div>
            <div className="text-left text-xs">
              <div className="flex items-center gap-1 text-slate-200 font-medium">
                <span>{currentUser.name}</span>
                <UserCheck className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-300 font-mono truncate max-w-[170px]" title={currentUser.role}>
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
