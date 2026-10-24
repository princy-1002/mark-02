import React from 'react';
import { Bell, CheckCheck, X, AlertTriangle, Info, Satellite } from 'lucide-react';
import type { MonitoringActivity } from '../../types/monitoring';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: MonitoringActivity[];
  onMarkAllRead: () => void;
  onSelectActivity: (activity: MonitoringActivity) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  activities,
  onMarkAllRead,
  onSelectActivity
}) => {
  if (!isOpen) return null;

  const getIcon = (type: MonitoringActivity['type'], level: MonitoringActivity['level']) => {
    if (level === 'alert') return <AlertTriangle size={15} className="text-red-400" />;
    if (level === 'warning') return <AlertTriangle size={15} className="text-amber-400" />;
    if (type === 'ingest') return <Satellite size={15} className="text-emerald-400" />;
    return <Info size={15} className="text-sky-400" />;
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#101814] border border-[#23342c] rounded-xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-[#1c2922] bg-[#0c130f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-100">Telemetry Notifications</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono border border-emerald-800/40">
            {activities.length} new
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMarkAllRead}
            title="Mark all as read"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#19241e] text-xs flex items-center gap-1 transition-colors"
          >
            <CheckCheck size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#19241e] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#18231d]">
        {activities.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              onSelectActivity(item);
              onClose();
            }}
            className="p-3.5 hover:bg-[#15201a] cursor-pointer transition-colors group"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 rounded bg-[#1c2821] border border-[#25362d] shrink-0">
                {getIcon(item.type, item.level)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.details}
                </p>
                {item.sensor && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0e1612] text-slate-400 border border-[#1e2a22]">
                      {item.sensor}
                    </span>
                    {item.regionCode && (
                      <span className="text-[10px] font-mono text-slate-500">
                        LOC: {item.regionCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-[#1c2922] bg-[#0c130f] text-center">
        <span className="text-[11px] font-mono text-slate-500">
          Earth Observation Downlink • Live Sync
        </span>
      </div>
    </div>
  );
};
