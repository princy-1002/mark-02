import React from 'react';
import { 
  LayoutDashboard, 
  Globe2, 
  Flame, 
  Layers, 
  BarChart3, 
  Bell, 
  FileSpreadsheet, 
  Settings, 
  Radio, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import type { NavigationPage } from '../../types/monitoring';

interface SidebarProps {
  activePage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAlertsCount: number;
}

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  tag?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onPageChange,
  collapsed,
  onToggleCollapse,
  activeAlertsCount
}) => {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard size={18} />
    },
    {
      id: 'earth-3d',
      label: '3D Earth',
      icon: <Globe2 size={18} />,
      tag: 'CesiumJS'
    },
    {
      id: 'forest-loss-detection',
      label: 'Forest Loss Detection',
      icon: <Flame size={18} />
    },
    {
      id: 'satellite-comparison',
      label: 'Satellite Comparison',
      icon: <Layers size={18} />
    },
    {
      id: 'analyst-workspace',
      label: 'Analyst Workspace',
      icon: <ShieldCheck size={18} />,
      tag: 'AI Verify'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 size={18} />
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell size={18} />,
      badge: activeAlertsCount,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileSpreadsheet size={18} />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />
    }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#09100d]/95 backdrop-blur-xl border-r border-teal-500/20 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.6)] ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-teal-500/15 bg-gradient-to-b from-[#0e1b15]/80 to-[#09100d]/60">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="leading-tight truncate">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 tracking-wider text-lg font-mono">CL-01</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/50 shadow-[0_0_8px_rgba(20,184,166,0.3)]">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-teal-400/80 tracking-tight truncate font-sans mt-0.5">
                Environmental Intelligence
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
              <Radio size={18} />
            </div>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-all"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-2 pb-1">
          {!collapsed ? (
            <p className="text-[10px] font-mono uppercase tracking-widest text-teal-500/70 font-semibold">
              ION CONSOLE
            </p>
          ) : (
            <div className="h-2" />
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-gradient-to-r from-teal-950/80 to-emerald-950/60 text-teal-200 border border-teal-400/80 shadow-[0_0_16px_rgba(20,184,166,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#12221b]/50 hover:border hover:border-teal-500/25 border border-transparent'
              }`}
            >
              <span className={`shrink-0 transition-colors ${isActive ? 'text-teal-300' : 'group-hover:text-teal-300'}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="truncate flex-1 text-left font-sans">{item.label}</span>
              )}

              {!collapsed && item.badge !== undefined && Number(item.badge) > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  {item.badge}
                </span>
              )}

              {!collapsed && item.tag && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  item.tag === 'CesiumJS' 
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]' 
                    : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                }`}>
                  {item.tag}
                </span>
              )}

              {/* Collapsed active dot indicator */}
              {collapsed && isActive && (
                <span className="absolute right-1 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Telemetry Footer */}
      <div className="p-3 border-t border-teal-500/15 bg-gradient-to-t from-[#0e1b15]/90 to-[#09100d]/70">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30"
            title="Expand Sidebar"
          >
            <ChevronRight size={18} />
          </button>
        ) : (
          <div className="rounded-xl bg-[#0d1a14]/90 border border-teal-500/25 p-2.5 space-y-1.5 shadow-[0_0_12px_rgba(20,184,166,0.1)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
                <ShieldCheck size={14} className="text-teal-400" />
                ORBIT LINK
              </span>
              <span className="text-[10px] font-mono text-teal-300 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-teal-400/70 font-mono truncate">
              Sentinel-2B • Landsat-9
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
