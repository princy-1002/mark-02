import React, { useState } from 'react';
import type { 
  DatasetSummary, 
  ModelArchitectureConfig, 
  ComputeDeviceInfo,
  TrainingJobResponse 
} from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  Cpu, 
  Play, 
  Activity, 
  BrainCircuit, 
  Sliders
} from 'lucide-react';

interface ModelConfigurePanelProps {
  dataset: DatasetSummary | null;
  architectures: ModelArchitectureConfig[];
  deviceInfo: ComputeDeviceInfo | null;
  onTrainingStarted: (job: TrainingJobResponse) => void;
}

export const ModelConfigurePanel: React.FC<ModelConfigurePanelProps> = ({
  dataset,
  architectures,
  deviceInfo,
  onTrainingStarted,
}) => {
  const [selectedArch, setSelectedArch] = useState<string>('unet_satellite_v1');
  const [modelName, setModelName] = useState<string>('CL01-UNet-ForestLoss');
  const [epochs, setEpochs] = useState<number>(10);
  const [batchSize, setBatchSize] = useState<number>(4);
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [optimizer, setOptimizer] = useState<'AdamW' | 'Adam' | 'SGD'>('AdamW');
  const [lossFunction, setLossFunction] = useState<'Combined_BCE_Dice' | 'BCE' | 'Dice'>('Combined_BCE_Dice');
  const [usePretrained, setUsePretrained] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeArch = architectures.find((a) => a.id === selectedArch) || architectures[0];

  const handleStartTraining = async () => {
    if (!dataset) {
      setErrorMsg('Please select and prepare a dataset before starting training.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const job = await ModelLabService.startTraining({
        dataset_id: dataset.dataset_id,
        model_name: modelName.trim() || 'Custom-UNet',
        architecture: selectedArch,
        task: 'forest_loss_segmentation',
        epochs,
        batch_size: batchSize,
        learning_rate: learningRate,
        optimizer,
        loss_function: lossFunction,
        use_pretrained: usePretrained,
      });

      onTrainingStarted(job);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start model training.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedRuntimeSec = activeArch ? Math.round(epochs * activeArch.estimated_time_per_epoch_sec) : 10;

  return (
    <div className="space-y-6">
      {/* Top Banner: Architecture & Hardware Telemetry */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <BrainCircuit size={20} className="text-sky-400" />
              Convolutional Neural Network Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Select verified PyTorch deep learning architectures, configure loss weighting for canopy imbalance, and set training hyperparameters.
            </p>
          </div>

          {/* Compute Device Telemetry Badge */}
          {deviceInfo && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#060c09] border border-teal-500/30 font-mono text-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-300">
                <Cpu size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <span>{deviceInfo.device_name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-teal-400/80 block">
                  {deviceInfo.fallback_message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Dataset Summary */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#07130e] border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">Target Training Dataset:</span>
            {dataset ? (
              <span className="text-sky-300 font-bold px-2 py-0.5 rounded bg-sky-950/60 border border-sky-400/30">
                {dataset.name} ({dataset.image_count} patches)
              </span>
            ) : (
              <span className="text-amber-400">None Selected</span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Task: Semantic Segmentation (2 Classes: Intact Forest Canopy vs Deforestation Scar)
          </span>
        </div>
      </div>

      {/* Main Grid: Architecture Choice vs Hyperparameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Architecture Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
            <Activity size={14} />
            Verified Model Architectures ({architectures.length})
          </h4>

          <div className="space-y-3">
            {architectures.map((arch) => {
              const isSelected = arch.id === selectedArch;
              return (
                <div
                  key={arch.id}
                  onClick={() => {
                    setSelectedArch(arch.id);
                    setEpochs(arch.default_epochs);
                    setBatchSize(arch.default_batch_size);
                    setLearningRate(arch.default_lr);
                  }}
                  className={`p-5 rounded-xl transition-all cursor-pointer border relative group ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-950/40 via-[#0e1d17] to-[#091510] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                      : 'bg-[#08120e]/90 hover:bg-[#0c1a14] border-teal-500/20 hover:border-teal-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-slate-100 group-hover:text-sky-200">
                          {arch.name}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40">
                          PyTorch
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                        {arch.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-right font-mono">
                      <span className="text-[10px] text-slate-500 block">EST. SPEED</span>
                      <span className="text-xs text-emerald-400 font-bold">
                        ~{arch.estimated_time_per_epoch_sec}s / epoch
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-teal-500/15 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">CHANNELS</span>
                      <span className="text-slate-300">{arch.input_channels} (RGB Satellite)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CLASSES</span>
                      <span className="text-slate-300">{arch.classes} (Binary Canopy)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">RECOMMENDED LR</span>
                      <span className="text-sky-300 font-bold">{arch.default_lr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model Name and Pretrained Option */}
          <div className="p-4 rounded-xl bg-[#091410] border border-teal-500/25 space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Model Checkpoint Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. WesternGhats-UNet-v2"
                className="w-full px-3.5 py-2 bg-[#060b08] border border-teal-500/40 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-400 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-teal-500/15">
              <div className="space-y-0.5">
                <span className="text-xs font-mono text-slate-200 font-semibold">
                  Pretrained Weights Initialization
                </span>
                <p className="text-[11px] text-slate-400 font-sans">
                  Initialize convolutional layers with pre-calibrated canopy feature representations for faster convergence.
                </p>
              </div>
              <input
                type="checkbox"
                checked={usePretrained}
                onChange={(e) => setUsePretrained(e.target.checked)}
                className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Hyperparameters Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
            <Sliders size={14} />
            Training Hyperparameters
          </h4>

          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {/* Epoch Count */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Epochs:</span>
                <span className="text-sky-300 font-bold">{epochs} epochs</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                className="w-full h-2 bg-[#060b08] rounded-lg appearance-none cursor-pointer accent-sky-400 border border-teal-500/40"
              />
            </div>

            {/* Batch Size */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Batch Size:</span>
                <span className="text-teal-300 font-bold">{batchSize}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 8, 16].map((bs) => (
                  <button
                    key={bs}
                    type="button"
                    onClick={() => setBatchSize(bs)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      batchSize === bs
                        ? 'bg-sky-950/80 text-sky-300 border-sky-400 font-bold shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                        : 'bg-[#060b08] text-slate-400 border-teal-500/25 hover:border-teal-400/40'
                    }`}
                  >
                    {bs}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Rate */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Learning Rate:</span>
                <span className="text-teal-300 font-bold">{learningRate}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0.0005, 0.001, 0.002].map((lr) => (
                  <button
                    key={lr}
                    type="button"
                    onClick={() => setLearningRate(lr)}
                    className={`py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                      learningRate === lr
                        ? 'bg-sky-950/80 text-sky-300 border-sky-400 font-bold shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                        : 'bg-[#060b08] text-slate-400 border-teal-500/25 hover:border-teal-400/40'
                    }`}
                  >
                    {lr}
                  </button>
                ))}
              </div>
            </div>

            {/* Optimizer */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Optimizer:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['AdamW', 'Adam', 'SGD'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOptimizer(opt)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      optimizer === opt
                        ? 'bg-teal-950/80 text-teal-300 border-teal-400 font-bold shadow-[0_0_10px_rgba(20,184,166,0.25)]'
                        : 'bg-[#060b08] text-slate-400 border-teal-500/25 hover:border-teal-400/40'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Loss Function */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Loss Criterion:
              </label>
              <div className="space-y-1.5">
                {(['Combined_BCE_Dice', 'BCE', 'Dice'] as const).map((loss) => (
                  <button
                    key={loss}
                    type="button"
                    onClick={() => setLossFunction(loss)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono border text-left flex items-center justify-between transition-all ${
                      lossFunction === loss
                        ? 'bg-sky-950/70 text-sky-200 border-sky-400 font-bold shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : 'bg-[#060b08] text-slate-400 border-teal-500/25 hover:border-teal-400/40'
                    }`}
                  >
                    <span>{loss === 'Combined_BCE_Dice' ? 'BCE + Soft Dice (Imbalance Weighted)' : loss}</span>
                    {lossFunction === loss && <span className="text-sky-400 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Resource Requirements Estimate */}
            <div className="pt-3 border-t border-teal-500/15 space-y-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>ESTIMATED DURATION:</span>
                <span className="text-slate-200 font-bold">~{estimatedRuntimeSec} seconds</span>
              </div>
              <div className="flex justify-between">
                <span>ESTIMATED RAM / VRAM:</span>
                <span className="text-slate-200 font-bold">~280 MB</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 font-sans">
                {errorMsg}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-2"
              onClick={handleStartTraining}
              isLoading={isSubmitting}
              icon={<Play size={16} />}
            >
              Start PyTorch Training
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
