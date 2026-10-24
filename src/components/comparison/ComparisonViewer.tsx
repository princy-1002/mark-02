import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  SatelliteScene, 
  SpectralBandMode, 
  ComparisonDisplayMode 
} from '../../types/monitoring';
import { SatelliteComparisonService } from '../../services/satelliteComparisonService';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Columns, 
  SplitSquareVertical, 
  Sliders
} from 'lucide-react';

interface ComparisonViewerProps {
  beforeScene: SatelliteScene;
  afterScene: SatelliteScene;
  bandMode: SpectralBandMode;
  displayMode: ComparisonDisplayMode;
  onDisplayModeChange: (mode: ComparisonDisplayMode) => void;
  onBandModeChange: (mode: SpectralBandMode) => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  beforeScene,
  afterScene,
  bandMode,
  displayMode,
  onDisplayModeChange,
  onBandModeChange
}) => {
  // Draggable slider percentage (0 to 100)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronized pan & zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle draggable slider mouse/touch events
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 5), 95);
    setSliderPos(percentage);
  }, []);

  const handleMouseDownSlider = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  // Synchronized panning across both scenes
  const handleMouseDownPan = (e: React.MouseEvent) => {
    if (isDragging) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleSliderMove(e.clientX);
    } else if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };
  void handleMouseUp; // Kept for potential touch event extension

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.3, 3.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.3, 0.7));
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSliderPos(50);
  };

  const cssFilter = SatelliteComparisonService.getBandModeFilter(bandMode);

  // SVG representation for Before (Dense undisturbed canopy)
  // Canvas representation for Before (Real raster or SVG vector)
  const renderBeforeCanvas = () => {
    const activeUrl = bandMode === 'ndvi' && beforeScene.ndviUrl ? beforeScene.ndviUrl : beforeScene.previewUrl;
    return (
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          filter: activeUrl && bandMode === 'ndvi' ? 'none' : cssFilter
        }}
        className="absolute inset-0 w-full h-full transition-transform duration-75 select-none"
      >
        {activeUrl ? (
          <div className="relative w-full h-full flex items-center justify-center bg-[#07110b]">
            <img
              src={activeUrl}
              alt="Sentinel-2 Baseline"
              className="w-full h-full object-cover pointer-events-none"
            />
            {beforeScene.isRealIngested && (
              <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-emerald-500/40 text-[11px] font-mono text-emerald-300 shadow-lg">
                🛰️ REAL S2 L2A BOA • {beforeScene.acquisitionDate} • Cloud: {beforeScene.cloudCoverPct}%
              </div>
            )}
          </div>
        ) : (
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <radialGradient id="beforeCanopy" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#0b3823" />
                <stop offset="50%" stopColor="#08291a" />
                <stop offset="100%" stopColor="#051910" />
              </radialGradient>
              <pattern id="forestPatternBefore" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="14" fill="#0f452c" fillOpacity="0.7" />
                <circle cx="36" cy="12" r="10" fill="#0d3f28" fillOpacity="0.8" />
                <circle cx="8" cy="28" r="12" fill="#125134" fillOpacity="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#beforeCanopy)" />
            <rect width="100%" height="100%" fill="url(#forestPatternBefore)" />
            
            {/* River corridor (Natural drainage) */}
            <path
              d="M 60,180 Q 240,240 460,200 T 820,320 T 1200,280"
              fill="none"
              stroke="#0369a1"
              strokeWidth="12"
              strokeOpacity="0.7"
            />

            {/* Intact Primary Canopy Tag */}
            <text x="80" y="80" fill="#34d399" fontSize="14" fontFamily="monospace" fontWeight="bold">
              INTACT PRIMARY CANOPY (NDVI: +0.82)
            </text>
          </svg>
        )}
      </div>
    );
  };

  // Canvas representation for After (Real raster or SVG vector)
  const renderAfterCanvas = () => {
    const activeUrl = bandMode === 'ndvi' && afterScene.ndviUrl ? afterScene.ndviUrl : afterScene.previewUrl;
    return (
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          filter: activeUrl && bandMode === 'ndvi' ? 'none' : cssFilter
        }}
        className="absolute inset-0 w-full h-full transition-transform duration-75 select-none"
      >
        {activeUrl ? (
          <div className="relative w-full h-full flex items-center justify-center bg-[#07110b]">
            <img
              src={activeUrl}
              alt="Sentinel-2 Target"
              className="w-full h-full object-cover pointer-events-none"
            />
            {afterScene.isRealIngested && (
              <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-lg">
                🛰️ REAL S2 L2A BOA • {afterScene.acquisitionDate} • Cloud: {afterScene.cloudCoverPct}%
              </div>
            )}
          </div>
        ) : (
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <radialGradient id="afterCanopy" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#142119" />
                <stop offset="50%" stopColor="#101a14" />
                <stop offset="100%" stopColor="#0a120e" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#afterCanopy)" />

            {/* River corridor */}
            <path
              d="M 60,180 Q 240,240 460,200 T 820,320 T 1200,280"
              fill="none"
              stroke="#0369a1"
              strokeWidth="12"
              strokeOpacity="0.7"
            />

            {/* Clear-Cut Deforestation Scar 1 */}
            <polygon
              points="240,110 420,95 445,210 360,265 220,230"
              fill="#ef4444"
              fillOpacity="0.55"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />

            {/* Clear-Cut Deforestation Scar 2 */}
            <polygon
              points="560,180 720,165 745,270 610,295 540,240"
              fill="#f97316"
              fillOpacity="0.55"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />

            {/* New Linear Logging Road Extension */}
            <path
              d="M 120,400 L 260,230 L 440,210 L 610,295 L 850,330"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="4"
              strokeDasharray="6 3"
            />

            {/* Anomaly Callout text */}
            <text x="250" y="180" fill="#fca5a5" fontSize="13" fontFamily="monospace" fontWeight="bold">
              DETECTED LOSS: 142.8 ha (-0.48 NDVI)
            </text>
            <text x="570" y="240" fill="#fdba74" fontSize="13" fontFamily="monospace" fontWeight="bold">
              ROAD EXPANSION: 68.5 ha
            </text>
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className="card-panel overflow-hidden flex flex-col relative h-[560px] w-full select-none">
      {/* Top Controls Toolbar */}
      <div className="h-12 bg-[#0c130f]/95 backdrop-blur-md border-b border-[#1b2820] px-4 flex items-center justify-between z-30">
        {/* Left: Synchronized Status & Coordinates */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">GEO-LOCKED VIEWPORT</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-bold hidden sm:inline">
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </span>
          <span className="text-slate-500 hidden md:inline">
            Delta Offset: [{panOffset.x}px, {panOffset.y}px]
          </span>
        </div>

        {/* Center: Band Mode Selector */}
        <div className="hidden lg:flex items-center gap-1 bg-[#101914] p-1 rounded-lg border border-[#203126] text-xs font-mono">
          <span className="text-slate-500 text-[10px] px-1.5 uppercase font-semibold">
            Bands:
          </span>
          {(['true-color', 'false-color-nir', 'ndvi', 'swir-nbr'] as SpectralBandMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onBandModeChange(mode)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                bandMode === mode
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'true-color' && 'RGB 4-3-2'}
              {mode === 'false-color-nir' && 'NIR 8-4-3'}
              {mode === 'ndvi' && 'NDVI Index'}
              {mode === 'swir-nbr' && 'SWIR NBR'}
            </button>
          ))}
        </div>

        {/* Right: Display Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#101914] p-0.5 rounded-lg border border-[#203126]">
            <button
              onClick={() => onDisplayModeChange('split-wipe')}
              className={`p-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                displayMode === 'split-wipe'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Draggable Split Curtain Wipe"
            >
              <SplitSquareVertical size={14} />
              <span className="hidden sm:inline">Curtain</span>
            </button>
            <button
              onClick={() => onDisplayModeChange('side-by-side')}
              className={`p-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1 ${
                displayMode === 'side-by-side'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dual Synchronized Side-by-Side"
            >
              <Columns size={14} />
              <span className="hidden sm:inline">Side-by-Side</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-[#101914] p-0.5 rounded-lg border border-[#203126]">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
              title="Zoom In"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
              title="Zoom Out"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#16221b]"
              title="Reset View"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDownPan}
        onMouseMove={handleMouseMove}
        className="relative flex-1 bg-[#060a08] overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* MODE 1: Split Curtain Wipe (Draggable Slider) */}
        {displayMode === 'split-wipe' && (
          <div className="relative w-full h-full">
            {/* Base layer (AFTER / Post-Loss scene on full canvas) */}
            <div className="absolute inset-0 w-full h-full">
              {renderAfterCanvas()}
            </div>

            {/* Overlaid clipped layer (BEFORE / Pre-Loss scene clipped to slider position) */}
            <div
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              className="absolute inset-0 w-full h-full border-r-2 border-emerald-400 pointer-events-none"
            >
              {renderBeforeCanvas()}
            </div>

            {/* Draggable Vertical Divider Handle */}
            <div
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleMouseDownSlider}
              className="absolute top-0 bottom-0 w-8 -translate-x-1/2 flex items-center justify-center cursor-ew-resize z-20 group"
            >
              {/* Vertical line indicator */}
              <div className="w-0.5 h-full bg-emerald-400 shadow-lg shadow-emerald-950 group-hover:bg-emerald-300 transition-colors" />

              {/* Central handle grip badge */}
              <div className="absolute w-8 h-8 rounded-full bg-[#0e1713] border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-2xl group-hover:scale-110 transition-transform">
                <Sliders size={14} className="rotate-90" />
              </div>
            </div>

            {/* In-viewport labels */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none bg-[#0a0f0d]/90 backdrop-blur-md border border-[#1b2b20] px-2.5 py-1 rounded text-xs font-mono text-emerald-300">
              ◄ BEFORE: {beforeScene.acquisitionDate}
            </div>
            <div className="absolute top-4 right-4 z-10 pointer-events-none bg-[#0a0f0d]/90 backdrop-blur-md border border-[#2b1b1b] px-2.5 py-1 rounded text-xs font-mono text-red-300">
              AFTER: {afterScene.acquisitionDate} ►
            </div>
          </div>
        )}

        {/* MODE 2: Dual Synchronized Side-by-Side */}
        {displayMode === 'side-by-side' && (
          <div className="grid grid-cols-2 w-full h-full divide-x-2 divide-[#1e2e25]">
            {/* Panel 1: BEFORE */}
            <div className="relative w-full h-full overflow-hidden">
              {renderBeforeCanvas()}
              <div className="absolute top-4 left-4 z-10 pointer-events-none bg-[#0a0f0d]/90 backdrop-blur-md border border-[#1b2b20] px-2.5 py-1 rounded text-xs font-mono text-emerald-300 font-semibold">
                BEFORE: {beforeScene.acquisitionDate} ({beforeScene.satellite})
              </div>
            </div>

            {/* Panel 2: AFTER (Identical Pan & Zoom synchronized automatically) */}
            <div className="relative w-full h-full overflow-hidden">
              {renderAfterCanvas()}
              <div className="absolute top-4 left-4 z-10 pointer-events-none bg-[#0a0f0d]/90 backdrop-blur-md border border-[#2b1b1b] px-2.5 py-1 rounded text-xs font-mono text-red-300 font-semibold">
                AFTER: {afterScene.acquisitionDate} ({afterScene.satellite})
              </div>
            </div>
          </div>
        )}

        {/* Floating Instructions HUD */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none bg-[#0a0f0d]/85 backdrop-blur-md border border-[#1a2720] rounded-lg px-3 py-1 text-[10px] font-mono text-slate-400">
          <span>Click & drag to pan viewport • Use + / - or trackpad to zoom • Extents locked across captures</span>
        </div>
      </div>
    </div>
  );
};
