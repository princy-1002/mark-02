import React, { useState, useRef } from 'react';
import type { ModelRegistryItem, InferenceResultResponse } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  Scan, 
  Upload, 
  Download, 
  Layers, 
  FileCode,
  Flame,
  ShieldAlert
} from 'lucide-react';

interface InferenceWorkspaceProps {
  models: ModelRegistryItem[];
  preselectedModelId?: string;
  onGoToTrain: () => void;
}

export const InferenceWorkspace: React.FC<InferenceWorkspaceProps> = ({
  models,
  preselectedModelId,
  onGoToTrain,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    preselectedModelId || models[0]?.model_id || 'mod-cl01-baseline-unet'
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.50);
  const [selectedSample, setSelectedSample] = useState<string>('sample_sentinel2_clearing.png');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(70);
  const [displayMode, setDisplayMode] = useState<'overlay' | 'side_by_side' | 'mask_only'>('overlay');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<InferenceResultResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
      setSelectedSample('');
    }
  };

  const handleRunInference = async () => {
    setIsRunning(true);
    setErrorMsg(null);

    try {
      const res = await ModelLabService.runInference({
        file: uploadedFile || undefined,
        sampleName: !uploadedFile ? selectedSample : undefined,
        modelId: selectedModelId,
        confidenceThreshold,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Inference execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadMask = () => {
    if (!result) return;
    const url = ModelLabService.getAssetUrl(result.mask_download_url);
    window.open(url, '_blank');
  };

  const handleDownloadGeoJson = () => {
    if (!result?.geojson) return;
    const blob = new Blob([JSON.stringify(result.geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forest_loss_polygons_${result.inference_id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <div className="flex items-center gap-2">
              <Scan size={20} className="text-sky-400" />
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Satellite Forest-Loss Inference Studio
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Test trained deep learning models on new satellite rasters. Generates pixel-calibrated change masks, overlays, and calculated area statistics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-400/40">
              Live PyTorch Inference
            </span>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
          {/* Model Selection (4 cols) */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              Active Trained Model:
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2 bg-[#060b08] border border-teal-500/30 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.name} (v{m.version}) — IoU: {(m.metrics.iou * 100).toFixed(0)}%
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans">
              <span>Weights loaded from registry</span>
              <button
                type="button"
                onClick={onGoToTrain}
                className="text-sky-400 hover:text-sky-300 underline font-mono"
              >
                + Train new model
              </button>
            </div>
          </div>

          {/* Test Scene Source (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              Input Satellite Scene:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSample}
                onChange={(e) => {
                  setSelectedSample(e.target.value);
                  setUploadedFile(null);
                }}
                disabled={uploadedFile !== null}
                className="flex-1 px-3 py-2 bg-[#060b08] border border-teal-500/30 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400 disabled:opacity-50"
              >
                <option value="sample_sentinel2_clearing.png">
                  Sample: Western Ghats Canopy Clearance
                </option>
                <option value="sample_amazon_corridor.png">
                  Sample: Amazon Road Slash Corridor
                </option>
              </select>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-2 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 ${
                  uploadedFile
                    ? 'bg-sky-950 text-sky-300 border-sky-400'
                    : 'bg-[#060b08] text-slate-300 border-teal-500/30 hover:border-teal-400'
                }`}
                title="Upload custom satellite image"
              >
                <Upload size={13} />
                {uploadedFile ? 'Custom File' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".tif,.tiff,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {uploadedFile && (
              <span className="text-[10px] text-sky-400 font-mono block">
                Selected: {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            )}
          </div>

          {/* Confidence Threshold & Run Action (3 cols) */}
          <div className="md:col-span-3 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Confidence Cutoff:</span>
              <span className="text-sky-300 font-bold">{(confidenceThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.85"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full h-2 bg-[#060b08] rounded-lg appearance-none cursor-pointer accent-sky-400 border border-teal-500/30"
            />
            <Button
              variant="primary"
              size="md"
              className="w-full mt-2"
              onClick={handleRunInference}
              isLoading={isRunning}
              icon={<Scan size={14} />}
            >
              Analyze Satellite Scene
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 font-sans">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Inference Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Telemetry and Metrics Overview Card */}
          <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-teal-500/15">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                  INFERENCE RESULTS • {result.inference_id}
                </span>
                <h4 className="text-base font-bold text-slate-100 font-mono mt-0.5 flex items-center gap-2">
                  <Flame size={18} className="text-orange-400" />
                  {result.image_name} — {result.forest_loss_pct}% Detected Canopy Disturbance
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadMask}
                  icon={<Download size={13} />}
                >
                  Mask (PNG)
                </Button>
                {result.geojson && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadGeoJson}
                    icon={<FileCode size={13} />}
                  >
                    Polygons (GeoJSON)
                  </Button>
                )}
              </div>
            </div>

            {/* Computed Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 rounded-xl bg-[#060b08] border border-teal-500/20">
                <span className="text-[10px] text-slate-500 uppercase block">ANALYZED AREA</span>
                <span className="text-lg font-bold text-slate-100">
                  {result.total_area_ha !== null ? `${result.total_area_ha} ha` : `${result.total_pixels.toLocaleString()} px`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {result.is_georeferenced ? result.crs || 'Projected CRS' : 'Pixel Grid Geometry'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060b08] border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <span className="text-[10px] text-red-400 uppercase font-bold block">FOREST LOSS DETECTED</span>
                <span className="text-lg font-bold text-red-300">
                  {result.forest_loss_ha !== null ? `${result.forest_loss_ha} ha` : `${result.forest_loss_pixels.toLocaleString()} px`}
                </span>
                <span className="text-[10px] text-red-400/80 block mt-0.5">
                  {result.forest_loss_pct}% canopy clearance
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060b08] border border-sky-400/30">
                <span className="text-[10px] text-slate-500 uppercase block">MEAN MODEL CONFIDENCE</span>
                <span className="text-lg font-bold text-sky-400">
                  {(result.mean_confidence * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Calibrated sigmoid probability
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060b08] border border-teal-500/20">
                <span className="text-[10px] text-slate-500 uppercase block">INFERENCE LATENCY</span>
                <span className="text-lg font-bold text-teal-300">
                  {result.execution_time_sec}s
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  PyTorch forward pass
                </span>
              </div>
            </div>

            {/* Severity Distribution Breakdown */}
            <div className="p-3 rounded-xl bg-[#060c09] border border-teal-500/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Severity Breakdown:</span>
              <div className="flex items-center gap-4">
                <span className="text-red-400">
                  Critical Deforestation: <strong>{result.severity_breakdown.critical} px</strong>
                </span>
                <span className="text-orange-400">
                  High Disturbance: <strong>{result.severity_breakdown.high} px</strong>
                </span>
                <span className="text-amber-300">
                  Moderate Thinning: <strong>{result.severity_breakdown.moderate} px</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Comparison Viewer */}
          <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-teal-500/15">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-teal-400" />
                <h4 className="text-sm font-bold text-slate-100 font-mono">
                  Spectral Segmentation Viewer
                </h4>
              </div>

              <div className="flex items-center gap-3">
                {/* Display Mode Switcher */}
                <div className="flex items-center p-1 rounded-xl bg-[#060b08] border border-teal-500/30 text-xs font-mono">
                  <button
                    onClick={() => setDisplayMode('overlay')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      displayMode === 'overlay' ? 'bg-sky-950 text-sky-300 border border-sky-400/40 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    onClick={() => setDisplayMode('side_by_side')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      displayMode === 'side_by_side' ? 'bg-sky-950 text-sky-300 border border-sky-400/40 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    onClick={() => setDisplayMode('mask_only')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      displayMode === 'mask_only' ? 'bg-sky-950 text-sky-300 border border-sky-400/40 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Mask Only
                  </button>
                </div>

                {/* Opacity Slider for Overlay Mode */}
                {displayMode === 'overlay' && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400 text-[11px]">Opacity:</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-20 h-1.5 bg-[#060b08] rounded-lg accent-sky-400 cursor-pointer"
                    />
                    <span className="text-sky-300 w-8">{overlayOpacity}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Canvas Display */}
            {displayMode === 'overlay' && (
              <div className="relative aspect-[16/9] max-h-[500px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-teal-500/20">
                <img
                  src={ModelLabService.getAssetUrl(result.original_image_url)}
                  alt="Original Satellite"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <img
                  src={ModelLabService.getAssetUrl(result.overlay_image_url)}
                  alt="Deforestation Overlay"
                  style={{ opacity: overlayOpacity / 100 }}
                  className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity"
                />
              </div>
            )}

            {displayMode === 'side_by_side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-300 font-semibold block text-center">
                    Original Satellite Image
                  </span>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black border border-teal-500/20 flex items-center justify-center">
                    <img
                      src={ModelLabService.getAssetUrl(result.original_image_url)}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-sky-400 font-semibold block text-center">
                    Predicted Forest Loss Mask
                  </span>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black border border-sky-400/40 flex items-center justify-center">
                    <img
                      src={ModelLabService.getAssetUrl(result.mask_image_url)}
                      alt="Predicted Mask"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {displayMode === 'mask_only' && (
              <div className="aspect-[16/9] max-h-[500px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-sky-400/30">
                <img
                  src={ModelLabService.getAssetUrl(result.mask_image_url)}
                  alt="Mask Only"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Disclaimer Footer */}
            <div className="p-3.5 rounded-xl bg-[#091510] border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200/90 font-sans leading-relaxed">
              <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 font-mono text-[11px] block">
                  LEGAL DISCLAIMER & ANALYST REVIEW NOTICE
                </span>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  {result.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
