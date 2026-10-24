import React from 'react';
import type { MonitoringActivity } from '../../types/monitoring';
import { Radio, AlertTriangle, Satellite, CheckCircle, Info, Cpu } from 'lucide-react';

interface ActivityFeedProps {
  activities: MonitoringActivity[];
  onSelectActivity?: (activity: MonitoringActivity) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  onSelectActivity
}) => {
  const getIcon = (type: MonitoringActivity['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle size={14} className="text-red-400" />;
      case 'inference':
        return <Cpu size={14} className="text-emerald-400" />;
      case 'ingest':
        return <Satellite size={14} className="text-cyan-400" />;
      case 'validation':
        return <CheckCircle size={14} className="text-amber-400" />;
      default:
        return <Info size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="card-panel p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Radio size={16} className="text-emerald-400 animate-pulse" />
            Monitoring Activity Feed
          </h4>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Live telemetry stream from Earth observation pipelines
          </p>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
          STREAM ACTIVE
        </span>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-3 mt-1">
        {activities.slice(0, 5).map((act) => (
          <div
            key={act.id}
            onClick={() => onSelectActivity && onSelectActivity(act)}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0e1612] border border-[#1b2720] hover:border-[#273a2f] hover:bg-[#121c17] transition-all cursor-pointer group"
          >
            <div className="p-1.5 rounded bg-[#152019] border border-[#223328] shrink-0 mt-0.5">
              {getIcon(act.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                  {act.title}
                </p>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {act.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {act.details}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                {act.sensor && (
                  <span className="px-1.5 py-0.2 rounded bg-[#090e0c] text-slate-400 border border-[#1a251f]">
                    {act.sensor}
                  </span>
                )}
                {act.regionCode && (
                  <span>REF: {act.regionCode}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#1a2620] flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>POLLING LATENCY: 240ms</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ESA Copernicus & USGS
        </span>
      </div>
    </div>
  );
};
