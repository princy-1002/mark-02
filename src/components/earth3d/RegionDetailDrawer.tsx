import React from 'react';
import { 
  X, 
  FileDown, 
  Compass
} from 'lucide-react';
import { SeverityBadge, DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import type { ForestLossGeoJsonProperties, ForestCoverGeoJsonProperties } from '../../data/geoJsonData';

interface RegionDetailDrawerProps {
  selectedLossRegion: ForestLossGeoJsonProperties | null;
  selectedCoverRegion: ForestCoverGeoJsonProperties | null;
  onClose: () => void;
  onFlyToRegion?: () => void;
}

export const RegionDetailDrawer: React.FC<RegionDetailDrawerProps> = ({
  selectedLossRegion,
  selectedCoverRegion,
  onClose,
  onFlyToRegion
}) => {
  if (!selectedLossRegion && !selectedCoverRegion) return null;

  return (
    <div className="absolute top-4 left-4 z-30 w-80 sm:w-96 bg-[#0a100d]/95 backdrop-blur-md border border-[#213328] rounded-xl shadow-2xl shadow-black/90 p-4 font-mono text-xs text-slate-200 select-none animate-in fade-in slide-in-from-left-4 duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 mb-3 border-b border-[#1b2b21]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400">
              {selectedLossRegion ? 'Detected Loss Hotspot' : 'Forest Canopy Extent'}
            </span>
            <DemoBadge />
          </div>
          <h4 className="text-sm font-bold text-slate-100 font-sans leading-tight">
            {selectedLossRegion?.name || selectedCoverRegion?.name}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {selectedLossRegion?.region || selectedCoverRegion?.biome}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#15221a] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Forest Loss Anomaly View */}
      {selectedLossRegion && (
        <div className="space-y-3.5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#0e1612] border border-[#1b2920]">
              <span className="text-[10px] uppercase text-slate-400">Loss Area</span>
              <div className="text-base font-bold text-red-400 mt-0.5">
                {selectedLossRegion.areaHectares} ha
              </div>
              <span className="text-[10px] text-slate-400">
                {(selectedLossRegion.areaHectares * 2.471).toFixed(1)} acres
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0e1612] border border-[#1b2920]">
              <span className="text-[10px] uppercase text-slate-400">Severity</span>
              <div className="mt-1">
                <SeverityBadge severity={selectedLossRegion.severity} />
              </div>
            </div>
          </div>

          {/* Telemetry Breakdown */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#0d1410] border border-[#1a271f] text-[11px]">
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">Detection Period:</span>
              <span className="text-slate-200 font-medium">{selectedLossRegion.detectionPeriod}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">AI Confidence:</span>
              <span className="text-emerald-400 font-bold">{(selectedLossRegion.confidenceScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">Sensor Platform:</span>
              <span className="text-slate-300">{selectedLossRegion.sensor}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">NDVI Variance:</span>
              <span className="text-orange-400 font-bold">{selectedLossRegion.ndviDrop} drop</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">Canopy Shift:</span>
              <span className="text-slate-200">
                {selectedLossRegion.canopyDensityBeforePct}% → {selectedLossRegion.canopyDensityAfterPct}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Coordinates:</span>
              <span className="text-slate-300">{selectedLossRegion.coordinatesSummary}</span>
            </div>
          </div>

          {/* Primary Driver */}
          <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40">
            <span className="text-[10px] uppercase text-red-400 font-bold">
              Identified Disturbance Driver
            </span>
            <p className="text-xs text-red-200 font-sans mt-0.5">
              {selectedLossRegion.primaryDriver}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {onFlyToRegion && (
              <Button
                variant="primary"
                size="sm"
                icon={<Compass size={13} />}
                className="flex-1"
                onClick={onFlyToRegion}
              >
                Focus Camera
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<FileDown size={13} />}
              onClick={() => alert(`Exported GeoJSON for ${selectedLossRegion.id}`)}
            >
              GeoJSON
            </Button>
          </div>
        </div>
      )}

      {/* Forest Cover Region View */}
      {selectedCoverRegion && !selectedLossRegion && (
        <div className="space-y-3.5">
          <div className="p-3 rounded-lg bg-[#0e1612] border border-[#1b2920] space-y-2 text-[11px]">
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">Biome Class:</span>
              <span className="text-emerald-400">{selectedCoverRegion.biome}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#152119]">
              <span className="text-slate-400">Total Canopy:</span>
              <span className="text-slate-200 font-bold">{selectedCoverRegion.areaKm2.toLocaleString()} km²</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Conservation Status:</span>
              <span className="text-slate-300">{selectedCoverRegion.protectionStatus}</span>
            </div>
          </div>

          {onFlyToRegion && (
            <Button
              variant="primary"
              size="sm"
              icon={<Compass size={13} />}
              className="w-full"
              onClick={onFlyToRegion}
            >
              Focus on Canopy Extent
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
