import React, { useState } from 'react';
import type { TrendDataPoint, DateRangeOption } from '../../types/monitoring';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  data: TrendDataPoint[];
  dateRange: DateRangeOption;
  onDateRangeChange?: (range: DateRangeOption) => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  dateRange
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="card-panel p-5 h-80 flex items-center justify-center text-slate-500 font-mono text-xs">
        No trend data points available for selected interval.
      </div>
    );
  }

  // Calculate SVG dimensions and coordinate scales
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 55 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.detectedLossHectares, d.baselineRateHectares)),
    100
  ) * 1.15;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const yLoss = padding.top + innerHeight - (d.detectedLossHectares / maxVal) * innerHeight;
    const yBase = padding.top + innerHeight - (d.baselineRateHectares / maxVal) * innerHeight;
    return { ...d, x, yLoss, yBase };
  });

  // Construct SVG path strings
  const lossPath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yLoss}` : `${acc} L ${p.x} ${p.yLoss}`),
    ''
  );

  const basePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.yBase}` : `${acc} L ${p.x} ${p.yBase}`),
    ''
  );

  // Area under loss path
  const lossAreaPath = `${lossPath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  // Grid tick levels
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="card-panel p-5 flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Forest Loss Velocity & Baseline
            </h4>
            <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#15201a] border border-[#23352a]">
              Hectares / Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Bi-temporal canopy loss versus 5-year historical regional baseline ({dateRange.toUpperCase()})
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-500" />
            <span className="text-slate-300">Detected Loss</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-500 border-b border-dashed" />
            <span className="text-slate-400">Baseline Rate</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((val, idx) => {
            const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1c2b22"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Baseline Dash Path */}
          <path
            d={basePath}
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.8"
          />

          {/* Loss Shaded Area */}
          <path d={lossAreaPath} fill="url(#lossGradient)" />

          {/* Detected Loss Solid Line */}
          <path
            d={lossPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Interactivity */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={padding.top}
                    x2={p.x}
                    y2={padding.top + innerHeight}
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.yLoss}
                  r={isHovered ? 5 : 3.5}
                  fill="#ef4444"
                  stroke="#0f1512"
                  strokeWidth="2"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#10b981' : '#64748b'}
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Telemetry readout bar on hover */}
        {activePoint && (
          <div className="mt-3 pt-3 border-t border-[#1a2620] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                INTERVAL: <strong className="text-slate-200">{activePoint.label}</strong>
              </span>
              <span className="text-red-400">
                LOSS: <strong>{activePoint.detectedLossHectares} ha</strong>
              </span>
              <span className="text-slate-500 hidden sm:inline">
                BASELINE: {activePoint.baselineRateHectares} ha
              </span>
            </div>
            <div className="text-emerald-400 text-[11px]">
              CONFIDENCE: {(activePoint.confidenceAverage * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
