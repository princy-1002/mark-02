import React from 'react';
import type { AnalyticsSummaryMetrics } from '../../types/analytics';
import { 
  TreePine, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { DemoBadge } from '../common/Badge';

interface AnalyticsMetricCardsProps {
  metrics: AnalyticsSummaryMetrics;
  dateRange: string;
}

export const AnalyticsMetricCards: React.FC<AnalyticsMetricCardsProps> = ({
  metrics,
  dateRange
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const periodLabelMap: Record<string, string> = {
    '7d': 'vs previous 7 days',
    '30d': 'vs previous 30 days',
    '90d': 'vs previous quarter',
    'ytd': 'vs 2025 baseline'
  };

  const periodLabel = periodLabelMap[dateRange] || 'vs previous period';

  return (
    <div className="space-y-2">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Monitored Forest Area */}
        <div className="card-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/70" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Monitored Forest Area
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
                  {formatNumber(metrics.totalMonitoredAreaHectares)}
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  ha
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Monitored canopy across {metrics.totalRegionsCount} region{metrics.totalRegionsCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
              <TreePine size={20} />
            </div>
          </div>
        </div>

        {/* Metric 2: Detected Forest-Loss Area */}
        <div className="card-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/80" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Detected Forest Loss
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold font-mono text-red-400 tracking-tight">
                  {formatNumber(metrics.detectedLossAreaHectares)}
                </span>
                <span className="text-xs font-mono text-red-400 font-semibold">
                  ha
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                {metrics.totalEventsCount} disturbance cluster{metrics.totalEventsCount !== 1 ? 's' : ''} detected
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-700/40 flex items-center justify-center text-red-400 shrink-0">
              <Flame size={20} />
            </div>
          </div>
        </div>

        {/* Metric 3: Percentage Change Over Selected Period */}
        <div className="card-panel p-5 relative overflow-hidden group">
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${metrics.isIncrease ? 'bg-red-500/80' : 'bg-emerald-500/70'}`} />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Period Velocity Change
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className={`text-2xl font-bold font-mono tracking-tight ${metrics.isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                  {metrics.isIncrease ? '+' : '-'}{metrics.percentageChange}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1 flex items-center gap-1">
                {metrics.isIncrease ? (
                  <TrendingUp size={13} className="text-red-400" />
                ) : (
                  <TrendingDown size={13} className="text-emerald-400" />
                )}
                <span>{periodLabel} ({formatNumber(metrics.previousPeriodLossHectares)} ha)</span>
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              metrics.isIncrease
                ? 'bg-red-950/60 border-red-700/40 text-red-400'
                : 'bg-emerald-950/60 border-emerald-700/40 text-emerald-400'
            }`}>
              {metrics.isIncrease ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
        </div>

        {/* Metric 4: Number of Affected Regions */}
        <div className="card-panel p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/80" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Affected Regions
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
                  {metrics.affectedRegionsCount}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  / {metrics.totalRegionsCount} monitored
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1 flex items-center gap-1">
                <ShieldAlert size={12} className="text-amber-400" />
                <span>{metrics.criticalEventsCount} high-severity hotspot{metrics.criticalEventsCount !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-700/40 flex items-center justify-center text-amber-400 shrink-0">
              <MapPin size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Demo Data Disclaimer Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0a0f0d] border border-[#16221b] text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-emerald-400 shrink-0" />
          <span>Metrics computed from multi-sensor detection outputs (Sentinel-2, Landsat-9, PlanetScope).</span>
        </div>
        <DemoBadge />
      </div>
    </div>
  );
};
