import React, { useState } from 'react';
import { 
  Globe, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Minus, 
  RotateCcw, 
  Compass, 
  Sparkles
} from 'lucide-react';
import type { ForestLossEvent, Region } from '../../types/monitoring';

interface MapWorkspacePlaceholderProps {
  region: Region;
  events: ForestLossEvent[];
  onSelectEvent: (event: ForestLossEvent) => void;
  onNavigateTo3DEarth?: () => void;
}

export const MapWorkspacePlaceholder: React.FC<MapWorkspacePlaceholderProps> = ({
  region,
  events,
  onSelectEvent,
  onNavigateTo3DEarth
}) => {
  const [activeLayer, setActiveLayer] = useState<'ndvi' | 'true-color' | 'infrared' | 'burn'>('ndvi');
  const [zoomLevel, setZoomLevel] = useState<number>(11);
  const [selectedHotspot, setSelectedHotspot] = useState<ForestLossEvent | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Normalization for visual pin plotting on the simulated 2D raster viewport
  // Bounds roughly around the selected region
  const baseLat = region.coordinates.lat;
  const baseLng = region.coordinates.lng;

  const calculatePinPosition = (evtLat: number, evtLng: number) => {
    // Spread coordinates relative to base coords for visual realism
    const latDiff = (evtLat - baseLat) * 35;
    const lngDiff = (evtLng - baseLng) * 35;
    
    // Clamp to 15% - 85% of map bounds
    const topPct = Math.min(Math.max(50 - latDiff, 18), 82);
    const leftPct = Math.min(Math.max(50 + lngDiff, 15), 85);
    return { top: `${topPct}%`, left: `${leftPct}%` };
  };

  return (
    <div className={`card-panel rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 border border-teal-500/35 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(20,184,166,0.15)] ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-[#060d09]' : 'h-[460px] w-full'
    }`}>
      {/* Top Map HUD Bar */}
      <div className="h-14 bg-gradient-to-r from-[#0d1a14]/95 via-[#0e1f18]/95 to-[#0b1712]/95 backdrop-blur-xl border-b border-teal-500/25 px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-teal-300">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.9)]" />
            <span className="font-bold tracking-wider uppercase">GEOSPATIAL VIEWPORT</span>
          </div>
          <span className="text-teal-500/40">|</span>
          <span className="text-xs font-mono text-slate-200 truncate hidden sm:inline font-semibold">
            ZONE: {region.name}
          </span>
          <span className="text-xs font-mono text-teal-500/80 hidden md:inline">
            [{region.coordinates.lat.toFixed(4)}°, {region.coordinates.lng.toFixed(4)}°]
          </span>
        </div>

        {/* Integration Bridge Callout */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/50 text-[11px] font-mono text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.25)]">
            <Sparkles size={12} className="text-teal-400" />
            <span>CesiumJS 3D Globe Bridge Ready</span>
          </div>

          {onNavigateTo3DEarth && (
            <button
              onClick={onNavigateTo3DEarth}
              className="text-xs font-semibold text-teal-300 hover:text-white px-3 py-1 rounded-xl bg-[#0e1e17]/90 border border-teal-500/40 hover:border-teal-400/90 hover:bg-[#142820] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(20,184,166,0.18)]"
            >
              <Globe size={13} className="text-teal-400" />
              <span>Full 3D Earth</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Map"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Map Canvas Placeholder / Cesium Integration Anchor */}
      <div 
        id="cesium-viewport-container" 
        className="relative flex-1 bg-gradient-to-b from-[#050b08] via-[#060e0a] to-[#040806] overflow-hidden map-grid-pattern select-none"
      >
        {/* Futuristic 3D Perspective Digital Elevation Wireframe Terrain Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end">
          <svg className="w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="terrainGlowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#042a1e" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#0d553e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="wireframeLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Background Perspective Grid Floor */}
            <g stroke="#14b8a6" strokeOpacity="0.12" strokeWidth="0.8">
              {Array.from({ length: 25 }).map((_, i) => (
                <line key={`vert-${i}`} x1={i * 42} y1="140" x2={500 + (i - 12) * 55} y2="400" />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`horiz-${i}`} x1="0" y1={180 + i * 28} x2="1000" y2={180 + i * 28} />
              ))}
            </g>

            {/* Back Mountain Ridge Wireframe */}
            <path
              d="M 0,260 Q 140,210 260,240 T 480,180 T 700,220 T 900,190 L 1000,210 L 1000,400 L 0,400 Z"
              fill="url(#terrainGlowGrad)"
              stroke="#0d9488"
              strokeWidth="1"
              strokeOpacity="0.4"
            />

            {/* Middle Elevation Terrain Wireframe with Peaks */}
            <path
              d="M 0,290 C 120,240 200,160 310,210 C 400,250 490,140 600,190 C 710,240 820,170 1000,250 L 1000,400 L 0,400 Z"
              fill="rgba(6, 78, 59, 0.25)"
              stroke="url(#wireframeLineGrad)"
              strokeWidth="1.5"
              strokeOpacity="0.75"
            />

            {/* Prominent Foreground 3D Wireframe Ridge (Matching reference screenshot) */}
            <path
              d="M 0,330 C 100,290 180,240 280,260 C 360,280 430,220 520,240 C 620,260 740,200 860,250 C 940,280 980,260 1000,270"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2"
              className="terrain-wireframe-glow"
            />

            {/* Detailed Wireframe Cross-Grid Contours */}
            {Array.from({ length: 18 }).map((_, i) => {
              const xPos = 40 + i * 52;
              const yPeak = 220 + Math.sin(i * 0.5) * 45;
              return (
                <path
                  key={`wire-mesh-${i}`}
                  d={`M ${xPos},400 L ${xPos + 10},${yPeak} L ${xPos + 35},${yPeak + 20} L ${xPos + 45},400`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="0.8"
                  strokeOpacity="0.35"
                />
              );
            })}

            {/* Glowing Peak Vertices (Telemetry nodes) */}
            <circle cx="310" cy="210" r="3" fill="#2dd4bf" className="terrain-wireframe-glow" />
            <circle cx="600" cy="190" r="3.5" fill="#34d399" className="terrain-wireframe-glow" />
            <circle cx="520" cy="240" r="2.5" fill="#2dd4bf" />
            <circle cx="740" cy="200" r="3" fill="#38bdf8" />
            <circle cx="860" cy="250" r="2.5" fill="#2dd4bf" />
          </svg>
        </div>

        {/* Hotspot Markers on Canvas */}
        {events.map((evt) => {
          const pos = calculatePinPosition(evt.coordinates.lat, evt.coordinates.lng);
          const isCritical = evt.severity === 'critical';
          const isHigh = evt.severity === 'high';
          const isSelected = selectedHotspot?.id === evt.id;

          return (
            <div
              key={evt.id}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
              onClick={() => {
                setSelectedHotspot(evt);
                onSelectEvent(evt);
              }}
            >
              {/* Radar ring animation */}
              <div
                className={`w-8 h-8 rounded-full absolute -top-1 -left-1 opacity-75 ${
                  isCritical ? 'bg-red-500 animate-ping' :
                  isHigh ? 'bg-orange-500 animate-ping' :
                  'bg-amber-400 animate-ping'
                }`}
                style={{ animationDuration: isCritical ? '1.8s' : '3s' }}
              />

              {/* Pin icon */}
              <div
                className={`relative w-6 h-6 rounded-full flex items-center justify-center border transition-transform group-hover:scale-125 shadow-lg ${
                  isCritical ? 'bg-red-600 border-red-300 text-white shadow-red-950' :
                  isHigh ? 'bg-orange-600 border-orange-300 text-white shadow-orange-950' :
                  'bg-amber-500 border-amber-200 text-slate-900 shadow-amber-950'
                } ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : ''}`}
              >
                <span className="text-[10px] font-mono font-bold">!</span>
              </div>

              {/* Pin Label Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                <div className="bg-[#0b100d] border border-[#203126] text-slate-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap font-mono">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-red-400">{evt.id}</span>
                    <span>•</span>
                    <span className="text-slate-300">{evt.areaHectares} ha lost</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{evt.primaryDriver}</div>
                </div>
                <div className="w-2 h-2 bg-[#0b100d] border-r border-b border-[#203126] rotate-45 -mt-1" />
              </div>
            </div>
          );
        })}

        {/* Selected Hotspot Floating Inspector Card */}
        {selectedHotspot && (
          <div className="absolute top-4 left-4 z-30 max-w-xs bg-[#0e1612]/95 backdrop-blur-md border border-[#23352a] rounded-xl p-3.5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  DETECTION HOTSPOT
                </span>
                <h5 className="text-xs font-bold text-slate-100 font-mono">
                  {selectedHotspot.id}
                </h5>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold px-1"
              >
                ×
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 font-mono mb-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Area Deforested:</span>
                <span className="text-red-400 font-bold">{selectedHotspot.areaHectares} ha</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NDVI Variance:</span>
                <span className="text-orange-400">{selectedHotspot.ndviDrop} drop</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-emerald-400">{(selectedHotspot.confidenceScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Driver:</span>
                <span className="text-slate-200 truncate">{selectedHotspot.primaryDriver}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectEvent(selectedHotspot)}
              className="w-full py-1.5 text-center text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-lg transition-colors"
            >
              Inspect Spectral Telemetry
            </button>
          </div>
        )}

        {/* Floating Telemetry Coordinates Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-[#0a0f0d]/90 backdrop-blur-md border border-[#1d2b23] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-400 flex items-center gap-4 hidden sm:flex">
          <div>
            <span className="text-slate-500">LAT:</span> {baseLat.toFixed(4)}°
          </div>
          <div>
            <span className="text-slate-500">LNG:</span> {baseLng.toFixed(4)}°
          </div>
          <div>
            <span className="text-slate-500">ALT:</span> {(480 / (zoomLevel / 10)).toFixed(0)} km
          </div>
          <div>
            <span className="text-slate-500">GSD:</span> 10m/px
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Compass size={12} />
            <span>HEADING 000°</span>
          </div>
        </div>

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Zoom and Reset Controls in single spatial vertical pill */}
          <div className="bg-[#09140f]/95 backdrop-blur-xl border border-teal-500/35 rounded-2xl p-1 flex flex-col items-center shadow-[0_0_16px_rgba(20,184,166,0.18)]">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 16))}
              className="p-2 text-slate-300 hover:text-white hover:bg-teal-950/60 rounded-xl transition-all"
              title="Zoom In"
            >
              <Plus size={16} className="text-teal-400" />
            </button>
            <div className="w-4 h-px bg-teal-500/20 my-1" />
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 6))}
              className="p-2 text-slate-300 hover:text-white hover:bg-teal-950/60 rounded-xl transition-all"
              title="Zoom Out"
            >
              <Minus size={16} className="text-teal-400" />
            </button>
            <div className="w-4 h-px bg-teal-500/20 my-1" />
            <button
              onClick={() => {
                setZoomLevel(11);
                setSelectedHotspot(null);
              }}
              className="p-2 text-slate-300 hover:text-white hover:bg-teal-950/60 rounded-xl transition-all"
              title="Reset Map Extents"
            >
              <RotateCcw size={15} className="text-teal-400" />
            </button>
          </div>
        </div>

        {/* Layer Selector Bar (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 bg-[#09140f]/95 backdrop-blur-xl border border-teal-500/35 rounded-2xl p-1 flex items-center gap-1 shadow-[0_0_16px_rgba(20,184,166,0.18)] text-xs font-mono">
          <button
            onClick={() => setActiveLayer('ndvi')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeLayer === 'ndvi'
                ? 'bg-teal-500/25 border border-teal-400/80 text-teal-200 font-semibold shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-teal-200 hover:bg-teal-950/40'
            }`}
          >
            NDVI Anomaly
          </button>
          <button
            onClick={() => setActiveLayer('true-color')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeLayer === 'true-color'
                ? 'bg-teal-500/25 border border-teal-400/80 text-teal-200 font-semibold shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-teal-200 hover:bg-teal-950/40'
            }`}
          >
            True Color
          </button>
          <button
            onClick={() => setActiveLayer('infrared')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeLayer === 'infrared'
                ? 'bg-teal-500/25 border border-teal-400/80 text-teal-200 font-semibold shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-teal-200 hover:bg-teal-950/40'
            }`}
          >
            NIR SWIR
          </button>
          <button
            onClick={() => setActiveLayer('burn')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeLayer === 'burn'
                ? 'bg-teal-500/25 border border-teal-400/80 text-teal-200 font-semibold shadow-[0_0_10px_rgba(20,184,166,0.3)]'
                : 'text-slate-400 hover:text-teal-200 hover:bg-teal-950/40'
            }`}
          >
            NBR Index
          </button>
        </div>
      </div>
    </div>
  );
};
