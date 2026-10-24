import React, { useState, useMemo } from 'react';
import type { DetectionPolygonResult, DetectionFilterState, ChangeClassification, SeverityLevel } from '../../types/monitoring';
import { DetectionService } from '../../services/detectionService';
import { DetectionMapView } from '../detection/DetectionMapView';
import { SeverityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Flame,
  ArrowLeft,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  X,
  BarChart2,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Info,
  ZapOff,
  TrendingDown,
  BrainCircuit
} from 'lucide-react';
import { DemoBadge } from '../common/Badge';
import { MLInferenceStudio } from '../ml/MLInferenceStudio';

import type { GlobalFilterState } from '../../types/layersAndFilters';

interface ForestLossDetectionViewProps {
  onBackToOverview: () => void;
  filters?: GlobalFilterState;
  onFilterChange?: (updates: Partial<GlobalFilterState>) => void;
  onClearFilters?: () => void;
}

const REGION_OPTIONS = [
  { value: 'all', label: 'All Monitored Regions' },
  { value: 'western-ghats', label: 'Western Ghats (India)' },
  { value: 'northeast-india', label: 'Northeast India (Assam)' },
  { value: 'amazon-br', label: 'Amazon Basin (Pará)' },
  { value: 'sundarbans', label: 'Sundarbans (West Bengal)' },
  { value: 'central-highlands', label: 'Central India Highlands' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'all', label: 'All Classifications' },
  { value: 'confirmed_deforestation', label: 'Confirmed Deforestation' },
  { value: 'observed_anomaly', label: 'Observed Anomaly' },
  { value: 'phenological_variation', label: 'Phenological Variation' },
  { value: 'temporary_disturbance', label: 'Temporary Disturbance' },
];

const classificationLabel: Record<ChangeClassification, string> = {
  confirmed_deforestation: 'Confirmed Deforestation',
  observed_anomaly: 'Observed Anomaly',
  phenological_variation: 'Phenological Variation',
  temporary_disturbance: 'Temporary Disturbance',
  cloud_shadow_artifact: 'Cloud / Shadow Artifact',
};

const classificationIcon: Record<ChangeClassification, React.ReactNode> = {
  confirmed_deforestation: <ShieldAlert size={13} className="text-red-400" />,
  observed_anomaly: <AlertTriangle size={13} className="text-amber-400" />,
  phenological_variation: <CircleDashed size={13} className="text-cyan-400" />,
  temporary_disturbance: <ZapOff size={13} className="text-yellow-400" />,
  cloud_shadow_artifact: <Layers size={13} className="text-slate-400" />,
};

