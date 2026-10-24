import React, { useState } from 'react';
import type { DatasetSummary, DatasetPrepareResponse } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  Split, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon, 
  ArrowRight,
  Sliders,
  Sparkles
} from 'lucide-react';

interface DatasetPreparePanelProps {
  dataset: DatasetSummary | null;
  onPrepareSuccess: (prepResult: DatasetPrepareResponse) => void;
  onGoToTrain: (datasetId: string) => void;
}

export const DatasetPreparePanel: React.FC<DatasetPreparePanelProps> = ({
  dataset,
  onPrepareSuccess,
  onGoToTrain,
}) => {
  const [trainSplit, setTrainSplit] = useState(70);
  const [valSplit, setValSplit] = useState(15);
  const [testSplit, setTestSplit] = useState(15);
  const [normalization, setNormalization] = useState<'min_max' | 'standard' | 'robust'>('min_max');
  const [spatialGrouping, setSpatialGrouping] = useState(true);
  const [augmentation, setAugmentation] = useState(true);

  const [isPreparing, setIsPreparing] = useState(false);
  const [prepResult, setPrepResult] = useState<DatasetPrepareResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!dataset) {
    return (
      <div className="rounded-2xl bg-[#09100d]/90 border border-teal-500/20 p-12 text-center">
        <Layers size={40} className="mx-auto text-teal-400/50 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Dataset Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Please select a dataset from the Datasets tab to inspect imagery thumbnails, configure train/test splits, and prevent spatial data leakage.
        </p>
      </div>
    );
  }

  const handleTrainSplitChange = (val: number) => {
    const remain = 100 - val;
    setTrainSplit(val);
    setValSplit(Math.round(remain / 2));
    setTestSplit(remain - Math.round(remain / 2));
  };

  const handleRunPreparation = async () => {
    setIsPreparing(true);
    setErrorMsg(null);
    try {
      const res = await ModelLabService.prepareDataset({
        dataset_id: dataset.dataset_id,
        train_split: trainSplit / 100,
        val_split: valSplit / 100,
        test_split: testSplit / 100,
        normalization,
        spatial_grouping: spatialGrouping,
        augmentation
      });
      setPrepResult(res);
      onPrepareSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to prepare dataset splits.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dataset Overview Header Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h3 className="text-base font-bold text-slate-100 font-mono">
                {dataset.name}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40">
                {dataset.dataset_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {dataset.description || 'Verified satellite imagery dataset.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#060b08] text-slate-300 border border-teal-500/30">
              {dataset.image_count} Raster Patches
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#060b08] text-emerald-300 border border-emerald-500/40">
              {dataset.mask_count} Ground-Truth Masks
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-[#060b08] text-teal-300 border border-teal-500/30">
              {dataset.crs || 'Pixel Coordinate Grid'}
            </span>
          </div>
        </div>

        {/* Thumbnail Preview Gallery */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold flex items-center gap-2">
              <ImageIcon size={14} />
              Sample Imagery & Label Alignment Gallery
            </h4>
            <span className="text-[11px] text-slate-400 font-sans">
              Showing {dataset.sample_images.length} representative patches
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {dataset.sample_images.map((sample, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden bg-[#060c09] border border-teal-500/20 group relative shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              >
                <div className="aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                  <img
                    src={ModelLabService.getAssetUrl(sample.preview_url)}
                    alt={sample.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-2 text-[10px] font-mono bg-[#0c1611]/90 border-t border-teal-500/15">
                  <p className="truncate text-slate-300">{sample.name}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-slate-500">{sample.dimensions}</span>
                    <span className={sample.has_mask ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {sample.has_mask ? 'Mask ✓' : 'No Mask'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invalid or Warning Files Report */}
        {dataset.invalid_files && dataset.invalid_files.length > 0 && (
          <div className="mt-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-sans text-amber-200">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <AlertCircle size={15} className="text-amber-400 shrink-0" />
              Detected {dataset.invalid_files.length} Unusable / Malformed File(s)
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/80">
              {dataset.invalid_files.map((inv, i) => (
                <li key={i}><span className="font-mono text-amber-100">{inv.file}</span>: {inv.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Dataset Split & Leakage Configuration Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 pb-3 border-b border-teal-500/15">
          <Split size={18} className="text-sky-400" />
          Train / Validation / Test Partitioning & Leakage Prevention
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          {/* Left Column: Sliders and Ratios */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-slate-300">Training Split:</span>
                <span className="text-sky-400 font-bold">{trainSplit}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                step="5"
                value={trainSplit}
                onChange={(e) => handleTrainSplitChange(Number(e.target.value))}
                className="w-full h-2 bg-[#060b08] rounded-lg appearance-none cursor-pointer accent-sky-400 border border-teal-500/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#060b08] border border-sky-400/30 text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Train Set</span>
                <span className="text-lg font-bold font-mono text-sky-400">{trainSplit}%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ~{Math.round((dataset.image_count * trainSplit) / 100)} scenes
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060b08] border border-teal-400/30 text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Val Set</span>
                <span className="text-lg font-bold font-mono text-teal-300">{valSplit}%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ~{Math.round((dataset.image_count * valSplit) / 100)} scenes
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#060b08] border border-emerald-400/30 text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Test Set</span>
                <span className="text-lg font-bold font-mono text-emerald-300">{testSplit}%</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ~{Math.round((dataset.image_count * testSplit) / 100)} scenes
                </span>
              </div>
            </div>

            {/* Normalization Choice */}
            <div className="pt-2">
              <label className="block text-xs font-mono text-slate-300 mb-2">
                Raster Preprocessing & Normalization:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['min_max', 'standard', 'robust'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setNormalization(mode)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono border transition-all ${
                      normalization === mode
                        ? 'bg-sky-950/80 text-sky-200 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-bold'
                        : 'bg-[#060b08] text-slate-400 border-teal-500/25 hover:border-teal-400/50'
                    }`}
                  >
                    {mode === 'min_max' ? 'Min-Max [0, 1]' : mode === 'standard' ? 'Z-Score Std' : 'Robust IQR'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Leakage Protection & Augmentation */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#07130e] border border-teal-500/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Spatial Scene Grouping (No Data Leakage)
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Groups spatial patches by parent satellite scene footprint. Ensures adjacent or overlapping tiles are never split between training and validation sets.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={spatialGrouping}
                  onChange={(e) => setSpatialGrouping(e.target.checked)}
                  className="w-4 h-4 accent-teal-400 rounded cursor-pointer mt-1"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pt-3 border-t border-teal-500/15">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-sky-400" />
                    Spatial Augmentation (Flips & Rotations)
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Random 90-degree rotations and horizontal/vertical reflections applied synchronously to rasters and masks to improve orientation invariance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={augmentation}
                  onChange={(e) => setAugmentation(e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer mt-1"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full py-3"
              onClick={handleRunPreparation}
              isLoading={isPreparing}
              icon={<Sliders size={16} />}
            >
              Partition & Verify Dataset
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200 font-sans">
            {errorMsg}
          </div>
        )}

        {/* Preparation Success Outcome */}
        {prepResult && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Dataset Prepared Successfully
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onGoToTrain(dataset.dataset_id)}
                icon={<ArrowRight size={14} />}
              >
                Proceed to Model Configuration
              </Button>
            </div>

            <p className="text-xs text-slate-300 font-sans">{prepResult.message}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-emerald-500/20">
              <div>
                <span className="text-slate-400 text-[10px] block">Train Samples</span>
                <span className="text-sky-300 font-bold">{prepResult.train_count}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Val Samples</span>
                <span className="text-teal-300 font-bold">{prepResult.val_count}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Spatial Groups</span>
                <span className="text-emerald-300 font-bold">{prepResult.spatial_groups_count}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Forest Loss Ratio</span>
                <span className="text-amber-300 font-bold">{prepResult.class_distribution.forest_loss_cleared_pct}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
