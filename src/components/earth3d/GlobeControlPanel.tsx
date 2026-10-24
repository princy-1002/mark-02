import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Play, 
  Pause,
  ChevronDown
} from 'lucide-react';
import { CAMERA_PRESETS } from '../../data/geoJsonData';
import type { CameraPreset } from '../../data/geoJsonData';

interface GlobeControlPanelProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onSelectPreset: (preset: CameraPreset) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAutoRotating: boolean;
  onToggleAutoRotate: () => void;
  activePresetId?: string;
}

export const GlobeControlPanel: React.FC<GlobeControlPanelProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onSelectPreset,
  isFullscreen,
  onToggleFullscreen,
  isAutoRotating,
  onToggleAutoRotate,
  activePresetId = 'india-overview'
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresetsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activePreset = CAMERA_PRESETS.find(p => p.id === activePresetId) || CAMERA_PRESETS[0];

  return (
    <div className="flex flex-col gap-2 z-20 select-none">
      {/* Target Regions Quick Fly Dropdown */}
      <div className="relative" ref={presetsRef}>
        <button
          onClick={() => setShowPresetsMenu(!showPresetsMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b110d]/90 backdrop-blur-md border border-[#1e2e25] text-slate-200 hover:text-white hover:border-emerald-600/50 shadow-xl text-xs font-mono transition-all"
        >
          <Compass size={14} className="text-emerald-400" />
          <span className="font-semibold truncate max-w-[140px]">
            {activePreset.name}
          </span>
          <ChevronDown size={13} className="text-slate-400" />
        </button>

        {showPresetsMenu && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d1410] border border-[#23352b] rounded-xl shadow-2xl overflow-hidden py-1 z-50 text-xs font-mono animate-in fade-in duration-150">
            <div className="px-3 py-1.5 border-b border-[#18241d] text-[10px] uppercase font-semibold text-slate-400">
              Fly To Priority Hotspot
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-[#152019]">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset);
                    setShowPresetsMenu(false);
                  }}
                  className={`w-full p-2.5 text-left hover:bg-[#141f19] transition-colors flex items-center justify-between ${
                    preset.id === activePresetId ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div>{preset.name}</div>
                    <div className="text-[10px] text-slate-400">{preset.country}</div>
                  </div>
                  {preset.country === 'India' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                      IN
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Tool Palette */}
      <div className="bg-[#0b110d]/90 backdrop-blur-md border border-[#1e2e25] rounded-xl p-1 flex flex-col shadow-xl text-slate-300">
        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          className="p-2.5 rounded-lg hover:text-white hover:bg-[#152019] transition-colors"
          title="Zoom In (+)"
        >
          <Plus size={16} />
        </button>

        <div className="h-px bg-[#18261e] mx-1" />

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          className="p-2.5 rounded-lg hover:text-white hover:bg-[#152019] transition-colors"
          title="Zoom Out (-)"
        >
          <Minus size={16} />
        </button>

        <div className="h-px bg-[#18261e] mx-1" />

        {/* Reset View to India */}
        <button
          onClick={onResetView}
          className="p-2.5 rounded-lg hover:text-white hover:bg-[#152019] transition-colors text-emerald-400"
          title="Reset Camera to India (National Extent)"
        >
          <RotateCcw size={15} />
        </button>

        <div className="h-px bg-[#18261e] mx-1" />

        {/* Auto Rotate Toggle */}
        <button
          onClick={onToggleAutoRotate}
          className={`p-2.5 rounded-lg transition-colors ${
            isAutoRotating ? 'text-emerald-400 bg-emerald-950/60' : 'hover:text-white hover:bg-[#152019]'
          }`}
          title={isAutoRotating ? "Pause Planetary Rotation" : "Start Slow Planetary Rotation"}
        >
          {isAutoRotating ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <div className="h-px bg-[#18261e] mx-1" />

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2.5 rounded-lg hover:text-white hover:bg-[#152019] transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );
};