export const ForestLossDetectionView: React.FC<ForestLossDetectionViewProps> = ({
  onBackToOverview,
  filters: propFilters,
  onFilterChange: propOnFilterChange,
  onClearFilters: propOnClearFilters
}) => {
  const [localFilters, setLocalFilters] = useState<DetectionFilterState>({
    regionId: propFilters?.selectedRegionId || 'all',
    period: (propFilters?.dateRange as any) || 'all',
    severity: (propFilters?.selectedSeverity as any) || 'all',
    classification: 'all',
    minConfidence: 0,
    searchQuery: propFilters?.searchQuery || '',
  });

  const filters: DetectionFilterState = useMemo(() => {
    return {
      regionId: propFilters?.selectedRegionId || localFilters.regionId,
      period: (propFilters?.dateRange as any) || localFilters.period,
      severity: (propFilters?.selectedSeverity as any) || localFilters.severity,
      classification: localFilters.classification,
      minConfidence: localFilters.minConfidence,
      searchQuery: propFilters?.searchQuery !== undefined ? propFilters.searchQuery : localFilters.searchQuery,
    };
  }, [propFilters, localFilters]);

  const [selectedDetection, setSelectedDetection] = useState<DetectionPolygonResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMLStudio, setShowMLStudio] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // Sync any real published detections from backend on mount
  React.useEffect(() => {
    DetectionService.syncFromBackend().then(() => setRefreshCount(c => c + 1));
  }, []);

  const detections = useMemo(() => DetectionService.getDetections(filters), [filters, refreshCount]);
  const summary = useMemo(() => DetectionService.getSummaryMetrics(detections), [detections]);

  const currentRegionLabel = REGION_OPTIONS.find(r => r.value === filters.regionId)?.label ?? 'All Regions';

  const updateFilter = (partial: Partial<DetectionFilterState>) => {
    setLocalFilters(prev => ({ ...prev, ...partial }));
    setSelectedDetection(null);
    if (propOnFilterChange) {
      const updates: Partial<GlobalFilterState> = {};
      if (partial.regionId !== undefined) updates.selectedRegionId = partial.regionId;
      if (partial.period !== undefined && partial.period !== 'all') updates.dateRange = partial.period as any;
      if (partial.severity !== undefined) updates.selectedSeverity = partial.severity;
      if (partial.searchQuery !== undefined) updates.searchQuery = partial.searchQuery;
      propOnFilterChange(updates);
    }
  };

  const handleResetFilters = () => {
    setLocalFilters({
      regionId: 'all',
      period: 'all',
      severity: 'all',
      classification: 'all',
      minConfidence: 0,
      searchQuery: '',
    });
    setSelectedDetection(null);
    if (propOnClearFilters) {
      propOnClearFilters();
    }
  };

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0e1612] border border-[#1b2820]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-700/40 flex items-center justify-center text-orange-400 shrink-0">
            <Flame size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-sans tracking-tight m-0">
                Forest Loss Detection Engine
              </h2>
              <DemoBadge />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              AI Bi-Temporal Semantic Segmentation · {detections.length} Detected Polygon{detections.length !== 1 ? 's' : ''} · {currentRegionLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMLStudio(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/90 shadow-sm"
          >
            <BrainCircuit size={14} className="text-emerald-400 animate-pulse" />
            ML Inference Studio
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              showFilters
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                : 'bg-[#121c17] text-slate-300 border-[#203126] hover:border-emerald-700/40 hover:text-emerald-300'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBackToOverview}>
            Back
          </Button>
        </div>
      </div>

      {/* ML Inference Studio Modal */}
      {showMLStudio && (
        <MLInferenceStudio
          currentRegionId={filters.regionId}
          onClose={() => setShowMLStudio(false)}
          onDetectionsPublished={() => {
            DetectionService.syncFromBackend().then(() => setRefreshCount(c => c + 1));
          }}
        />
      )}

      {/* Expandable Filter Bar */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-[#0c120f] border border-[#19261f] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search ID, name, driver..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter({ searchQuery: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 bg-[#111915] text-slate-200 border border-[#203126] rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-700/50 placeholder:text-slate-600"
              />
            </div>

            {/* Region */}
            <select
              value={filters.regionId}
              onChange={(e) => updateFilter({ regionId: e.target.value })}
              className="bg-[#111915] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
            >
              {REGION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Severity */}
            <select
              value={filters.severity}
              onChange={(e) => updateFilter({ severity: e.target.value as SeverityLevel | 'all' })}
              className="bg-[#111915] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
            >
              {SEVERITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Classification */}
            <select
              value={filters.classification}
              onChange={(e) => updateFilter({ classification: e.target.value as ChangeClassification | 'all' })}
              className="bg-[#111915] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer"
            >
              {CLASSIFICATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Confidence Threshold */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 shrink-0">Min Confidence:</span>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={filters.minConfidence}
              onChange={(e) => updateFilter({ minConfidence: Number(e.target.value) })}
              className="flex-1 accent-emerald-500 h-1.5"
            />
            <span className="text-xs font-mono text-emerald-400 font-semibold w-12 text-right">
              ≥{filters.minConfidence}%
            </span>
            {(filters.minConfidence > 0 || !!filters.searchQuery || filters.regionId !== 'all' || filters.severity !== 'all' || filters.classification !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 border border-[#203126] rounded px-2 py-1 hover:border-slate-500 transition-colors shrink-0"
              >
                <X size={11} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Polygons', value: String(summary.totalPolygons), color: 'text-slate-200', icon: <Layers size={14} className="text-slate-400" /> },
          { label: 'Total Area', value: `${summary.totalAreaHectares} ha`, color: 'text-red-400', icon: <TrendingDown size={14} className="text-red-400" /> },
          { label: 'Confirmed Defores.', value: String(summary.confirmedDeforestationCount), color: 'text-red-400', icon: <ShieldAlert size={14} className="text-red-400" /> },
          { label: 'Observed Anomalies', value: String(summary.observedAnomalyCount), color: 'text-amber-400', icon: <AlertTriangle size={14} className="text-amber-400" /> },
          { label: 'Phenology Discarded', value: String(summary.phenologyDiscardedCount), color: 'text-cyan-400', icon: <CircleDashed size={14} className="text-cyan-400" /> },
          { label: 'Avg Confidence', value: `${summary.averageConfidencePct}%`, color: 'text-emerald-400', icon: <BarChart2 size={14} className="text-emerald-400" /> },
        ].map((tile) => (
          <div key={tile.label} className="card-panel p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              {tile.icon}
              {tile.label}
            </div>
            <div className={`text-xl font-bold ${tile.color} font-mono leading-tight`}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Classification Distinction Notice */}
      <div className="p-3.5 rounded-xl bg-[#0c120f] border border-[#19261f] flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-blue-400 shrink-0">
          <Info size={14} />
          <span className="font-semibold uppercase tracking-wider">Classification Methodology</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> <strong className="text-slate-300">Confirmed Deforestation</strong>: Ground-verified permanent canopy removal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> <strong className="text-slate-300">Observed Anomaly</strong>: Significant spectral change, pending ground verification</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-cyan-400 border border-dashed border-cyan-300 inline-block" /> <strong className="text-slate-300">Phenological Variation</strong>: Natural seasonal change — NOT deforestation</span>
        </div>
      </div>

      {/* Main Area: Detection Map + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Detection Map */}
        <div>
          {detections.length > 0 ? (
            <DetectionMapView
              detections={detections}
              selectedDetection={selectedDetection}
              onSelectDetection={setSelectedDetection}
              regionName={currentRegionLabel}
            />
          ) : (
            <div className="card-panel h-[560px] flex items-center justify-center flex-col gap-4 text-center">
              <Filter size={32} className="text-slate-600" />
              <div>
                <p className="text-slate-300 font-semibold">No detections match your filters</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">Adjust region, severity, or classification filters to view polygons</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => updateFilter({ regionId: 'all', period: 'all', severity: 'all', classification: 'all', minConfidence: 0, searchQuery: '' })}>
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel: Detection List + Detail */}
        <div className="space-y-3">
          {/* Scrollable Detection List */}
          <div className="card-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1c2922] flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-emerald-400" />
                Detection Index
              </span>
              <span className="text-[11px] font-mono text-slate-500">{detections.length} result{detections.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="divide-y divide-[#141e19] max-h-[300px] overflow-y-auto">
              {detections.map((det) => {
                const isSelected = selectedDetection?.id === det.id;
                return (
                  <button
                    key={det.id}
                    onClick={() => setSelectedDetection(isSelected ? null : det)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500'
                        : 'hover:bg-[#111916] border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {classificationIcon[det.classification]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-100 truncate">{det.id}</span>
                        <SeverityBadge severity={det.severity} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{det.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                        <span>{det.areaHectares} ha</span>
                        <span>·</span>
                        <span>{(det.confidenceScore * 100).toFixed(0)}% conf</span>
                        <span>·</span>
                        <span className="truncate">{det.detectedDate}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {detections.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No detections. Adjust filters.
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel for Selected Detection */}
          {selectedDetection ? (
            <div className="card-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1c2922] flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                  Anomaly Detail
                </span>
                <button
                  onClick={() => setSelectedDetection(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs font-mono">
                {/* ID & Classification */}
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-100 font-sans">{selectedDetection.id}</span>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={selectedDetection.severity} />
                      {selectedDetection.isGroundVerified ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 text-[10px]">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40 text-[10px]">
                          <AlertTriangle size={10} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px] leading-relaxed font-sans">{selectedDetection.name}</p>
                </div>

                {/* Classification Callout */}
                <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  selectedDetection.classification === 'confirmed_deforestation'
                    ? 'bg-red-950/30 border-red-800/40 text-red-300'
                    : selectedDetection.classification === 'observed_anomaly'
                    ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                    : 'bg-cyan-950/30 border-cyan-800/40 text-cyan-300'
                }`}>
                  {classificationIcon[selectedDetection.classification]}
                  <span className="font-semibold">{classificationLabel[selectedDetection.classification]}</span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Affected Area', value: `${selectedDetection.areaHectares} ha` },
                    { label: 'Canopy Loss', value: `${selectedDetection.canopyLossPct}%` },
                    { label: 'Confidence', value: `${(selectedDetection.confidenceScore * 100).toFixed(0)}%` },
                    { label: 'NDVI Δ', value: selectedDetection.ndviDelta.toFixed(2) },
                    { label: 'Baseline Date', value: selectedDetection.baselineDate },
                    { label: 'Detected Date', value: selectedDetection.detectedDate },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0d1410] border border-[#1a2420] rounded-lg p-2">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                      <div className="text-slate-100 font-semibold text-[12px]">{value}</div>
                    </div>
                  ))}
                </div>

                {/* NDVI Spectral Delta Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>NDVI Before</span>
                    <span>NDVI After</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-[#0d1410] border border-[#1a2420]">
                    <div
                      style={{ width: `${(selectedDetection.ndviBefore) * 100}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-[#0d1410] border border-[#1a2420] mt-1">
                    <div
                      style={{ width: `${(selectedDetection.ndviAfter) * 100}%` }}
                      className="h-full bg-red-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Sensor & Region */}
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-[11px]">
                    <Calendar size={12} className="text-slate-500 mt-0.5 shrink-0" />
                    <span className="text-slate-400"><span className="text-slate-300">Sensor:</span> {selectedDetection.sensor}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <MapPin size={12} className="text-slate-500 mt-0.5 shrink-0" />
                    <span className="text-slate-400"><span className="text-slate-300">Region:</span> {selectedDetection.regionName}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Flame size={12} className="text-orange-400 mt-0.5 shrink-0" />
                    <span className="text-slate-400"><span className="text-slate-300">Primary Driver:</span> {selectedDetection.primaryDriver}</span>
                  </div>
                </div>

                {/* Evidence Summary */}
                <div className="p-3 rounded-lg bg-[#0c100e] border border-[#18231e] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Spectral Evidence</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{selectedDetection.evidenceSummary}</p>
                </div>

                {/* Field Verification */}
                {selectedDetection.fieldVerificationNotes && (
                  <div className="p-3 rounded-lg bg-[#0c100e] border border-[#18231e] space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Field Verification</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{selectedDetection.fieldVerificationNotes}</p>
                  </div>
                )}

                {/* Spectral Band Measurements */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-2">Band Reflectance Comparison</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    {['Red (B4)', 'NIR (B8)', 'SWIR (B11)'].map((band, i) => {
                      const keys = ['bandRed', 'bandNir', 'bandSwir'] as const;
                      const beforeVal = selectedDetection.spectralEvidence[`${keys[i]}Before` as keyof typeof selectedDetection.spectralEvidence];
                      const afterVal = selectedDetection.spectralEvidence[`${keys[i]}After` as keyof typeof selectedDetection.spectralEvidence];
                      const delta = (afterVal - beforeVal).toFixed(2);
                      const isIncrease = afterVal > beforeVal;
                      return (
                        <div key={band} className="bg-[#0d1410] border border-[#1a2420] rounded p-2 text-center space-y-1">
                          <div className="text-slate-500 font-semibold">{band}</div>
                          <div className="text-emerald-400">{beforeVal.toFixed(2)}</div>
                          <div className="text-red-400">{afterVal.toFixed(2)}</div>
                          <div className={isIncrease ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {isIncrease ? '+' : ''}{delta}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-around text-[10px] text-slate-600 mt-1 font-sans">
                    <span>Band</span><span className="text-emerald-400">Before</span><span className="text-red-400">After</span><span>Δ</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-panel p-5 text-center flex flex-col items-center gap-3">
              <CheckCircle2 size={22} className="text-slate-600" />
              <p className="text-xs text-slate-500 font-mono">
                Click any polygon on the map or a detection in the list to inspect full spectral evidence
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
