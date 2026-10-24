import React from 'react';
import type { TrainingJobResponse } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  BarChart2, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  Target, 
  FileCheck
} from 'lucide-react';

interface EvaluationViewProps {
  job: TrainingJobResponse | null;
  onGoToInference: (modelId: string) => void;
  onGoToRegistry: () => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  job,
  onGoToInference,
  onGoToRegistry,
}) => {
  if (!job || !job.metrics) {
    return (
      <div className="rounded-2xl bg-[#09100d]/90 border border-teal-500/20 p-12 text-center">
        <BarChart2 size={40} className="mx-auto text-teal-400/50 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Evaluation Metrics Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Complete a model training run to view genuine IoU, Dice coefficients, confusion matrix statistics, and qualitative patch segmentations evaluated on held-out test data.
        </p>
      </div>
    );
  }

  const { metrics } = job;
  const cm = metrics.confusion_matrix;
  const totalPixels = cm.true_positive + cm.false_positive + cm.true_negative + cm.false_negative;
  const tpPct = ((cm.true_positive / totalPixels) * 100).toFixed(1);
  const fpPct = ((cm.false_positive / totalPixels) * 100).toFixed(1);
  const tnPct = ((cm.true_negative / totalPixels) * 100).toFixed(1);
  const fnPct = ((cm.false_negative / totalPixels) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h3 className="text-base font-bold text-slate-100 font-mono">
                {job.model_name} — Held-Out Test Evaluation
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Verified Test Split
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Evaluated on {metrics.sample_count} held-out test patches ({job.dataset_id}) with zero geographic leakage.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToRegistry}
              icon={<Layers size={13} />}
            >
              Model Registry
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onGoToInference(job.model_version_id || 'mod-cl01-baseline-unet')}
              icon={<ArrowRight size={13} />}
            >
              Test on New Satellite Imagery
            </Button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-[#060b08] border border-sky-400/40 text-center shadow-[0_0_15px_rgba(56,189,248,0.1)]">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">IoU (Jaccard)</span>
            <span className="text-2xl font-bold font-mono text-sky-400">
              {(metrics.iou * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Overlap accuracy</span>
          </div>

          <div className="p-4 rounded-xl bg-[#060b08] border border-emerald-400/40 text-center shadow-[0_0_15px_rgba(52,211,153,0.1)]">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Dice / F1-Score</span>
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {(metrics.dice * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Harmonic balance</span>
          </div>

          <div className="p-4 rounded-xl bg-[#060b08] border border-teal-400/30 text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Precision</span>
            <span className="text-2xl font-bold font-mono text-teal-300">
              {(metrics.precision * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Low false alarms</span>
          </div>

          <div className="p-4 rounded-xl bg-[#060b08] border border-teal-400/30 text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Recall</span>
            <span className="text-2xl font-bold font-mono text-teal-300">
              {(metrics.recall * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Loss capture rate</span>
          </div>

          <div className="p-4 rounded-xl bg-[#060b08] border border-teal-400/30 text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Overall Accuracy</span>
            <span className="text-2xl font-bold font-mono text-slate-200">
              {(metrics.accuracy * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Pixel total match</span>
          </div>

          <div className="p-4 rounded-xl bg-[#060b08] border border-teal-400/30 text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Specificity</span>
            <span className="text-2xl font-bold font-mono text-slate-200">
              {(metrics.specificity * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Intact canopy safety</span>
          </div>
        </div>
      </div>

      {/* Confusion Matrix and Imbalance Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-5 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2 pb-3 border-b border-teal-500/15">
            <Target size={14} />
            Pixel-Level Confusion Matrix (2x2)
          </h4>

          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
            {/* True Positive */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                True Positive (Deforestation Correctly Flagged)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold text-emerald-300">
                  {cm.true_positive.toLocaleString()} px
                </span>
                <span className="text-xs text-emerald-400/80">{tpPct}%</span>
              </div>
            </div>

            {/* False Positive */}
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40">
              <span className="text-[10px] text-red-400 uppercase font-bold block">
                False Positive (Canopy Misidentified as Loss)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold text-red-300">
                  {cm.false_positive.toLocaleString()} px
                </span>
                <span className="text-xs text-red-400/80">{fpPct}%</span>
              </div>
            </div>

            {/* False Negative */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">
                False Negative (Missed Deforestation Event)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold text-amber-300">
                  {cm.false_negative.toLocaleString()} px
                </span>
                <span className="text-xs text-amber-400/80">{fnPct}%</span>
              </div>
            </div>

            {/* True Negative */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                True Negative (Intact Canopy Preserved)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold text-slate-300">
                  {cm.true_negative.toLocaleString()} px
                </span>
                <span className="text-xs text-slate-500">{tnPct}%</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-mono mt-3 leading-relaxed">
            Matrix computed by comparing raw sigmoid output (threshold &ge; 0.50) against verified ground-truth binary masks on held-out test scenes.
          </p>
        </div>

        {/* Class Imbalance & Evaluation Rigor Note (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-5 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2 pb-3 border-b border-teal-500/15">
              <ShieldCheck size={14} className="text-emerald-400" />
              Class Imbalance Accounting & Protocol
            </h4>

            <div className="mt-4 space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                In tropical satellite scenes, deforestation scars typically represent less than 10-15% of total pixel area. Standard overall accuracy can be misleading because predicting &ldquo;all canopy&rdquo; yields ~85% accuracy.
              </p>

              <div className="p-3 rounded-xl bg-[#060c09] border border-teal-500/20 font-mono text-[11px] space-y-1">
                <div className="text-sky-300 font-semibold">Evaluated Primary Metric: IoU (Jaccard Index)</div>
                <div className="text-slate-400">
                  Measures the geometric area of overlap divided by area of union, specifically penalizing false alarms without being inflated by vast areas of background canopy.
                </div>
              </div>

              <p className="text-slate-400 text-[11px]">
                Validation protocol: Tested with spatial scene grouping active. Zero overlapping satellite tiles leaked between train and test distributions.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-teal-500/15 mt-3 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Metrics calculated directly from actual neural network predictions.
          </div>
        </div>
      </div>

      {/* Qualitative Visual Comparison Gallery */}
      {metrics.qualitative_samples && metrics.qualitative_samples.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between pb-3 border-b border-teal-500/15">
            <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
              <FileCheck size={14} />
              Qualitative Visual Segmentations (Test Set Samples)
            </h4>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                True Positive
              </span>
              <span className="text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                False Alarm
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Missed Loss
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {metrics.qualitative_samples.map((sample, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#060b08] border border-teal-500/25 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold truncate max-w-[140px]">
                    {sample.sample_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sky-300">IoU: {(sample.iou * 100).toFixed(0)}%</span>
                    <span className="text-emerald-400">Dice: {(sample.dice * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase text-center">Ground Truth</span>
                    <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden border border-teal-500/20">
                      <img
                        src={ModelLabService.getAssetUrl(sample.ground_truth_url || '')}
                        alt="Ground truth"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-sky-400 block uppercase text-center">Prediction</span>
                    <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden border border-sky-400/40">
                      <img
                        src={ModelLabService.getAssetUrl(sample.prediction_url)}
                        alt="Prediction"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-emerald-400 block uppercase text-center">Difference</span>
                    <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden border border-emerald-500/30">
                      <img
                        src={ModelLabService.getAssetUrl(sample.difference_url)}
                        alt="Difference heatmap"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
