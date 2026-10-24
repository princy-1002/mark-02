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
      className={`card-panel p-5 rounded-2xl transition-all duration-300 relative group overflow-hidden border border-teal-500/30 shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(20,184,166,0.1)] hover:border-teal-400/70 hover:shadow-[0_12px_32px_rgba(0,0,0,0.7),0_0_24px_rgba(20,184,166,0.25)] ${
        onClick ? 'cursor-pointer hover:bg-[#10221a]' : ''
      }`}
    >
      {/* Top indicator bar with neon glow */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${
          statusColor === 'red' ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.9)]' :
          statusColor === 'orange' ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.9)]' :
          statusColor === 'amber' ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.9)]' :
          'bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(45,212,191,0.9)]'
        }`} 
      />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-widest text-teal-400/80 font-bold">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-mono text-teal-400/80 font-semibold">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border shrink-0 transition-all shadow-md ${
          statusColor === 'red' ? 'bg-red-950/60 border-red-500/50 text-red-400 shadow-[0_0_14px_rgba(239,68,68,0.3)]' :
          statusColor === 'orange' ? 'bg-orange-950/60 border-orange-500/50 text-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.3)]' :
          statusColor === 'amber' ? 'bg-amber-950/60 border-amber-500/50 text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.3)]' :
          'bg-teal-950/60 border-teal-500/50 text-teal-300 shadow-[0_0_14px_rgba(20,184,166,0.3)]'
        }`}>
          {icon}
        </div>
      </div>

      {/* Footer info: change percentage or subtitle */}
      <div className="mt-4 pt-3.5 border-t border-teal-500/15 flex items-center justify-between text-xs">
        {change !== undefined ? (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border shadow-sm ${changeColorClass}`}>
              {isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isIncrease ? `+${change}%` : `${change}%`}
            </span>
            <span className="text-[11px] text-slate-300 font-mono truncate">
              {changePeriod}
            </span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-300 truncate font-mono">
            {subtitle}
          </span>
        ) : null}

        {onClick && (
          <span className="text-[10px] text-teal-400/80 group-hover:text-teal-200 transition-colors font-mono font-bold tracking-wider">
            FILTER ↗
          </span>
        )}
      </div>
    </div>
  );
};
