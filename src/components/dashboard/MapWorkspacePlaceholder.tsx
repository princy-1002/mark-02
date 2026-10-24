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
    <div className={`card-panel overflow-hidden flex flex-col relative transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-[#090d0b]' : 'h-[460px] w-full'
    }`}>
      {/* Top Map HUD Bar */}
      <div className="h-12 bg-[#0d1410]/95 backdrop-blur-md border-b border-[#1c2921] px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">GEOSPATIAL VIEWPORT</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono text-slate-300 truncate hidden sm:inline">
            ZONE: {region.name}
          </span>
          <span className="text-xs font-mono text-slate-500 hidden md:inline">
            [{region.coordinates.lat.toFixed(4)}°, {region.coordinates.lng.toFixed(4)}°]
          </span>
        </div>

        {/* Integration Bridge Callout */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-700/50 text-[11px] font-mono text-emerald-300">
            <Sparkles size={12} className="text-emerald-400" />
            <span>CesiumJS 3D Globe Bridge Ready</span>
          </div>

          {onNavigateTo3DEarth && (
            <button
              onClick={onNavigateTo3DEarth}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded bg-[#15221b] border border-[#23362a] hover:bg-[#1a2b22] transition-colors flex items-center gap-1"
            >
              <Globe size={13} />
              <span>Full 3D Earth</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#18241d] transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Map"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Map Canvas Placeholder / Cesium Integration Anchor */}
      <div 
        id="cesium-viewport-container" 
        className="relative flex-1 bg-[#070b09] overflow-hidden map-grid-pattern select-none"
      >
        {/* Simulated Satellite Forest Canopy Surface */}
        <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="forestCanopyGlow" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#042f24" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#021611" stopOpacity="0" />
              </radialGradient>
              <pattern id="contourGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="#10b981" fillOpacity="0.15" />
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#forestCanopyGlow)" />
            <rect width="100%" height="100%" fill="url(#contourGrid)" />
            
            {/* Simulated River and Drainage Vectors */}
            <path
              d="M 50,120 Q 240,180 420,140 T 780,260 T 1100,220"
              fill="none"
              stroke="#0e7490"
              strokeWidth="2"
              strokeOpacity="0.35"
              strokeDasharray="6 3"
            />
            <path
              d="M 220,50 Q 320,240 450,290 T 680,410"
              fill="none"
              stroke="#0891b2"
              strokeWidth="1.5"
              strokeOpacity="0.25"
            />

            {/* Monitored Sector Polygon Contour */}
            <polygon
              points="140,80 520,70 680,210 590,390 210,340 110,210"
              fill="#10b981"
              fillOpacity="0.04"
              stroke="#10b981"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              strokeOpacity="0.4"
            />
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
          {/* Zoom Controls */}
          <div className="bg-[#0b120e]/90 backdrop-blur-md border border-[#1e2c24] rounded-lg p-1 flex flex-col shadow-lg">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 16))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-[#15201a] rounded transition-colors"
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
            <div className="h-px bg-[#1c2921] my-0.5" />
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 6))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-[#15201a] rounded transition-colors"
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
          </div>

          {/* Reset View Button */}
          <button
            onClick={() => {
              setZoomLevel(11);
              setSelectedHotspot(null);
            }}
            className="p-2 bg-[#0b120e]/90 backdrop-blur-md border border-[#1e2c24] rounded-lg text-slate-300 hover:text-white hover:bg-[#15201a] shadow-lg transition-colors"
            title="Reset Map Extents"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Layer Selector Bar (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 bg-[#0a0f0d]/90 backdrop-blur-md border border-[#1e2c24] rounded-lg p-1 flex items-center gap-1 shadow-lg text-xs font-mono">
          <button
            onClick={() => setActiveLayer('ndvi')}
            className={`px-2 py-1 rounded transition-colors ${
              activeLayer === 'ndvi'
                ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141e18]'
            }`}
          >
            NDVI Anomaly
          </button>
          <button
            onClick={() => setActiveLayer('true-color')}
            className={`px-2 py-1 rounded transition-colors ${
              activeLayer === 'true-color'
                ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141e18]'
            }`}
          >
            True Color
          </button>
          <button
            onClick={() => setActiveLayer('infrared')}
            className={`px-2 py-1 rounded transition-colors ${
              activeLayer === 'infrared'
                ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141e18]'
            }`}
          >
            NIR SWIR
          </button>
          <button
            onClick={() => setActiveLayer('burn')}
            className={`px-2 py-1 rounded transition-colors ${
              activeLayer === 'burn'
                ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141e18]'
            }`}
          >
            NBR Index
          </button>
        </div>
      </div>
    </div>
  );
};
