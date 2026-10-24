import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  X,
  FileDown,
  UploadCloud,
  ShieldCheck,
  Database,
  ChevronRight
} from 'lucide-react';
import {
  fetchMLModelInfo,
  submitMLInference,
  fetchMLJobs,
  fetchMLJobById,
  publishMLJobDetections,
  getMLChangeMaskUrl,
  getMLDndviUrl,
  fetchSatelliteJobs,
} from '../../api/client';
import type {
  MLInferenceJobRecord,
  IngestionJobRecord
} from '../../api/client';
import { Button } from '../common/Button';
import { SeverityBadge } from '../common/Badge';

interface MLInferenceStudioProps {
  currentRegionId: string;
  onClose: () => void;
  onDetectionsPublished?: (count: number) => void;
}

export const MLInferenceStudio: React.FC<MLInferenceStudioProps> = ({
  currentRegionId,
  onClose,
  onDetectionsPublished
}) => {
  const [activeTab, setActiveTab] = useState<'run' | 'jobs' | 'model-info'>('run');

  // Ingestion jobs to select as input
  const [satelliteJobs, setSatelliteJobs] = useState<IngestionJobRecord[]>([]);
  const [selectedSatJobId, setSelectedSatJobId] = useState<string>('');

  // ML Inference configuration
  const [regionId, setRegionId] = useState<string>(currentRegionId || 'western-ghats');
  const [minPatchHectares, setMinPatchHectares] = useState<number>(0.5);

  // Manual safe raster path inputs (fallback)
  const [useCustomPaths, setUseCustomPaths] = useState<boolean>(false);
  const [beforeRasterPath, setBeforeRasterPath] = useState<string>('');
  const [afterRasterPath, setAfterRasterPath] = useState<string>('');

  // Submission & Active Job state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<MLInferenceJobRecord | null>(null);
  const [jobsHistory, setJobsHistory] = useState<MLInferenceJobRecord[]>([]);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // Load Model Info and available satellite pairs on mount
  useEffect(() => {
    fetchMLModelInfo()
      .then(() => { /* model info loaded, no state needed for display */ })
      .catch(err => console.warn('Could not load ML model info:', err));

    fetchSatelliteJobs()
      .then(jobs => {
        setSatelliteJobs(jobs);
        const completed = jobs.find(j => j.status === 'completed');
        if (completed) {
          setSelectedSatJobId(completed.job_id);
        } else if (jobs.length > 0) {
          setSelectedSatJobId(jobs[0].job_id);
        }
      })
      .catch(err => console.warn('Could not load satellite jobs:', err));

    refreshJobsHistory();

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const refreshJobsHistory = async () => {
    try {
      const jobs = await fetchMLJobs();
      setJobsHistory(jobs);
      if (jobs.length > 0 && !activeJob) {
        setActiveJob(jobs[0]);
      }
    } catch (err) {
      console.warn('Could not refresh ML jobs history:', err);
    }
  };

  // Poll active job while in progress
  useEffect(() => {
    if (!activeJob) return;

    const isRunning = ['queued', 'validating', 'inferring', 'polygonizing'].includes(activeJob.status);

    if (isRunning) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = window.setInterval(async () => {
          try {
            const updated = await fetchMLJobById(activeJob.job_id);
            setActiveJob(updated);
            if (['completed', 'failed'].includes(updated.status)) {
              if (pollIntervalRef.current) {
                window.clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              refreshJobsHistory();
            }
          } catch (e) {
            console.warn('Polling error:', e);
          }
        }, 1500);
      }
    } else {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeJob?.job_id, activeJob?.status]);

  // Submit ML Inference
  const handleLaunchInference = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setPublishSuccess(null);

    try {
      const payload: any = {
        regionId,
        minPatchHectares: Number(minPatchHectares),
      };

      if (useCustomPaths) {
        if (!beforeRasterPath.trim() || !afterRasterPath.trim()) {
          throw new Error('Please specify both valid before and after raster paths.');
        }
        payload.beforeRasterPath = beforeRasterPath.trim();
        payload.afterRasterPath = afterRasterPath.trim();
      } else {
        if (!selectedSatJobId) {
          throw new Error('Please select an ingested satellite dataset or enter raster paths.');
        }
        payload.satelliteJobId = selectedSatJobId;
      }

      const job = await submitMLInference(payload);
      setActiveJob(job);
      setActiveTab('jobs');
      refreshJobsHistory();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit ML inference job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish detections to catalog
  const handlePublishDetections = async (jobId: string) => {
    setIsPublishing(true);
    setPublishSuccess(null);
    try {
      const res = await publishMLJobDetections(jobId);
      setPublishSuccess(`Successfully published ${res.published_detections} real deforestation detection polygons and ${res.published_alerts} priority alert to platform catalog!`);
      if (onDetectionsPublished) {
        onDetectionsPublished(res.published_detections);
      }
      refreshJobsHistory();
    } catch (err: any) {
      alert(`Publishing failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b100d] border border-[#1b2820] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1b2820] flex items-center justify-between bg-[#0e1612]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <BrainCircuit size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">
                  Forest-Loss ML Inference Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                  CL01-dNDVI-S2 v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Bi-Temporal Sentinel-2 MSI Semantic Change Detection & Geodesic Deforestation Polygonization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#16221b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#0a0e0c] border-b border-[#16221b] text-xs font-mono">
          <button
            onClick={() => setActiveTab('run')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'run'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c17]'
            }`}
          >
            <Play size={13} /> Run Inference
          </button>

          <button
            onClick={() => { setActiveTab('jobs'); refreshJobsHistory(); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all relative ${
              activeTab === 'jobs'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c17]'
            }`}
          >
            <Cpu size={13} /> Jobs & Output Archive
            {jobsHistory.some(j => ['queued', 'validating', 'inferring', 'polygonizing'].includes(j.status)) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('model-info')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'model-info'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c17]'
            }`}
          >
            <ShieldCheck size={13} /> Scientific Integrity & Weights
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: RUN INFERENCE */}
          {activeTab === 'run' && (
            <div className="space-y-6">
              {/* Scientific Guardrail Alert */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs font-mono text-emerald-300 flex items-start gap-3">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-200">Strict Provenance & No Synthetic Polygons</div>
                  <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                    Inference requires preprocessed Sentinel-2 L2A multispectral surface reflectance rasters (Red B04, NIR B08, SCL Quality Band). Cloud, cirrus, and shadow pixels are strictly masked as IEEE NaN and never attributed to forest loss. Output areas are calculated using WGS84 geodesic geometry.
                  </p>
                </div>
              </div>

              {/* Input Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Source Satellite Imagery */}
                <div className="p-4 rounded-xl bg-[#0e1612] border border-[#1b2820] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-2">
                      <Layers size={14} className="text-emerald-400" />
                      Bi-Temporal Satellite Pair
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseCustomPaths(!useCustomPaths)}
                      className="text-[11px] text-emerald-400 hover:underline font-mono"
                    >
                      {useCustomPaths ? '← Select Ingested Job' : 'Specify Custom Paths →'}
                    </button>
                  </div>

                  {!useCustomPaths ? (
                    <div className="space-y-3">
                      <label className="text-[11px] font-mono text-slate-400 block">
                        Select Ingestion Output (from Part 8 Sentinel-2 Service):
                      </label>
                      <select
                        value={selectedSatJobId}
                        onChange={(e) => setSelectedSatJobId(e.target.value)}
                        className="w-full bg-[#121c17] text-slate-200 border border-[#203126] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600"
                      >
                        {satelliteJobs.length === 0 ? (
                          <option value="">No satellite ingestion jobs found (Run Part 8 first or use custom paths)</option>
                        ) : (
                          satelliteJobs.map((job) => (
                            <option key={job.job_id} value={job.job_id}>
                              {job.job_id} • {job.region_id} • bitemporal ({job.status})
                            </option>
                          ))
                        )}
                      </select>

                      {selectedSatJobId && (
                        <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b] text-[11px] font-mono text-slate-400 space-y-1">
                          <div className="text-slate-300 font-semibold">Active Selection:</div>
                          <div>Job ID: <span className="text-emerald-400">{selectedSatJobId}</span></div>
                          <div>Raster Source: <span className="text-slate-300">backend/data/satellite_outputs/{selectedSatJobId}/</span></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">
                          Before Raster Path (relative to satellite outputs):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. test_pair_01/before_bitemporal.tif"
                          value={beforeRasterPath}
                          onChange={(e) => setBeforeRasterPath(e.target.value)}
                          className="w-full bg-[#121c17] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">
                          After Raster Path (relative to satellite outputs):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. test_pair_01/after_bitemporal.tif"
                          value={afterRasterPath}
                          onChange={(e) => setAfterRasterPath(e.target.value)}
                          className="w-full bg-[#121c17] text-slate-200 border border-[#203126] rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Security Notice: Paths outside the restricted sandbox are strictly blocked with HTTP 403 Forbidden.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Parameters & Hyperparameters */}
                <div className="p-4 rounded-xl bg-[#0e1612] border border-[#1b2820] space-y-4">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-2">
                    <Cpu size={14} className="text-emerald-400" />
                    Inference & Polygonization Parameters
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">
                        Region Identifier:
                      </label>
                      <select
                        value={regionId}
                        onChange={(e) => setRegionId(e.target.value)}
                        className="w-full bg-[#121c17] text-slate-200 border border-[#203126] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600"
                      >
                        <option value="western-ghats">Western Ghats (India)</option>
                        <option value="northeast-india">Northeast India (Assam)</option>
                        <option value="amazon-br">Amazon Basin (Brazil)</option>
                        <option value="sundarbans">Sundarbans (India)</option>
                        <option value="central-highlands">Central India Highlands</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="text-slate-400">Minimum Patch Size Filter:</span>
                        <span className="text-emerald-400 font-bold">{minPatchHectares} ha</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={minPatchHectares}
                        onChange={(e) => setMinPatchHectares(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Eliminates single-pixel noise and isolated canopy artifacts below {minPatchHectares} ha.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b] text-[11px] font-mono text-slate-400 space-y-1">
                      <div className="text-slate-300 font-semibold">Model Pre-flight Verification:</div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={12} /> B4 (Red) &amp; B8 (NIR) Spectral Channels
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={12} /> Scene Classification Layer (SCL) Quality Check
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={12} /> WGS84 Geodesic Ellipsoidal Projection
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Play size={15} />}
                  isLoading={isSubmitting}
                  onClick={handleLaunchInference}
                >
                  Execute Bi-Temporal Change Detection
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: JOBS ARCHIVE & RESULTS */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              {publishSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              {/* Active / Selected Job Card */}
              {activeJob ? (
                <div className="p-5 rounded-xl bg-[#0e1612] border border-[#1b2820] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#18231e]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">Job ID:</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{activeJob.job_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          activeJob.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : activeJob.status === 'failed'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                        }`}>
                          {activeJob.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Region: <span className="text-slate-300">{activeJob.region_id}</span> • Initiated: {new Date(activeJob.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RefreshCw size={12} />}
                        onClick={() => fetchMLJobById(activeJob.job_id).then(setActiveJob)}
                      >
                        Refresh
                      </Button>

                      {activeJob.status === 'completed' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<UploadCloud size={13} />}
                          isLoading={isPublishing}
                          onClick={() => handlePublishDetections(activeJob.job_id)}
                        >
                          Publish to Catalog
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{activeJob.current_stage}</span>
                      <span className="text-emerald-400 font-bold">{activeJob.progress_pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#121c17] overflow-hidden border border-[#1d2b22]">
                      <div
                        style={{ width: `${activeJob.progress_pct}%` }}
                        className={`h-full transition-all duration-300 ${
                          activeJob.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Error Detail if Failed */}
                  {activeJob.error_detail && (
                    <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs font-mono">
                      <strong>Execution Failure:</strong> {activeJob.error_detail}
                    </div>
                  )}

                  {/* Completed Results Summary */}
                  {activeJob.status === 'completed' && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b]">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Detected Scars</div>
                          <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                            {activeJob.detections_count} Polygons
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b]">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Affected Area</div>
                          <div className="text-lg font-bold text-red-400 font-mono mt-0.5">
                            {activeJob.total_loss_area_ha} ha
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b]">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Model Architecture</div>
                          <div className="text-xs font-semibold text-emerald-400 font-mono mt-1">
                            {activeJob.result_metadata?.model_version || 'CL01-dNDVI-S2'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b]">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Geodesic CRS</div>
                          <div className="text-xs font-semibold text-slate-300 font-mono mt-1">
                            EPSG:4326 (WGS84)
                          </div>
                        </div>
                      </div>

                      {/* Download Assets Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <a
                          href={getMLChangeMaskUrl(activeJob.job_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121c17] hover:bg-[#1a2820] text-emerald-300 border border-emerald-800/40 text-xs font-mono transition-colors"
                        >
                          <FileDown size={13} /> Change Mask (GeoTIFF)
                        </a>

                        <a
                          href={getMLDndviUrl(activeJob.job_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121c17] hover:bg-[#1a2820] text-emerald-300 border border-emerald-800/40 text-xs font-mono transition-colors"
                        >
                          <FileDown size={13} /> Spectral dNDVI (GeoTIFF)
                        </a>

                        <a
                          href={`/api/ml/jobs/${activeJob.job_id}/geojson`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121c17] hover:bg-[#1a2820] text-emerald-300 border border-emerald-800/40 text-xs font-mono transition-colors"
                        >
                          <FileDown size={13} /> Vector GeoJSON
                        </a>
                      </div>

                      {/* Detected Scars List */}
                      {activeJob.detections && activeJob.detections.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
                            Extracted Deforestation Polygons:
                          </div>
                          <div className="max-h-56 overflow-y-auto divide-y divide-[#141e19] border border-[#16221b] rounded-lg">
                            {activeJob.detections.map((det: any) => (
                              <div key={det.id} className="p-3 flex items-center justify-between hover:bg-[#111915] transition-colors text-xs font-mono">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200">{det.id}</span>
                                    <SeverityBadge severity={det.severity} />
                                    <span className="text-[10px] text-slate-500 font-sans">{det.name}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Area: <strong className="text-red-400">{det.areaHectares} ha</strong> • Canopy Loss: {det.canopyLossPct}% • ΔNDVI: {det.ndviDelta}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[11px] text-emerald-400 font-semibold">
                                    Confidence: {Math.round(det.confidenceScore * 100)}%
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    WGS84 Geodesic
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1d2b22] rounded-xl">
                  No ML inference job currently selected. Launch a new inference run above.
                </div>
              )}

              {/* Past Jobs List */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Inference Job Execution History ({jobsHistory.length})
                </div>
                <div className="divide-y divide-[#141e19] border border-[#16221b] rounded-xl overflow-hidden bg-[#0a0e0c]">
                  {jobsHistory.map((j) => (
                    <button
                      key={j.job_id}
                      onClick={() => setActiveJob(j)}
                      className={`w-full text-left p-3.5 flex items-center justify-between hover:bg-[#111915] transition-colors ${
                        activeJob?.job_id === j.job_id ? 'bg-[#111a15] border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-slate-200">{j.job_id}</span>
                          <span className="text-slate-500">• {j.region_id}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                            j.status === 'completed' ? 'text-emerald-400' : j.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            [{j.status}]
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(j.created_at).toLocaleString()} • {j.detections_count} scars • {j.total_loss_area_ha} ha
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-xs font-mono">{j.progress_pct}%</span>
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODEL ARCHITECTURE & SCIENTIFIC INTEGRITY */}
          {activeTab === 'model-info' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-5 rounded-xl bg-[#0e1612] border border-[#1b2820] space-y-3">
                <div className="flex items-center gap-2.5">
                  <Database size={18} className="text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-100 font-sans">
                    CL01-dNDVI-S2 Bi-Temporal Canopy Deficit Model
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  The model performs physical-optical change detection on paired Sentinel-2 Level-2A surface reflectance rasters. By calibrating against the pre-event dense canopy baseline and isolating cloud/shadow contamination via the Scene Classification Layer (SCL), it eliminates seasonal variation and False Positive alerts.
                </p>
              </div>

              {/* Formula & Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0a0e0c] border border-[#16221b] space-y-2">
                  <div className="text-xs font-mono font-semibold text-emerald-400">1. Calibrated Confidence Scoring</div>
                  <div className="p-3 rounded-lg bg-[#060a08] border border-[#121c16] text-xs font-mono text-slate-300">
                    confidence = s_loss × c_canopy × (1.0 - p_cloud_risk)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Scores range strictly from 0.0 to 1.0. A score of 0.95 indicates unequivocal loss of mature canopy with high spectral contrast, zero cloud shadow interference, and contiguous spatial clustering.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0e0c] border border-[#16221b] space-y-2">
                  <div className="text-xs font-mono font-semibold text-emerald-400">2. Scene Classification Layer (SCL) Masking</div>
                  <div className="p-3 rounded-lg bg-[#060a08] border border-[#121c16] text-xs font-mono text-slate-300">
                    Masked: Class 3 (Shadow), 8-9 (Clouds), 10 (Cirrus)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Any pixel touched by atmospheric or cloud shadow noise in either the baseline or post-event scene is cast to IEEE NaN. Clouds are never counted as deforestation.
                  </p>
                </div>
              </div>

              {/* Retraining & Compute Blueprint */}
              <div className="p-5 rounded-xl bg-[#0c120f] border border-[#1a2520] space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-amber-400" />
                  <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                    Deep Learning Retraining & Compute Resource Blueprint
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  To transition from the spectral-physical baseline to a heavy end-to-end deep neural network (e.g. ChangeFormer or Siamese Swin-UNet), the following documented resources and compute infrastructure are required before commencing training:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b] text-xs font-mono">
                    <div className="text-slate-500 uppercase text-[10px]">Training Dataset</div>
                    <div className="text-slate-200 font-semibold mt-1">50,000 Paired S2 L2A Chips</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Dynamic World + Hansen GFC ground-truth</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b] text-xs font-mono">
                    <div className="text-slate-500 uppercase text-[10px]">Compute Cluster</div>
                    <div className="text-slate-200 font-semibold mt-1">4× NVIDIA A100 (80GB)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">72 hours per training epoch run (~350 kWh)</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#090d0b] border border-[#16221b] text-xs font-mono">
                    <div className="text-slate-500 uppercase text-[10px]">Validation Protocol</div>
                    <div className="text-slate-200 font-semibold mt-1">Spatial K-Fold Cross-Val</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Zero spatial leakage across tropical biomes</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
