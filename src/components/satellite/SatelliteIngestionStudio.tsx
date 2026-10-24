import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  X,
  Calendar,
  Cloud,
  ShieldCheck
} from 'lucide-react';
import {
  submitSatelliteIngestion,
  fetchSatelliteJobs,
  fetchSatelliteJobById,
  searchSatelliteScenes,
  fetchSatelliteProviderInfo,
} from '../../api/client';
import type {
  IngestionJobRecord,
  AcquiredSceneDetail,
  SatelliteProviderInfoResponse,
  IngestionJobRequest
} from '../../api/client';
import { Button } from '../common/Button';

interface SatelliteIngestionStudioProps {
  currentRegionId: string;
  onJobCompletedAndSelect: (job: IngestionJobRecord) => void;
  onClose: () => void;
}

export const SatelliteIngestionStudio: React.FC<SatelliteIngestionStudioProps> = ({
  currentRegionId,
  onJobCompletedAndSelect,
  onClose
}) => {
  // Region coordinates defaults
  const regionBboxes: Record<string, [number, number, number, number]> = {
    'western-ghats': [76.45, 11.45, 76.75, 11.75],
    'northeast-india': [93.10, 26.15, 93.40, 26.45],
    'amazon-br': [-54.85, -3.45, -54.55, -3.15],
    'congo-drc': [23.40, -0.65, 23.70, -0.35],
    'borneo-id': [113.80, -2.40, 114.10, -2.10],
  };

  const [regionId, setRegionId] = useState<string>(currentRegionId || 'western-ghats');
  const [bbox, setBbox] = useState<[number, number, number, number]>(
    regionBboxes[currentRegionId] || [76.45, 11.45, 76.75, 11.75]
  );

  // Date ranges
  const [beforeStart, setBeforeStart] = useState('2026-01-01');
  const [beforeEnd, setBeforeEnd] = useState('2026-02-15');
  const [afterStart, setAfterStart] = useState('2026-02-16');
  const [afterEnd, setAfterEnd] = useState('2026-03-31');

  // Constraints
  const [maxCloudCover, setMaxCloudCover] = useState<number>(15.0);
  const [resolution, setResolution] = useState<number>(10.0);
  const selectedBands = ['B02', 'B03', 'B04', 'B08', 'SCL'];

  // Pre-flight scene search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AcquiredSceneDetail[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Ingestion job state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<IngestionJobRecord | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<IngestionJobRecord[]>([]);

  // Provider configuration status
  const [providerInfo, setProviderInfo] = useState<SatelliteProviderInfoResponse | null>(null);

  // Load provider info on mount
  useEffect(() => {
    fetchSatelliteProviderInfo()
      .then(setProviderInfo)
      .catch((err) => console.warn('Could not fetch satellite provider info:', err));

    fetchSatelliteJobs(regionId)
      .then(setRecentJobs)
      .catch((err) => console.warn('Could not fetch past jobs:', err));
  }, [regionId]);

  // Handle region switch
  const handleRegionChange = (newReg: string) => {
    setRegionId(newReg);
    if (regionBboxes[newReg]) {
      setBbox(regionBboxes[newReg]);
    }
    setSearchResults(null);
  };

  // Pre-flight Search
  const handleSearchScenes = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchSatelliteScenes({
        min_lng: bbox[0],
        min_lat: bbox[1],
        max_lng: bbox[2],
        max_lat: bbox[3],
        start_date: beforeStart,
        end_date: afterEnd,
        max_cloud_cover: maxCloudCover,
      });
      setSearchResults(res.scenes);
    } catch (err: any) {
      setSearchError(err?.detail || err?.message || 'Failed to search scenes');
    } finally {
      setIsSearching(false);
    }
  };

  // Submit Ingestion Job
  const handleSubmitJob = async () => {
    setIsSubmitting(true);
    setJobError(null);

    const payload: IngestionJobRequest = {
      regionId,
      bbox,
      beforeDateRange: { startDate: beforeStart, endDate: beforeEnd },
      afterDateRange: { startDate: afterStart, endDate: afterEnd },
      maxCloudCover,
      bands: selectedBands,
      spatialResolution: resolution,
    };

    try {
      const job = await submitSatelliteIngestion(payload);
      setActiveJob(job);
      setRecentJobs(prev => [job, ...prev]);
    } catch (err: any) {
      setJobError(err?.detail || err?.message || 'Failed to submit ingestion job');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll Active Job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const updated = await fetchSatelliteJobById(activeJob.job_id);
        setActiveJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(intervalId);
          // Refresh past jobs
          fetchSatelliteJobs(regionId).then(setRecentJobs).catch(() => {});
        }
      } catch (err) {
        console.warn('Error polling job:', err);
      }
    }, 1200);

    return () => clearInterval(intervalId);
  }, [activeJob, regionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b120e] border border-[#1e2e24] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b2820] flex items-center justify-between bg-[#0e1712]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Satellite size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-sans tracking-tight m-0">
                  Sentinel-2 Real Satellite Ingestion Studio
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40 font-mono">
                  Part 8 Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Copernicus Data Space Ecosystem (CDSE) & AWS STAC Level-2A BOA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#15221a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 font-mono text-xs">
          {/* Provider Status Alert */}
          <div className="p-3.5 rounded-xl bg-[#0e1713] border border-[#1b2a21] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-200 font-bold">Authorized Provider Connection: </span>
                <span className="text-emerald-400">
                  {providerInfo?.documentation?.provider_name || 'Copernicus Data Space Ecosystem / Sentinel-2 L2A'}
                </span>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Auth Mode: <span className="text-slate-300 font-semibold">{providerInfo?.active_configuration?.auth_method || 'CDSE OAuth2 / STAC'}</span> • CC BY 4.0 Open Access
                </div>
              </div>
            </div>
            <div className="text-[10px] px-2.5 py-1 rounded bg-[#132219] text-slate-300 border border-[#203628] self-start sm:self-auto">
              5-Day Constellation Revisit
            </div>
          </div>

          {/* Active Job Progress (If running or just finished) */}
          {activeJob && (
            <div className="p-4 rounded-xl bg-[#091510] border border-cyan-700/50 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeJob.status === 'completed' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : activeJob.status === 'failed' ? (
                    <AlertTriangle size={16} className="text-red-400" />
                  ) : (
                    <RefreshCw size={16} className="text-cyan-400 animate-spin" />
                  )}
                  <span className="font-bold text-slate-200 uppercase tracking-wide">
                    Job {activeJob.job_id} — {activeJob.status}
                  </span>
                </div>
                <span className="text-cyan-400 font-bold">{activeJob.progress_pct}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#132019] h-2 rounded-full overflow-hidden border border-[#1e3328]">
                <div
                  className={`h-full transition-all duration-300 ${
                    activeJob.status === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  }`}
                  style={{ width: `${activeJob.progress_pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{activeJob.current_stage}</span>
                {activeJob.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onJobCompletedAndSelect(activeJob);
                      onClose();
                    }}
                  >
                    View in Comparison Studio →
                  </Button>
                )}
              </div>

              {activeJob.error_detail && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-[11px]">
                  ⚠️ {activeJob.error_detail}
                </div>
              )}
            </div>
          )}

          {/* Ingestion Parameters Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Region & Bounding Box */}
            <div className="p-4 rounded-xl bg-[#0c1410] border border-[#1a2920] space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" />
                1. Region of Interest (ROI)
              </div>
              <div className="space-y-2">
                <label className="text-slate-400 block text-[11px]">Monitored Sector:</label>
                <select
                  value={regionId}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full bg-[#111c16] text-slate-200 border border-[#213529] rounded-lg px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="western-ghats">Western Ghats (Nilgiris-Wayanad, India)</option>
                  <option value="northeast-india">Northeast India (Assam Foothills)</option>
                  <option value="amazon-br">Amazon Basin Sector 4B (Pará, Brazil)</option>
                  <option value="congo-drc">Congo Basin (Salonga, DRC)</option>
                  <option value="borneo-id">Borneo Peat Forest (Kalimantan, Indonesia)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-[11px]">Bounding Box (WGS-84 / EPSG:4326):</label>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 font-mono bg-[#09100c] p-2 rounded border border-[#1b2a21]">
                  <div>Min Lng: <span className="text-emerald-400">{bbox[0]}°</span></div>
                  <div>Min Lat: <span className="text-emerald-400">{bbox[1]}°</span></div>
                  <div>Max Lng: <span className="text-emerald-400">{bbox[2]}°</span></div>
                  <div>Max Lat: <span className="text-emerald-400">{bbox[3]}°</span></div>
                </div>
              </div>
            </div>

            {/* Quality & Processing Parameters */}
            <div className="p-4 rounded-xl bg-[#0c1410] border border-[#1a2920] space-y-3">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Cloud size={14} className="text-emerald-400" />
                2. Quality & Band Constraints
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Max Acceptable Cloud Cover:</span>
                  <span className="font-bold text-emerald-400">{maxCloudCover}%</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="1"
                  value={maxCloudCover}
                  onChange={(e) => setMaxCloudCover(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Atmospheric SCL filtering will mask out clouds and cast shadows automatically.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">Spatial Resolution:</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(parseFloat(e.target.value))}
                    className="w-full bg-[#111c16] text-slate-200 border border-[#213529] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value={10}>10m (Bands 2,3,4,8)</option>
                    <option value={20}>20m (RedEdge / SWIR)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">CRS Projection:</label>
                  <input
                    type="text"
                    disabled
                    value="EPSG:4326 (WGS84)"
                    className="w-full bg-[#08100c] text-slate-400 border border-[#1b2a21] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bi-Temporal Date Range Pickers */}
          <div className="p-4 rounded-xl bg-[#0c1410] border border-[#1a2920] space-y-3">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar size={14} className="text-emerald-400" />
              3. Bi-Temporal Observation Windows (Baseline vs Target)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Period */}
              <div className="p-3 rounded-lg bg-[#0e1913] border border-emerald-800/40 space-y-2">
                <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                  <span>BEFORE (Baseline Period)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Start Date:</label>
                    <input
                      type="date"
                      value={beforeStart}
                      onChange={(e) => setBeforeStart(e.target.value)}
                      className="w-full bg-[#111f17] text-slate-200 border border-[#22392b] rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">End Date:</label>
                    <input
                      type="date"
                      value={beforeEnd}
                      onChange={(e) => setBeforeEnd(e.target.value)}
                      className="w-full bg-[#111f17] text-slate-200 border border-[#22392b] rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Target Comparison Period */}
              <div className="p-3 rounded-lg bg-[#0e1913] border border-cyan-800/40 space-y-2">
                <div className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                  <span>AFTER (Target Period)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Start Date:</label>
                    <input
                      type="date"
                      value={afterStart}
                      onChange={(e) => setAfterStart(e.target.value)}
                      className="w-full bg-[#111f17] text-slate-200 border border-[#22392b] rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">End Date:</label>
                    <input
                      type="date"
                      value={afterEnd}
                      onChange={(e) => setAfterEnd(e.target.value)}
                      className="w-full bg-[#111f17] text-slate-200 border border-[#22392b] rounded px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Pre-flight Inspection */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Search size={14} />}
                isLoading={isSearching}
                onClick={handleSearchScenes}
              >
                Pre-Flight Scene Search
              </Button>
              {searchResults && (
                <span className="text-[11px] text-emerald-400 font-mono">
                  ✓ {searchResults.length} candidate scenes available
                </span>
              )}
              {searchError && (
                <span className="text-[11px] text-orange-400 font-mono max-w-xs truncate">
                  ⚠️ {searchError}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {jobError && (
                <span className="text-[11px] text-red-400 font-mono max-w-xs truncate">
                  {jobError}
                </span>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={14} />}
                isLoading={isSubmitting}
                onClick={handleSubmitJob}
              >
                Launch Satellite Ingestion
              </Button>
            </div>
          </div>

          {/* Search Results Preview Table (if requested) */}
          {searchResults && searchResults.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#09110d] border border-[#1b2b21] space-y-2">
              <div className="text-slate-300 font-bold text-[11px]">
                Available Sentinel-2 Level-2A Passes ({searchResults.length}):
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 text-[11px]">
                {searchResults.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-[#0d1712] border border-[#18261e]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">{sc.platform}</span>
                      <span className="text-slate-300">{sc.sensing_time.slice(0, 10)}</span>
                      <span className="text-slate-500 text-[10px]">Tile: {sc.tile_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Cloud: {sc.cloud_cover_pct}%</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                        {sc.provider}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Ingestion Jobs List */}
          {recentJobs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#09110d] border border-[#1b2b21] space-y-2">
              <div className="text-slate-300 font-bold text-[11px] flex items-center justify-between">
                <span>Recent Satellite Ingestion Jobs</span>
                <span className="text-[10px] text-slate-500 font-mono">Persisted on Backend</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                {recentJobs.map((j) => (
                  <div
                    key={j.job_id}
                    className="flex items-center justify-between p-2.5 rounded bg-[#0d1712] border border-[#1a2920] hover:border-emerald-700/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{j.job_id}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            j.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                              : j.status === 'failed'
                              ? 'bg-red-950 text-red-300 border border-red-600/50'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-600/50'
                          }`}
                        >
                          {j.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Sector: {j.region_id} • Created: {j.created_at.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {j.status === 'completed' && (
                        <button
                          onClick={() => {
                            onJobCompletedAndSelect(j);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-[#132219] hover:bg-[#1a3023] border border-emerald-600/40 text-emerald-300 text-[11px] transition-colors"
                        >
                          Load Scenes →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
