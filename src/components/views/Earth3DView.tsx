import React, { useState, useRef, useEffect } from 'react';
import type { Viewer } from 'cesium';
import { CesiumEarthViewer } from '../earth3d/CesiumEarthViewer';
import { GlobeControlPanel } from '../earth3d/GlobeControlPanel';
import { RegionDetailDrawer } from '../earth3d/RegionDetailDrawer';
import { DemoBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Globe2,
  ArrowLeft,
  Info,
  ShieldAlert,
  AlertTriangle,
  CircleDashed,
  Flame,
  BrainCircuit
} from 'lucide-react';
import { MapLayerFilterPanel } from '../earth3d/MapLayerFilterPanel';
import type { GlobalFilterState } from '../../types/layersAndFilters';
import { DEFAULT_GLOBAL_FILTERS } from '../../types/layersAndFilters';
import { CAMERA_PRESETS } from '../../data/geoJsonData';
import type {
  CameraPreset,
  ForestLossGeoJsonProperties,
  ForestCoverGeoJsonProperties
} from '../../data/geoJsonData';
import { DEMO_VERIFICATION_EVENTS } from '../../data/verificationData';
import { MONITORED_REGIONS } from '../../data/demoData';
import type { VerificationOutcome } from '../../types/verification';
import { fetchMLJobs, fetchMLJobGeoJson } from '../../api/client';

interface Earth3DViewProps {
  onBackToOverview: () => void;
  selectedRegionId?: string;
  filters?: GlobalFilterState;
  onFilterChange?: (updates: Partial<GlobalFilterState>) => void;
  onClearFilters?: () => void;
}

