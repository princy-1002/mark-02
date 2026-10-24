import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changePeriod?: string;
  icon: React.ReactNode;
  subtitle?: string;
  isPositiveChangeBad?: boolean; // For forest loss, positive increase is bad (red/orange)
  onClick?: () => void;
  statusColor?: 'emerald' | 'red' | 'orange' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changePeriod = 'vs previous period',
  icon,
  subtitle,
  isPositiveChangeBad = true,
  onClick,
  statusColor = 'emerald'
}) => {
  const isIncrease = change !== undefined && change > 0;
  
  // For deforestation, an increase is a worsening condition
  const changeColorClass = change !== undefined
    ? isIncrease
      ? isPositiveChangeBad
        ? 'text-red-400 bg-red-950/40 border-red-800/40'
        : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
      : isPositiveChangeBad
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
        : 'text-red-400 bg-red-950/40 border-red-800/40'
    : '';

  return (
    <div
      onClick={onClick}
      className={`card-panel p-5 transition-all duration-200 relative group overflow-hidden ${
        onClick ? 'cursor-pointer hover:border-emerald-700/60 hover:bg-[#141f19]' : ''
      }`}
    >
      {/* Subtle top indicator bar */}
      <div 
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          statusColor === 'red' ? 'bg-red-500/80' :
          statusColor === 'orange' ? 'bg-orange-500/80' :
          statusColor === 'amber' ? 'bg-amber-500/80' :
          'bg-emerald-500/60'
        }`} 
      />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-mono text-slate-400 font-medium">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#15201a] border border-[#23352a] text-emerald-400 shrink-0 group-hover:border-emerald-600/40 transition-colors">
          {icon}
        </div>
      </div>

      {/* Footer info: change percentage or subtitle */}
      <div className="mt-4 pt-3 border-t border-[#1a2620] flex items-center justify-between text-xs">
        {change !== undefined ? (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border ${changeColorClass}`}>
              {isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isIncrease ? `+${change}%` : `${change}%`}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {changePeriod}
            </span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-400 truncate font-mono">
            {subtitle}
          </span>
        ) : null}

        {onClick && (
          <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition-colors font-mono">
            FILTER ↗
          </span>
        )}
      </div>
    </div>
  );
};
