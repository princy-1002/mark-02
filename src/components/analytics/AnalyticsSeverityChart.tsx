import React from 'react';
import type { AnalyticsSeverityItem } from '../../types/analytics';
import { ShieldAlert, Info } from 'lucide-react';

interface AnalyticsSeverityChartProps {
  distribution: AnalyticsSeverityItem[];
  selectedSeverity: string;
  onSelectSeverity: (severity: string) => void;
}

export const AnalyticsSeverityChart: React.FC<AnalyticsSeverityChartProps> = ({
  distribution,
  selectedSeverity,
  onSelectSeverity
}) => {
  const totalHectares = distribution.reduce((sum, item) => sum + item.hectares, 0);
  const totalEvents = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="card-panel p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert size={16} className="text-emerald-400" />
            Severity Category Distribution
          </h3>
          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#16201a] border border-[#23352a]">
            {totalEvents} Clusters · {Math.round(totalHectares)} ha
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Canopy loss impact classified by surface area and density threshold
        </p>
      </div>

      {/* Proportional Stacked Bar */}
      <div className="space-y-1.5">
        <div className="h-4 w-full bg-[#0d1410] rounded-full overflow-hidden flex border border-[#1e2d24] p-0.5 gap-0.5">
          {distribution.map(item => {
            const width = totalHectares > 0 ? (item.hectares / totalHectares) * 100 : 25;
            const isSelected = selectedSeverity === item.level;
            return (
              <div
                key={item.level}
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color
                }}
                className={`h-full rounded-sm transition-all duration-200 cursor-pointer relative group ${
                  isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : 'hover:opacity-90'
                }`}
                onClick={() => onSelectSeverity(isSelected ? 'all' : item.level)}
                title={`${item.label}: ${item.hectares} ha (${item.percentage}%)`}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100% of detected loss</span>
        </div>
      </div>

      {/* Interactive Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {distribution.map(item => {
          const isSelected = selectedSeverity === item.level;
          return (
            <div
              key={item.level}
              onClick={() => onSelectSeverity(isSelected ? 'all' : item.level)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#15201a] border-emerald-500/80 ring-1 ring-emerald-500/50'
                  : 'bg-[#0d1310] border-[#1c2921] hover:border-slate-600 hover:bg-[#111915]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-mono font-semibold text-slate-200 capitalize">
                    {item.level}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {item.percentage}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base font-bold font-mono text-slate-100">
                  {item.hectares}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {item.count} cluster{item.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 pt-1">
        <Info size={11} className="text-slate-400 shrink-0" />
        <span>Click any severity category to filter the entire analytics dashboard.</span>
      </div>
    </div>
  );
};
