import React, { useState } from 'react';
import type { ModelRegistryItem } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  Layers, 
  Download, 
  Trash2, 
  ArrowRight, 
  Cpu, 
  Sparkles,
  HardDrive
} from 'lucide-react';

interface ModelRegistryViewProps {
  models: ModelRegistryItem[];
  onSelectForInference: (modelId: string) => void;
  onRefreshModels: () => void;
}

export const ModelRegistryView: React.FC<ModelRegistryViewProps> = ({
  models,
  onSelectForInference,
  onRefreshModels,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.model_id || '');

  const selectedModel = models.find((m) => m.model_id === selectedModelId) || models[0] || null;

  const handleDelete = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (modelId === 'mod-cl01-baseline-unet') {
      alert('The Western Ghats Baseline Model is a core platform asset and cannot be deleted.');
      return;
    }

    if (!confirm('Are you sure you want to delete this saved model version from the registry?')) return;

    try {
      await ModelLabService.deleteModel(modelId);
      onRefreshModels();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleDownloadWeights = (modelId: string) => {
    const url = ModelLabService.getAssetUrl(`/api/model-lab/models/${encodeURIComponent(modelId)}/download-weights`);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Registry Header */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-sky-400" />
            <h3 className="text-base font-bold text-slate-100 font-mono">
              Saved Model Version Registry ({models.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Immutable version catalog of trained neural networks, checkpoints (.pt), and calibrated test metrics ready for satellite inference.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-teal-950/80 text-teal-300 border border-teal-500/40">
            PyTorch StateDict (.pt)
          </span>
        </div>
      </div>

      {/* Models Grid & Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Model List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
            Registered Models
          </h4>

          <div className="space-y-3">
            {models.map((model) => {
              const isSelected = model.model_id === selectedModel?.model_id;
              const isBaseline = model.model_id === 'mod-cl01-baseline-unet';

              return (
                <div
                  key={model.model_id}
                  onClick={() => setSelectedModelId(model.model_id)}
                  className={`p-4.5 rounded-xl transition-all cursor-pointer border relative group ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-950/40 via-[#0e1d17] to-[#091510] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                      : 'bg-[#08120e]/90 hover:bg-[#0c1a14] border-teal-500/20 hover:border-teal-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isBaseline ? 'bg-sky-950 text-sky-400 border border-sky-400/40' : 'bg-teal-950 text-teal-300 border border-teal-500/30'}`}>
                        {isBaseline ? <Sparkles size={16} /> : <Cpu size={16} />}
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-100 group-hover:text-sky-200 line-clamp-1">
                          {model.name}
                        </h5>
                        <p className="text-[10px] font-mono text-slate-400">
                          v{model.version} • {model.architecture}
                        </p>
                      </div>
                    </div>

                    {!isBaseline && (
                      <button
                        onClick={(e) => handleDelete(model.model_id, e)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                        title="Delete Model Version"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-teal-500/15 text-[11px] font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-sky-300">
                        IoU: {(model.metrics.iou * 100).toFixed(1)}%
                      </span>
                      <span className="text-emerald-400">
                        Dice: {(model.metrics.dice * 100).toFixed(1)}%
                      </span>
                    </div>

                    <span className="text-slate-500 text-[10px]">
                      {(model.size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Model Deep-Dive Card (7 cols) */}
        <div className="lg:col-span-7">
          {selectedModel ? (
            <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-teal-500/15">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100 font-mono">
                      {selectedModel.name}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-400/40">
                      Version {selectedModel.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    {selectedModel.description || 'Calibrated convolutional neural network checkpoint.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadWeights(selectedModel.model_id)}
                    icon={<Download size={13} />}
                  >
                    Weights (.pt)
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectForInference(selectedModel.model_id)}
                    icon={<ArrowRight size={13} />}
                  >
                    Use in Inference
                  </Button>
                </div>
              </div>

              {/* Verified Metrics Card */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold block">
                  Calibrated Evaluation Performance (Held-Out Data)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                  <div className="p-3 rounded-xl bg-[#060b08] border border-sky-400/30">
                    <span className="text-[10px] text-slate-500 uppercase block">IoU (Jaccard)</span>
                    <span className="text-lg font-bold text-sky-400">
                      {(selectedModel.metrics.iou * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#060b08] border border-emerald-400/30">
                    <span className="text-[10px] text-slate-500 uppercase block">Dice / F1</span>
                    <span className="text-lg font-bold text-emerald-300">
                      {(selectedModel.metrics.dice * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#060b08] border border-teal-400/30">
                    <span className="text-[10px] text-slate-500 uppercase block">Precision</span>
                    <span className="text-lg font-bold text-teal-300">
                      {(selectedModel.metrics.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#060b08] border border-teal-400/30">
                    <span className="text-[10px] text-slate-500 uppercase block">Recall</span>
                    <span className="text-lg font-bold text-teal-300">
                      {(selectedModel.metrics.recall * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Training Configuration Table */}
              <div className="space-y-2 pt-2 border-t border-teal-500/15">
                <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold block">
                  Model Card Specifications
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#060b08] p-4 rounded-xl border border-teal-500/20">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ARCHITECTURE:</span>
                    <span className="text-slate-200">{selectedModel.architecture}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">BASE DATASET:</span>
                    <span className="text-slate-200">{selectedModel.dataset_name || selectedModel.dataset_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">EPOCHS:</span>
                    <span className="text-slate-200">{selectedModel.hyperparameters.epochs || 10}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">LEARNING RATE:</span>
                    <span className="text-slate-200">{selectedModel.hyperparameters.learning_rate || 0.001}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">OPTIMIZER:</span>
                    <span className="text-slate-200">{selectedModel.hyperparameters.optimizer || 'AdamW'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">LOSS CRITERION:</span>
                    <span className="text-slate-200">{selectedModel.hyperparameters.loss_function || 'Combined_BCE_Dice'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CREATION DATE:</span>
                    <span className="text-slate-200">{new Date(selectedModel.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">STATUS:</span>
                    <span className="text-emerald-400 font-bold uppercase">{selectedModel.status}</span>
                  </div>
                </div>
              </div>

              {/* Artifact File Info */}
              <div className="p-3.5 rounded-xl bg-[#07130e] border border-teal-500/20 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-400">
                  <HardDrive size={15} className="text-teal-400" />
                  <span className="truncate max-w-xs">{selectedModel.weights_path}</span>
                </div>
                <span className="text-slate-300 font-bold">
                  {(selectedModel.size_bytes / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#09100d]/90 border border-teal-500/20 p-12 text-center text-slate-400">
              Select a model version to inspect metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
