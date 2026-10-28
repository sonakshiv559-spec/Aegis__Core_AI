import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  SearchCode, 
  GitFork, 
  SlidersHorizontal, 
  ShieldCheck,
  Activity,
  Database,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export const Sidebar: React.FC = () => {
  const { emergencyHaltActive, currentUser } = useAppStore();

  const navItems = [
    {
      to: '/',
      label: 'SOC Overview',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      to: '/pipeline',
      label: 'Pipeline & 6 DBs',
      icon: Zap,
      badge: 'Simulator',
    },
    {
      to: '/investigation/INC-2026-8841',
      label: 'Incident Investigation',
      icon: SearchCode,
      badge: 'Active',
    },
    {
      to: '/graph',
      label: 'Asset Dependency Graph',
      icon: GitFork,
    },
    {
      to: '/response',
      label: 'Response & Approvals',
      icon: SlidersHorizontal,
      badge: '2 Pending',
    },
    {
      to: '/audit',
      label: 'Verification & Audit',
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950/70 border-r border-slate-800/80 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold px-3 mb-2">
            Operations & Control
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                      item.badge === 'Simulator'
                        ? "bg-indigo-950 text-indigo-300 border-indigo-500/40 animate-pulse font-semibold"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Telemetry Health Summary */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Ingestion Status
            </span>
            <span className="text-[10px] font-mono text-emerald-400">NORMAL</span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Event Lag:</span>
              <span className="text-slate-200">1.2s</span>
            </div>
            <div className="flex justify-between">
              <span>OCSF Parsers:</span>
              <span className="text-emerald-400">100% OK</span>
            </div>
            <div className="flex justify-between">
              <span>Dead-Letter:</span>
              <span className="text-slate-200">0 msgs</span>
            </div>
          </div>
        </div>

        {/* Tenant Boundary */}
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Database className="w-3 h-3 text-indigo-400" />
            <span className="font-mono uppercase text-[10px]">Tenant Isolation Boundary</span>
          </div>
          <div className="font-mono text-slate-200 truncate" title={currentUser.tenant}>
            {currentUser.tenant}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-300 font-mono space-y-1">
        <div className="flex items-center justify-between">
          <span>Engine Build:</span>
          <span className="text-slate-300">v0.9.4-preview</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Safety Interlocks:</span>
          <span className={cn(emergencyHaltActive ? "text-rose-400 font-bold" : "text-emerald-400")}>
            {emergencyHaltActive ? "HALTED" : "ACTIVE"}
          </span>
        </div>
      </div>
    </aside>
  );
};
