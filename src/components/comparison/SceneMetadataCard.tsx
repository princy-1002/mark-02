import React from 'react';
import type { SatelliteScene } from '../../types/monitoring';
import { 
  Satellite, 
  Calendar, 
  Cloud, 
  Sun, 
  Layers
} from 'lucide-react';

interface SceneMetadataCardProps {
  label: 'BEFORE' | 'AFTER';
  scene: SatelliteScene | undefined;
  onSelectScene?: (id: string) => void;
  availableScenes: SatelliteScene[];
}

export const SceneMetadataCard: React.FC<SceneMetadataCardProps> = ({
  label,
  scene,
  onSelectScene,
  availableScenes
}) => {
  if (!scene) {
    return (
      <div className="card-panel p-4 text-xs font-mono text-slate-500">
        No satellite capture scene selected.
      </div>
    );
  }

  const isCloudDegraded = scene.cloudCoverPct > 10;

  return (
    <div className="card-panel p-4 text-xs font-mono select-none">
      {/* Header with Title and Dropdown */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1b2921]">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
            label === 'BEFORE' 
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
              : 'bg-red-950 text-red-300 border border-red-700/60'
          }`}>
            {label} CAPTURE
          </span>
          <span className="text-slate-200 font-semibold truncate max-w-[150px]">
            {scene.satellite}
          </span>
        </div>

        {onSelectScene && (
          <select
            value={scene.id}
            onChange={(e) => onSelectScene(e.target.value)}
            className="bg-[#0e1612] text-slate-300 border border-[#203126] rounded-lg px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer"
          >
            {availableScenes.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0c120f]">
                {s.acquisitionDate} ({s.satellite} • {s.cloudCoverPct}% Cloud)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Metadata Attributes */}
      <div className="space-y-2 text-[11px]">
        <div className="flex items-center justify-between py-1 border-b border-[#16231c]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar size={13} className="text-emerald-400" />
            Acquisition Date:
          </span>
          <span className="text-slate-200 font-bold font-mono">{scene.acquisitionDate}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[#16231c]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Satellite size={13} className="text-emerald-400" />
            Sensor Platform:
          </span>
          <span className="text-slate-300 truncate max-w-[170px]">{scene.sensor}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[#16231c]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Cloud size={13} className={isCloudDegraded ? "text-orange-400" : "text-emerald-400"} />
            Cloud Cover:
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${isCloudDegraded ? "text-orange-400" : "text-slate-200"}`}>
              {scene.cloudCoverPct}%
            </span>
            {isCloudDegraded && (
              <span className="text-[9px] px-1 rounded bg-orange-950/80 text-orange-400 border border-orange-800/50">
                Atmospheric Noise
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[#16231c]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Sun size={13} className="text-amber-400" />
            Sun Elevation:
          </span>
          <span className="text-slate-300">{scene.sunElevationDeg}°</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[#16231c]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-400" />
            Spatial GSD:
          </span>
          <span className="text-slate-300">{scene.spatialResolution}</span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-slate-400">Tile Footprint:</span>
          <span className="text-slate-400 font-mono text-[10px] truncate max-w-[160px]">{scene.tileId}</span>
        </div>
      </div>
    </div>
  );
};
