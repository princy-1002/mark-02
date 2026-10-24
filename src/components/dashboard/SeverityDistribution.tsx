import React from 'react';
import type { SeverityDistributionItem } from '../../types/monitoring';
import { ShieldAlert } from 'lucide-react';

interface SeverityDistributionProps {
  distribution: SeverityDistributionItem[];
  selectedSeverity?: string;
  onSelectSeverity?: (severity: string) => void;
}

export const SeverityDistribution: React.FC<SeverityDistributionProps> = ({
  distribution,
  selectedSeverity = 'all',
  onSelectSeverity
}) => {
  const totalHectares = distribution.reduce((sum, item) => sum + item.hectares, 0);
  const totalEvents = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="card-panel p-5 flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert size={16} className="text-emerald-400" />
            Severity Distribution
          </h4>
          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-[#16201a] border border-[#23352a]">
            {totalEvents} Clusters
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Deforestation impact classified by loss surface area
        </p>
      </div>

      {/* Stacked Progress Bar Representation */}
      <div className="my-5">
        <div className="h-4 w-full bg-[#0d1410] rounded-full overflow-hidden flex border border-[#1e2d24] p-0.5 gap-0.5">
          {distribution.map((item) => {
            const width = totalHectares > 0 ? (item.hectares / totalHectares) * 100 : 25;
            return (
              <div
                key={item.level}
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color
                }}
                className={`h-full rounded-sm transition-all duration-300 relative group cursor-pointer ${
                  selectedSeverity === item.level ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''
                }`}
                onClick={() => onSelectSeverity && onSelectSeverity(item.level === selectedSeverity ? 'all' : item.level)}
                title={`${item.label}: ${item.hectares} ha (${item.percentage}%)`}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1.5 px-0.5">
          <span>0%</span>
          <span>AGGREGATE LOSS: {totalHectares.toFixed(1)} ha</span>
          <span>100%</span>
        </div>
      </div>

      {/* Detailed Breakdown Cards / Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {distribution.map((item) => {
          const isSelected = selectedSeverity === item.level;
          return (
            <div
              key={item.level}
              onClick={() => onSelectSeverity && onSelectSeverity(isSelected ? 'all' : item.level)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-600/60 shadow-sm'
                  : 'bg-[#0f1713] border-[#1d2a22] hover:bg-[#141f19] hover:border-[#283b30]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-slate-300 text-[11px] font-medium truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {item.percentage}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-slate-400 text-[11px]">
                <span>{item.hectares} ha</span>
                <span className="text-slate-500">{item.count} events</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter notice if filtered */}
      {selectedSeverity !== 'all' && (
        <div className="mt-3 pt-2 border-t border-[#1a2620] flex items-center justify-between text-[11px] font-mono text-emerald-400">
          <span>Filtered by: {selectedSeverity.toUpperCase()}</span>
          <button
            onClick={() => onSelectSeverity && onSelectSeverity('all')}
            className="text-slate-400 hover:text-slate-200 underline"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
};
