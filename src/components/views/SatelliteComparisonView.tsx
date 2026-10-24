import React, { useState, useMemo } from 'react';
import type { 
  SpectralBandMode, 
  ComparisonDisplayMode
} from '../../types/monitoring';
import { 
  SatelliteComparisonService, 
} from '../../services/satelliteComparisonService';
import { ComparisonViewer } from '../comparison/ComparisonViewer';
import { SceneMetadataCard } from '../comparison/SceneMetadataCard';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Layers, 
  ArrowLeft, 
  Sparkles, 
  Satellite
} from 'lucide-react';

interface SatelliteComparisonViewProps {
  onBackToOverview: () => void;
}

export const SatelliteComparisonView: React.FC<SatelliteComparisonViewProps> = ({
  onBackToOverview
}) => {
  // Region selection for satellite pairs
  const [selectedRegionId, setSelectedRegionId] = useState<string>('western-ghats');

  // Available scenes for region
  const availableScenes = useMemo(() => {
    return SatelliteComparisonService.getScenesForRegion(selectedRegionId);
  }, [selectedRegionId]);

  // Selected before and after scenes
  const [beforeSceneId, setBeforeSceneId] = useState<string>(availableScenes[0]?.id || '');
  const [afterSceneId, setAfterSceneId] = useState<string>(
    availableScenes[availableScenes.length - 1]?.id || ''
  );

  // Band mode & Display mode
  const [bandMode, setBandMode] = useState<SpectralBandMode>('true-color');
  const [displayMode, setDisplayMode] = useState<ComparisonDisplayMode>('split-wipe');

  const beforeScene = useMemo(() => {
    return availableScenes.find(s => s.id === beforeSceneId) || availableScenes[0];
  }, [availableScenes, beforeSceneId]);

  const afterScene = useMemo(() => {
    return availableScenes.find(s => s.id === afterSceneId) || availableScenes[availableScenes.length - 1];
  }, [availableScenes, afterSceneId]);

  const presetPairs = useMemo(() => {
    return SatelliteComparisonService.getPresetPairs(selectedRegionId);
  }, [selectedRegionId]);

  return (
    <div className="space-y-5">
      {/* Module Mission Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-600/50 flex items-center justify-center text-cyan-400 shrink-0">
            <Layers size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-sans tracking-tight m-0">
                Satellite Imagery Comparison Studio
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Synchronized bi-temporal wipe curtain & multi-spectral band inspector
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Region Switcher */}
          <select
            value={selectedRegionId}
            onChange={(e) => {
              const newReg = e.target.value;
              setSelectedRegionId(newReg);
              const scenes = SatelliteComparisonService.getScenesForRegion(newReg);
              setBeforeSceneId(scenes[0]?.id || '');
              setAfterSceneId(scenes[scenes.length - 1]?.id || '');
            }}
            className="bg-[#121c17] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
          >
            <option value="western-ghats">Western Ghats (Nilgiris, India)</option>
            <option value="northeast-india">Northeast India (Assam Foothills)</option>
            <option value="amazon-br">Amazon Basin Sector 4B (Pará)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={onBackToOverview}
          >
            Back
          </Button>
        </div>
      </div>

      {/* Quick Preset Comparison Pairs */}
      {presetPairs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
            <Sparkles size={12} className="text-emerald-400" />
            Analysis Presets:
          </span>
          {presetPairs.map((pair, idx) => (
            <button
              key={idx}
              onClick={() => {
                setBeforeSceneId(pair.beforeSceneId);
                setAfterSceneId(pair.afterSceneId);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#111915] border border-[#203127] text-slate-300 hover:text-white hover:border-emerald-600/50 hover:bg-[#15211b] transition-all text-left"
            >
              <div className="font-semibold text-emerald-400 text-[11px]">{pair.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Main Synchronized Comparison Canvas */}
      {beforeScene && afterScene && (
        <ComparisonViewer
          beforeScene={beforeScene}
          afterScene={afterScene}
          bandMode={bandMode}
          displayMode={displayMode}
          onDisplayModeChange={(m) => setDisplayMode(m)}
          onBandModeChange={(b) => setBandMode(b)}
        />
      )}

      {/* Dual Metadata Panels: BEFORE & AFTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SceneMetadataCard
          label="BEFORE"
          scene={beforeScene}
          availableScenes={availableScenes}
          onSelectScene={(id) => setBeforeSceneId(id)}
        />
        <SceneMetadataCard
          label="AFTER"
          scene={afterScene}
          availableScenes={availableScenes}
          onSelectScene={(id) => setAfterSceneId(id)}
        />
      </div>

      {/* Data Accuracy & Spectral Band Documentation Footer */}
      <div className="p-4 rounded-xl bg-[#0c120f] border border-[#19261f] text-xs font-mono text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-semibold uppercase text-[11px] flex items-center gap-1.5">
            <Satellite size={14} className="text-emerald-400" />
            Sensor Calibration & Atmospheric Radiance Notes
          </span>
          <span className="text-[10px] text-emerald-400">
            Copernicus Level-2A BOA Reflectance
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
          Surface reflectance calibrated against Bottom-Of-Atmosphere (BOA) sen2cor algorithms. False Color NIR (Bands 8-4-3) highlights chlorophyll cellular density in deep crimson, enabling clear differentiation between natural deciduous dry-down and permanent mechanized canopy clear-cutting.
        </p>
      </div>
    </div>
  );
};
