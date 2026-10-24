import React, { useState } from 'react';
import type { DetectionPolygonResult } from '../../types/monitoring';
import { 
  Plus, 
  Minus, 
  RotateCcw
} from 'lucide-react';

interface DetectionMapViewProps {
  detections: DetectionPolygonResult[];
  selectedDetection: DetectionPolygonResult | null;
  onSelectDetection: (det: DetectionPolygonResult) => void;
  regionName: string;
}

export const DetectionMapView: React.FC<DetectionMapViewProps> = ({
  detections,
  selectedDetection,
  onSelectDetection,
  regionName
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredDetection, setHoveredDetection] = useState<DetectionPolygonResult | null>(null);

  const getPolygonStyle = (item: DetectionPolygonResult, isSelected: boolean) => {
    if (item.classification === 'phenological_variation') {
      return {
        fill: '#06b6d4',
        fillOpacity: isSelected ? 0.45 : 0.2,
        stroke: '#06b6d4',
        strokeWidth: isSelected ? 3 : 1.5,
        strokeDasharray: '4 4'
      };
    }

    if (item.classification === 'observed_anomaly') {
      return {
        fill: '#eab308',
        fillOpacity: isSelected ? 0.55 : 0.35,
        stroke: '#eab308',
        strokeWidth: isSelected ? 3 : 2,
        strokeDasharray: '6 3'
      };
    }

    // Confirmed deforestation by severity
    if (item.severity === 'critical') {
      return {
        fill: '#ef4444',
        fillOpacity: isSelected ? 0.75 : 0.55,
        stroke: '#ef4444',
        strokeWidth: isSelected ? 3.5 : 2.5,
        strokeDasharray: 'none'
      };
    }

    if (item.severity === 'high') {
      return {
        fill: '#f97316',
        fillOpacity: isSelected ? 0.7 : 0.5,
        stroke: '#f97316',
        strokeWidth: isSelected ? 3 : 2,
        strokeDasharray: 'none'
      };
    }

    return {
      fill: '#10b981',
      fillOpacity: isSelected ? 0.6 : 0.4,
      stroke: '#10b981',
      strokeWidth: isSelected ? 2.5 : 1.5,
      strokeDasharray: 'none'
    };
  };

  return (
    <div className="card-panel overflow-hidden flex flex-col relative h-[560px] w-full select-none">
      {/* Top HUD Bar */}
      <div className="h-12 bg-[#0c130f]/95 backdrop-blur-md border-b border-[#1b2820] px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">AI SEGMENTATION VECTORS</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-bold hidden sm:inline">
            ZONE: {regionName}
          </span>
          <span className="text-slate-400 hidden md:inline">
            ({detections.length} Polygons Rendered)
          </span>
        </div>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span className="text-slate-300">Confirmed Deforestation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-300 border-dashed" />
            <span className="text-slate-300">Observed Anomaly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 border border-cyan-300 border-dashed" />
            <span className="text-slate-400">Phenology (Discarded)</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#101914] p-0.5 rounded-lg border border-[#203126]">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
            title="Reset Zoom"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport with Satellite Backdrop & Vector Overlays */}
      <div className="relative flex-1 bg-[#060a08] overflow-hidden map-grid-pattern">
        {/* Scaled Layer Content */}
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center'
          }}
          className="absolute inset-0 w-full h-full transition-transform duration-150 select-none"
        >
          {/* Base Orthoimagery Texture (Simulated High-Res Satellite View) */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="forestSurfaceGradient" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stopColor="#0d2417" />
                <stop offset="60%" stopColor="#091b11" />
                <stop offset="100%" stopColor="#05100a" />
              </radialGradient>
              <pattern id="forestTexturePattern" width="48" height="48" patternUnits="userSpaceOnUse">
                <circle cx="24" cy="24" r="18" fill="#0f2e1e" fillOpacity="0.6" />
                <circle cx="44" cy="10" r="12" fill="#0b2417" fillOpacity="0.7" />
                <circle cx="10" cy="38" r="14" fill="#113623" fillOpacity="0.5" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#forestSurfaceGradient)" />
            <rect width="100%" height="100%" fill="url(#forestTexturePattern)" />

            {/* Simulated River Network */}
            <path
              d="M 40,160 Q 220,220 440,180 T 780,290 T 1100,240"
              fill="none"
              stroke="#0e7490"
              strokeWidth="6"
              strokeOpacity="0.5"
            />
            <path
              d="M 220,40 Q 320,240 450,290 T 680,410"
              fill="none"
              stroke="#0891b2"
              strokeWidth="4"
              strokeOpacity="0.4"
            />

            {/* Monitored Sector Contour Boundary */}
            <polygon
              points="100,60 540,50 720,190 620,390 180,350 70,200"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              strokeOpacity="0.4"
            />

            {/* Rendered Detected Forest Loss Polygons */}
            {detections.map((det) => {
              const isSelected = selectedDetection?.id === det.id;
              const isHovered = hoveredDetection?.id === det.id;
              const style = getPolygonStyle(det, isSelected || isHovered);

              return (
                <g
                  key={det.id}
                  onClick={() => onSelectDetection(det)}
                  onMouseEnter={() => setHoveredDetection(det)}
                  onMouseLeave={() => setHoveredDetection(null)}
                  className="cursor-pointer transition-all"
                >
                  {/* Active highlight glow if selected */}
                  {isSelected && (
                    <polygon
                      points={det.svgPolygon.points}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                    />
                  )}

                  {/* Main polygon */}
                  <polygon
                    points={det.svgPolygon.points}
                    fill={style.fill}
                    fillOpacity={style.fillOpacity}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray}
                  />

                  {/* Centroid Tag Label */}
                  <g transform={`translate(${det.svgPolygon.center.x}, ${det.svgPolygon.center.y})`}>
                    <circle
                      r={isSelected ? 6 : 4}
                      fill="#ffffff"
                      stroke={style.stroke}
                      strokeWidth="2"
                    />
                    <text
                      y="-10"
                      textAnchor="middle"
                      fill="#f1f5f9"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                      className="pointer-events-none drop-shadow-md"
                    >
                      {det.id}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredDetection && (
          <div
            style={{
              left: `${hoveredDetection.svgPolygon.center.x}px`,
              top: `${hoveredDetection.svgPolygon.center.y - 45}px`
            }}
            className="absolute z-30 pointer-events-none -translate-x-1/2 bg-[#0b110d]/95 backdrop-blur-md border border-[#203126] text-xs font-mono p-2.5 rounded-lg shadow-2xl space-y-1 animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">{hoveredDetection.name}</span>
              <span className="text-red-400 font-bold">{hoveredDetection.areaHectares} ha</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400">
              <span>Confidence: {(hoveredDetection.confidenceScore * 100).toFixed(0)}%</span>
              <span className="text-emerald-400 capitalize">{hoveredDetection.classification.replace('_', ' ')}</span>
            </div>
          </div>
        )}

        {/* Bottom Coordinates HUD */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none bg-[#0a0f0d]/85 backdrop-blur-md border border-[#1a2720] rounded-lg px-3 py-1 text-[10px] font-mono text-slate-400 flex items-center gap-3">
          <span>Click on any segmented polygon to inspect spectral band measurements and ground verification status</span>
          <span>•</span>
          <span className="text-emerald-400">WGS-84 / UTM 43N</span>
        </div>
      </div>
    </div>
  );
};
