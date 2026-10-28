import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  SearchCode, 
  GitFork, 
  SlidersHorizontal, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export const Sidebar: React.FC = () => {
  const { emergencyHaltActive } = useAppStore();

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      to: '/pipeline',
      label: 'Architecture Simulator',
      icon: Zap,
      badge: 'Interactive',
    },
    {
      to: '/investigation/INC-2026-8841',
      label: 'Incident Dossiers',
      icon: SearchCode,
    },
    {
      to: '/graph',
      label: 'Dependency Graph',
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
      label: 'Closed-Loop Audit',
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between p-4 min-h-[calc(100vh-3.5rem)] font-sans">
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3">
          Navigation
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
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group",
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    item.badge === 'Interactive'
                      ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                      : "bg-slate-800 text-slate-400"
                  )}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Clean Footer Status */}
      <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Ingestion Active</span>
        </span>
        <span className="text-[11px] text-slate-500">v0.9.4</span>
      </div>
    </aside>
  );
};
