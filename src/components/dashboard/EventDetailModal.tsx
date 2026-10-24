import React from 'react';
import type { ForestLossEvent } from '../../types/monitoring';
import { Modal } from '../common/Modal';
import { SeverityBadge, StatusBadge, DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Layers, 
  CheckCircle, 
  FileDown
} from 'lucide-react';

interface EventDetailModalProps {
  event: ForestLossEvent | null;
  onClose: () => void;
  onStatusUpdate?: (eventId: string, newStatus: ForestLossEvent['status']) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onStatusUpdate
}) => {
  if (!event) return null;

  return (
    <Modal
      isOpen={!!event}
      onClose={onClose}
      title={`Anomaly Dossier: ${event.id}`}
      subtitle={`${event.regionName} • Detected on ${event.detectedDate}`}
      maxWidth="4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <span className="text-xs font-mono text-slate-500">
              Bi-Temporal Sentinel-2 L2A Verification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<FileDown size={14} />}
              onClick={() => {
                alert(`Exporting GeoJSON vector for ${event.id}`);
              }}
            >
              Export GeoJSON
            </Button>
            {event.status !== 'confirmed' && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle size={14} />}
                onClick={() => {
                  if (onStatusUpdate) onStatusUpdate(event.id, 'confirmed');
                  onClose();
                }}
              >
                Confirm Anomaly
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#0d1410] border border-[#1b2820]">
            <p className="text-[11px] font-mono uppercase text-slate-500">Loss Extent</p>
            <p className="text-xl font-bold font-mono text-red-400 mt-0.5">
              {event.areaHectares} ha
            </p>
            <p className="text-[10px] text-slate-400 font-mono">{(event.areaHectares * 2.471).toFixed(1)} acres</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1410] border border-[#1b2820]">
            <p className="text-[11px] font-mono uppercase text-slate-500">NDVI Variance</p>
            <p className="text-xl font-bold font-mono text-orange-400 mt-0.5">
              {event.ndviDrop}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">Vegetation loss delta</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1410] border border-[#1b2820]">
            <p className="text-[11px] font-mono uppercase text-slate-500">AI Confidence</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {(event.confidenceScore * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-slate-400 font-mono">BiTemp UNet v4.2</p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d1410] border border-[#1b2820]">
            <p className="text-[11px] font-mono uppercase text-slate-500">Severity & Status</p>
            <div className="mt-1 flex flex-col gap-1 items-start">
              <SeverityBadge severity={event.severity} />
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>

        {/* Bi-Temporal Spectral Comparison Preview Mockup */}
        <div className="card-panel-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-2">
              <Layers size={14} className="text-emerald-400" />
              Bi-Temporal Spectral Comparison (T1 Baseline vs T2 Detected)
            </h5>
            <span className="text-[10px] font-mono text-slate-500">
              Sensor: {event.sensorSource}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* T1 Baseline */}
            <div className="relative rounded-lg overflow-hidden border border-[#213027] bg-[#080d0a] h-44 flex flex-col justify-between p-3">
              <div className="flex items-center justify-between z-10">
                <span className="text-[11px] font-mono bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  T1: Baseline Canopy (30 days prior)
                </span>
                <span className="text-[10px] font-mono text-slate-400">NDVI: +0.78</span>
              </div>
              
              {/* Healthy forest representation */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-[#06241a] to-[#041a13] opacity-80" />
              <div className="absolute inset-0 map-grid-pattern opacity-30" />

              <div className="z-10 text-[10px] font-mono text-slate-400 bg-black/60 p-1.5 rounded border border-white/5 backdrop-blur-sm">
                Continuous dense canopy cover. No road or clear-cut signatures observed.
              </div>
            </div>

            {/* T2 Loss Detected */}
            <div className="relative rounded-lg overflow-hidden border border-[#213027] bg-[#080d0a] h-44 flex flex-col justify-between p-3">
              <div className="flex items-center justify-between z-10">
                <span className="text-[11px] font-mono bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800/60 font-semibold">
                  T2: Loss Confirmed ({event.detectedDate})
                </span>
                <span className="text-[10px] font-mono text-red-400">NDVI: {(0.78 + event.ndviDrop).toFixed(2)}</span>
              </div>

              {/* Disturbed forest canopy representation with loss scar */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#180a0a] via-[#1a1208] to-[#091510] opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-16 rounded-lg border-2 border-dashed border-red-500/80 bg-red-500/20 rotate-12 flex items-center justify-center text-red-400 text-[10px] font-mono font-bold">
                  {event.areaHectares} ha SCAR
                </div>
              </div>

              <div className="z-10 text-[10px] font-mono text-red-300 bg-black/60 p-1.5 rounded border border-white/5 backdrop-blur-sm">
                {event.primaryDriver}: Significant spectral reflectance shift in NIR & SWIR bands.
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Telemetry & Inspector Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-2.5 p-3.5 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
            <h6 className="text-slate-300 font-semibold uppercase text-[11px] text-emerald-400">
              Geospatial Telemetry
            </h6>
            <div className="flex justify-between py-1 border-b border-[#18231c]">
              <span className="text-slate-500">Centroid Lat / Lng:</span>
              <span className="text-slate-200">{event.coordinates.lat.toFixed(5)}°, {event.coordinates.lng.toFixed(5)}°</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#18231c]">
              <span className="text-slate-500">Tile Coordinates:</span>
              <span className="text-slate-200">{event.tileCoordinates || 'Tile 21LTL / R067'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#18231c]">
              <span className="text-slate-500">Cloud Coverage:</span>
              <span className="text-slate-200">{event.cloudCoveragePct || 4.2}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Primary Driver:</span>
              <span className="text-amber-400 font-bold">{event.primaryDriver}</span>
            </div>
          </div>

          <div className="space-y-2.5 p-3.5 rounded-lg bg-[#0e1612] border border-[#1d2b22]">
            <h6 className="text-slate-300 font-semibold uppercase text-[11px] text-emerald-400">
              Analyst Verification Notes
            </h6>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              {event.inspectorNotes || 'No specific field verification notes attached for this detection cluster.'}
            </p>
            <div className="pt-2 text-[10px] text-slate-500">
              Verified by Copernicus Rapid Anomaly Classifier v4.2 under spatial reference WGS-84 / UTM 21S.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