export const Earth3DView: React.FC<Earth3DViewProps> = ({ 
  onBackToOverview,
  selectedRegionId,
  filters: propFilters,
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters
}) => {
  // Local fallback filter state if not provided via props
  const [localFilters, setLocalFilters] = useState<GlobalFilterState>(() => ({
    ...DEFAULT_GLOBAL_FILTERS,
    selectedRegionId: selectedRegionId || 'all'
  }));

  const filters = propFilters || localFilters;
  const handleFilterChange = (updates: Partial<GlobalFilterState>) => {
    if (propOnFilterChange) {
      propOnFilterChange(updates);
    } else {
      setLocalFilters(prev => ({ ...prev, ...updates }));
    }
  };

  const handleClearFilters = () => {
    if (propOnClearFilters) {
      propOnClearFilters();
    } else {
      setLocalFilters({ ...DEFAULT_GLOBAL_FILTERS });
    }
  };

  const handleToggleLayer = (layerKey: keyof GlobalFilterState['layers']) => {
    handleFilterChange({
      layers: {
        ...filters.layers,
        [layerKey]: !filters.layers[layerKey]
      }
    });
  };

  // Active camera preset
  const [activePreset, setActivePreset] = useState<CameraPreset>(() => {
    const targetId = filters.selectedRegionId || selectedRegionId;
    if (targetId && targetId !== 'all') {
      const match = CAMERA_PRESETS.find(p => 
        p.id === targetId || 
        p.id.includes(targetId) || 
        targetId.includes(p.id) ||
        (targetId === 'amazon-br' && p.id === 'amazon-sector4b') ||
        (targetId === 'congo-drc' && p.id === 'congo-basin') ||
        (targetId === 'borneo-id' && p.id === 'borneo-peat')
      );
      if (match) return match;
    }
    return CAMERA_PRESETS[0];
  });
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVerificationCandidates] = useState(true);

  // Picked region state
  const [selectedLossRegion, setSelectedLossRegion] = useState<ForestLossGeoJsonProperties | null>(null);
  const [selectedCoverRegion, setSelectedCoverRegion] = useState<ForestCoverGeoJsonProperties | null>(null);

  // ML real detections GeoJSON for 3D globe overlay
  const [mlGeoJson, setMlGeoJson] = useState<Record<string, any> | null>(null);
  const [showMLDetections, setShowMLDetections] = useState(true);
  const [mlJobCount, setMlJobCount] = useState(0);

  // On mount: load most recent completed ML inference job GeoJSON for globe
  useEffect(() => {
    fetchMLJobs()
      .then(async (jobs) => {
        const completed = jobs.filter(j => j.status === 'completed' && j.detections_count > 0);
        setMlJobCount(completed.length);
        if (completed.length > 0) {
          // Load GeoJSON from the most recent completed job
          const geoJson = await fetchMLJobGeoJson(completed[0].job_id);
          setMlGeoJson(geoJson);
        }
      })
      .catch(() => { /* ML endpoint may not be running */ });
  }, []);

  // Cesium viewer instance reference for direct camera controls
  const viewerInstanceRef = useRef<Viewer | null>(null);

  // Zoom In handler
  const handleZoomIn = () => {
    const viewer = viewerInstanceRef.current;
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.35);
    }
  };

  // Zoom Out handler
  const handleZoomOut = () => {
    const viewer = viewerInstanceRef.current;
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.45);
    }
  };

  // Reset View to India handler
  const handleResetView = () => {
    setActivePreset(CAMERA_PRESETS[0]); // India National Extent
    setSelectedLossRegion(null);
    setSelectedCoverRegion(null);
  };

  // Fly to picked region
  const handleFlyToPickedRegion = () => {
    const viewer = viewerInstanceRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (selectedLossRegion) {
      // Find coordinates from properties or preset
      const matchingPreset = CAMERA_PRESETS.find(p => p.name.toLowerCase().includes(selectedLossRegion.region.toLowerCase()));
      if (matchingPreset) {
        setActivePreset(matchingPreset);
      }
    }
  };

  // Synchronize activePreset whenever selectedRegionId changes from global filters
  const [prevRegionId, setPrevRegionId] = useState(filters.selectedRegionId);
  if (filters.selectedRegionId !== prevRegionId) {
    setPrevRegionId(filters.selectedRegionId);
    const targetId = filters.selectedRegionId;
    if (targetId && targetId !== 'all') {
      const match = CAMERA_PRESETS.find(p => 
        p.id === targetId || 
        p.id.includes(targetId) || 
        targetId.includes(p.id) ||
        (targetId === 'amazon-br' && p.id === 'amazon-sector4b') ||
        (targetId === 'congo-drc' && p.id === 'congo-basin') ||
        (targetId === 'borneo-id' && p.id === 'borneo-peat')
      );
      if (match) {
        setActivePreset(match);
      } else {
        const reg = MONITORED_REGIONS.find(r => r.id === targetId);
        if (reg && reg.coordinates) {
          setActivePreset({
            id: reg.id,
            name: reg.name,
            country: reg.country,
            lat: reg.coordinates.lat,
            lng: reg.coordinates.lng,
            height: 480000,
            pitchDeg: -55,
            headingDeg: 0
          });
        }
      }
    }
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#070b09] p-4 m-0' : ''}`}>
      {/* Top Header */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0e1612] border border-[#1b2820]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe2 size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                  3D Earth Geospatial Globe
                </h2>
                <DemoBadge />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                CesiumJS WebGL Engine • Initial Camera: <strong className="text-emerald-400">India (National Extent)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={onBackToOverview}
            >
              Back to Overview
            </Button>
          </div>
        </div>
      )}

      {/* Main 3D Globe Workspace Container */}
      <div className={`relative card-panel overflow-hidden border border-[#1d2b22] ${
        isFullscreen ? 'h-full w-full' : 'h-[640px] w-full'
      }`}>
        {/* Cesium Viewer Canvas */}
        <CesiumEarthViewer
          showForestCover={filters.layers.forestCover}
          showForestLoss={filters.layers.forestLoss}
          showHotspotPins={filters.layers.hotspotPins}
          showBoundaries={filters.layers.administrativeBoundaries}
          showBaseSatellite={filters.layers.baseSatellite}
          selectedSeverity={filters.selectedSeverity}
          minAreaHa={filters.minAreaHa}
          maxAreaHa={filters.maxAreaHa}
          dateRange={filters.dateRange}
          startDate={filters.startDate}
          endDate={filters.endDate}
          activePreset={activePreset}
          isAutoRotating={isAutoRotating}
          onSelectLossRegion={(props) => setSelectedLossRegion(props)}
          onSelectCoverRegion={(props) => setSelectedCoverRegion(props)}
          onViewerReady={(v) => { viewerInstanceRef.current = v; }}
          mlGeoJson={mlGeoJson}
          showMLDetections={showMLDetections}
        />

        {/* Floating Top Right: Map Controls Panel */}
        <div className="absolute top-4 right-4 z-20">
          <GlobeControlPanel
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onSelectPreset={(p) => setActivePreset(p)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isAutoRotating={isAutoRotating}
            onToggleAutoRotate={() => setIsAutoRotating(!isAutoRotating)}
            activePresetId={activePreset.id}
          />
        </div>

        {/* Floating Bottom Right: Layers & Global Filter HUD Panel */}
        <div className="absolute bottom-6 right-4 z-20">
          <MapLayerFilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onToggleLayer={handleToggleLayer}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Floating Left: Picked Region Details Drawer */}
        <RegionDetailDrawer
          selectedLossRegion={selectedLossRegion}
          selectedCoverRegion={selectedCoverRegion}
          onClose={() => {
            setSelectedLossRegion(null);
            setSelectedCoverRegion(null);
          }}
          onFlyToRegion={handleFlyToPickedRegion}
        />
      </div>

      {/* Guidance & Token Setup Note */}
      {!isFullscreen && (
        <div className="p-3.5 rounded-xl bg-[#0c120f] border border-[#19261f] text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-emerald-400 shrink-0" />
            <span>
              Cesium Ion Satellite &amp; World Terrain Token: <strong className="text-slate-300">VITE_CESIUM_ION_TOKEN</strong> (configured with automatic fallback to Esri World Imagery &amp; OSM)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mlGeoJson && (
              <button
                onClick={() => setShowMLDetections(!showMLDetections)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  showMLDetections
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                    : 'bg-[#121c17] text-slate-400 border-[#203126]'
                }`}
              >
                <BrainCircuit size={12} />
                ML Detections ({mlJobCount} job{mlJobCount !== 1 ? 's' : ''})
              </button>
            )}
            <span className="text-[11px] text-emerald-400 font-semibold shrink-0">
              Click on any highlighted forest loss polygon or pin to inspect anomaly metrics
            </span>
          </div>
        </div>
      )}

      {/* Verification Event Quick-Inspect Panel */}
      {!isFullscreen && showVerificationCandidates && (
        <div className="card-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1c2922] flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={13} className="text-purple-400" />
              Verification Candidates on Globe
            </span>
            <DemoBadge />
          </div>
          <div className="divide-y divide-[#141e19] max-h-56 overflow-y-auto">
            {DEMO_VERIFICATION_EVENTS.map(ev => {
              const outcomeIcon: Record<VerificationOutcome, React.ReactNode> = {
                high_priority_candidate:  <ShieldAlert size={12} className="text-red-400 shrink-0" />,
                needs_verification:       <AlertTriangle size={12} className="text-amber-400 shrink-0" />,
                likely_seasonal:          <CircleDashed size={12} className="text-cyan-400 shrink-0" />,
                fire_related_disturbance: <Flame size={12} className="text-orange-400 shrink-0" />,
                insufficient_evidence:    <Info size={12} className="text-slate-500 shrink-0" />,
              };
              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    const preset = CAMERA_PRESETS.find(p => p.id === ev.regionId);
                    if (preset) setActivePreset(preset);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#111916] transition-colors flex items-center gap-3"
                >
                  {outcomeIcon[ev.outcome]}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-slate-200 truncate">{ev.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{ev.stateUT} · {ev.estimatedAreaHa ? `${ev.estimatedAreaHa} ha` : '—'} · {ev.firstObservationDate}</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 shrink-0">
                    Rule: {Math.round(ev.ruleScore.rulePriorityScore * 100)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
