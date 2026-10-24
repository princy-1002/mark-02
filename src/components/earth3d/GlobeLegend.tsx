import React from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { DemoBadge } from '../common/Badge';

interface GlobeLegendProps {
  showForestCover: boolean;
  onToggleForestCover: () => void;
  showForestLoss: boolean;
  onToggleForestLoss: () => void;
  showHotspotPins: boolean;
  onToggleHotspotPins: () => void;
  showBoundaries: boolean;
  onToggleBoundaries: () => void;
  showVerificationCandidates?: boolean;
  onToggleVerificationCandidates?: () => void;
  showRadarLayer?: boolean;
  onToggleRadarLayer?: () => void;
}

export const GlobeLegend: React.FC<GlobeLegendProps> = ({
  showForestCover,
  onToggleForestCover,
  showForestLoss,
  onToggleForestLoss,
  showHotspotPins,
  onToggleHotspotPins,
  showBoundaries,
  onToggleBoundaries,
  showVerificationCandidates = false,
  onToggleVerificationCandidates,
  showRadarLayer = false,
  onToggleRadarLayer,
}) => {
  return (
    <div className="bg-[#0b110d]/90 backdrop-blur-md border border-[#1e2e25] rounded-xl p-4 shadow-2xl text-xs font-mono text-slate-300 w-64 select-none animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#18261e]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-emerald-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wide text-[11px]">
            Map Overlays & Legend
          </span>
        </div>
        <DemoBadge />
      </div>

      {/* Layer Toggles */}
      <div className="space-y-2 mb-4">
        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
          Active Layers
        </p>

        {/* Forest Cover Toggle */}
        <button
          onClick={onToggleForestCover}
          className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
            showForestCover
              ? 'bg-[#121c17] border-emerald-700/50 text-slate-200'
              : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-400" />
            <span className="text-xs font-medium">Forest Canopy Cover</span>
          </div>
          {showForestCover ? <Eye size={13} className="text-emerald-400" /> : <EyeOff size={13} />}
        </button>

        {/* Forest Loss Toggle */}
        <button
          onClick={onToggleForestLoss}
          className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
            showForestLoss
              ? 'bg-[#1a1212] border-red-800/50 text-slate-200'
              : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-red-500/50 border border-red-400" />
            <span className="text-xs font-medium">Detected Forest Loss</span>
          </div>
          {showForestLoss ? <Eye size={13} className="text-red-400" /> : <EyeOff size={13} />}
        </button>

        {/* Hotspot Pins Toggle */}
        <button
          onClick={onToggleHotspotPins}
          className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
            showHotspotPins
              ? 'bg-[#121c17] border-amber-700/50 text-slate-200'
              : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-medium">Hotspot Marker Pins</span>
          </div>
          {showHotspotPins ? <Eye size={13} className="text-amber-400" /> : <EyeOff size={13} />}
        </button>

        {/* Protected Reserve Boundaries Toggle */}
        <button
          onClick={onToggleBoundaries}
          className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
            showBoundaries
              ? 'bg-[#0f1b21] border-cyan-800/50 text-slate-200'
              : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t border-dashed border-cyan-400" />
            <span className="text-xs font-medium">Reserve Corridors</span>
          </div>
          {showBoundaries ? <Eye size={13} className="text-cyan-400" /> : <EyeOff size={13} />}
        </button>
        {/* Verification Candidates Toggle */}
        {onToggleVerificationCandidates && (
          <button
            onClick={onToggleVerificationCandidates}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              showVerificationCandidates
                ? 'bg-[#1a1218] border-purple-700/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-purple-300" />
              <span className="text-xs font-medium">AI Candidates</span>
            </div>
            {showVerificationCandidates ? <Eye size={13} className="text-purple-400" /> : <EyeOff size={13} />}
          </button>
        )}

        {/* Radar Layer Toggle */}
        {onToggleRadarLayer && (
          <button
            onClick={onToggleRadarLayer}
            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
              showRadarLayer
                ? 'bg-[#0f1b21] border-blue-700/50 text-slate-200'
                : 'bg-[#090d0b] border-[#18241d] text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-400" />
              <span className="text-xs font-medium">Radar (S-1)</span>
            </div>
            {showRadarLayer ? <Eye size={13} className="text-blue-400" /> : <EyeOff size={13} />}
          </button>
        )}
      </div>

      {/* Severity Color Classification Key */}
      <div className="pt-2 border-t border-[#18261e] space-y-1.5">
        <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">
          Deforestation Severity
        </p>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-sm shadow-red-950" />
            <span className="text-red-300 font-medium">Critical Loss</span>
          </div>
          <span className="text-slate-400">&gt;80 ha</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm shadow-orange-950" />
            <span className="text-orange-300 font-medium">High Loss</span>
          </div>
          <span className="text-slate-400">30–80 ha</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span className="text-amber-300 font-medium">Moderate Loss</span>
          </div>
          <span className="text-slate-400">15–30 ha</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-emerald-300 font-medium">Low Impact</span>
          </div>
          <span className="text-slate-400">&lt;15 ha</span>
        </div>
      </div>
    </div>
  );
};
