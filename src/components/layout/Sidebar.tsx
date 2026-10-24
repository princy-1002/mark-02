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
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#0c120f] border-r border-[#1a2620] flex flex-col ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1a2620] bg-[#090d0b]">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 tracking-wider text-base font-mono">CL-01</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 font-mono">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-tight truncate">
                Environmental Intelligence
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <Radio size={20} />
            </div>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#16201b] transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          {!collapsed ? (
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Mission Console
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-sm shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141d18]'
              }`}
            >
              <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'group-hover:text-slate-200'}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!collapsed && item.badge !== undefined && Number(item.badge) > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}

              {!collapsed && item.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400/90 border border-emerald-800/40 font-mono">
                  {item.tag}
                </span>
              )}

              {/* Collapsed active dot indicator */}
              {collapsed && isActive && (
                <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Telemetry Footer */}
      <div className="p-3 border-t border-[#1a2620] bg-[#090d0b]">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center p-2 rounded text-slate-400 hover:text-slate-200 hover:bg-[#141d18]"
            title="Expand Sidebar"
          >
            <ChevronRight size={18} />
          </button>
        ) : (
          <div className="rounded-lg bg-[#111915] border border-[#1e2c24] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-mono">
                <ShieldCheck size={14} className="text-emerald-400" />
                ORBIT LINK
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              Sentinel-2B • Landsat-9
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
