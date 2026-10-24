import React, { useState } from 'react';
import type { AnalyticsTrendPoint } from '../../types/analytics';
import type { DateRangeOption } from '../../types/monitoring';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface AnalyticsTrendChartProps {
  data: AnalyticsTrendPoint[];
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  isLoading?: boolean;
  onResetFilters?: () => void;
}

export const AnalyticsTrendChart: React.FC<AnalyticsTrendChartProps> = ({
  data,
  dateRange,
  onDateRangeChange,
  isLoading = false,
  onResetFilters
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dateRangeButtons: { id: DateRangeOption; label: string }[] = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'ytd', label: 'Year to Date' }
  ];

  // Loading State
  if (isLoading) {
    return (
      <div className="card-panel p-6 h-80 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading time-series observation curves...</p>
      </div>
    );
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <div className="card-panel p-8 h-80 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400">
          <AlertCircle size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-200">No Trend Observations Found</h4>
          <p className="text-xs font-mono text-slate-400 max-w-sm">
            No satellite canopy loss events match the selected region and severity filters for this time window.
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#152019] text-emerald-300 border border-emerald-800/40 hover:bg-[#1e2f25] transition-colors"
          >
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  // SVG Scalings
  const width = 720;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 45, left: 60 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.detectedLossHectares, d.previousPeriodHectares)),
    50
  ) * 1.15;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const yCurrent = padding.top + innerHeight - (d.detectedLossHectares / maxVal) * innerHeight;
    const yPrevious = padding.top + innerHeight - (d.previousPeriodHectares / maxVal) * innerHeight;
    return { ...d, x, yCurrent, yPrevious };
  });

  // Current period path
  const currentPath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yCurrent}` : `${acc} L ${p.x} ${p.yCurrent}`),
    ''
  );

  // Gradient area fill path
  const areaPath = `${currentPath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  // Previous period baseline dashed path
  const previousPath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yPrevious}` : `${acc} L ${p.x} ${p.yPrevious}`),
    ''
  );

  // Y-axis tick values
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="card-panel p-5 flex flex-col justify-between">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Forest Loss Time-Series Trend
            </h3>
            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#15201a] border border-[#23352a]">
              Hectares (ha) / Interval
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Bi-temporal detected canopy disturbance vs historical comparison baseline
          </p>
        </div>

        {/* Date Range Selector Pill */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0a0f0d] border border-[#1a2620]">
          {dateRangeButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => onDateRangeChange(btn.id)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                dateRange === btn.id
                  ? 'bg-emerald-950/70 text-emerald-300 font-semibold border border-emerald-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Tooltip Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#090d0b] border border-[#16221a] mb-3 text-xs font-mono">
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded-full bg-red-400" />
            <span className="text-slate-300">Detected Loss Area (Current)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-slate-500" />
            <span className="text-slate-400">Previous Period Baseline</span>
          </div>
        </div>

        {/* Dynamic Tooltip Value */}
        {activePoint && (
          <div className="flex items-center gap-3 text-slate-300">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar size={11} /> {activePoint.label}:
            </span>
            <span className="text-red-400 font-bold">{activePoint.detectedLossHectares} ha</span>
            <span className="text-slate-500">vs</span>
            <span className="text-slate-400">{activePoint.previousPeriodHectares} ha</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              activePoint.variancePct > 0 ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'
            }`}>
              {activePoint.variancePct > 0 ? `+${activePoint.variancePct}%` : `${activePoint.variancePct}%`}
            </span>
          </div>
        )}
      </div>

      {/* Responsive SVG Graphic Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="analyticsLossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#ef4444" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis scale values */}
          {yTicks.map((val, idx) => {
            const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#16221c"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {Math.round(val)} ha
                </text>
              </g>
            );
          })}

          {/* Shaded Area Under Curve */}
          <path d={areaPath} fill="url(#analyticsLossGradient)" />

          {/* Previous Period Baseline Comparison Curve (Dashed) */}
          <path
            d={previousPath}
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          {/* Current Period Detected Loss Curve (Solid) */}
          <path
            d={currentPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points and X-Axis Labels */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={padding.top + innerHeight}
                    stroke="#ef4444"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                )}

                {/* Previous period point marker */}
                <circle
                  cx={p.x}
                  cy={p.yPrevious}
                  r={isHovered ? 3.5 : 2.5}
                  fill="#090d0b"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />

                {/* Current period point marker */}
                <circle
                  cx={p.x}
                  cy={p.yCurrent}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? '#f87171' : '#ef4444'}
                  stroke="#090d0b"
                  strokeWidth="2"
                />

                {/* X-axis label */}
                <text
                  x={p.x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fill={isHovered ? '#e2e8f0' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.label}
                </text>

                {/* Transparent hit area for hover */}
                <rect
                  x={p.x - innerWidth / (points.length * 2)}
                  y={padding.top}
                  width={innerWidth / points.length}
                  height={innerHeight + 25}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
