import React, { useState, useEffect, useRef } from 'react';
import type { TrainingJobResponse } from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { Button } from '../common/Button';
import { 
  Square, 
  Terminal, 
  Activity, 
  TrendingDown, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface TrainingJobDashboardProps {
  jobs: TrainingJobResponse[];
  activeJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onRefreshJobs: () => void;
  onGoToEvaluation: (job: TrainingJobResponse) => void;
}

export const TrainingJobDashboard: React.FC<TrainingJobDashboardProps> = ({
  jobs,
  activeJobId,
  onSelectJob,
  onRefreshJobs,
  onGoToEvaluation,
}) => {
  const selectedJob = jobs.find((j) => j.job_id === activeJobId) || jobs[0] || null;
  const [polledJob, setPolledJob] = useState<TrainingJobResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Active job is the polled job (if matching active ID) or selected from props
  const currentJob = (polledJob && polledJob.job_id === selectedJob?.job_id) ? polledJob : selectedJob;

  // Polling hook while job is active
  useEffect(() => {
    if (!currentJob) return;
    const isRunning = currentJob.status === 'training' || currentJob.status === 'queued' || currentJob.status === 'evaluating';
    if (!isRunning) return;

    const interval = setInterval(async () => {
      try {
        const updated = await ModelLabService.getJob(currentJob.job_id);
        setPolledJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
          onRefreshJobs();
        }
      } catch {
        // quiet poll fail
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [currentJob?.job_id, currentJob?.status, onRefreshJobs]);

  // Auto-scroll terminal logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentJob?.logs]);

  const handleCancelJob = async () => {
    if (!currentJob) return;
    setCancelling(true);
    try {
      await ModelLabService.cancelJob(currentJob.job_id);
      const updated = await ModelLabService.getJob(currentJob.job_id);
      setPolledJob(updated);
      onRefreshJobs();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  if (!currentJob) {
    return (
      <div className="rounded-2xl bg-[#09100d]/90 border border-teal-500/20 p-12 text-center">
        <Activity size={40} className="mx-auto text-teal-400/50 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Training Jobs Found</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Start a new training run from the Configure Model tab using the Western Ghats benchmark or your uploaded dataset.
        </p>
      </div>
    );
  }

  const lossHistory = currentJob.loss_history || [];
  const maxLoss = lossHistory.length > 0 ? Math.max(...lossHistory.map((l) => Math.max(l.train_loss, l.val_loss)), 0.8) : 1.0;
  const minLoss = lossHistory.length > 0 ? Math.min(...lossHistory.map((l) => Math.min(l.train_loss, l.val_loss)), 0.05) : 0.0;
  const lossRange = Math.max(0.1, maxLoss - minLoss);

  return (
    <div className="space-y-6">
      {/* Job Header & Status Bar */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-6 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-teal-500/15">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${
                currentJob.status === 'training'
                  ? 'bg-sky-400 animate-ping'
                  : currentJob.status === 'completed'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : currentJob.status === 'cancelled'
                  ? 'bg-amber-400'
                  : 'bg-red-400'
              }`} />
              <h3 className="text-base font-bold text-slate-100 font-mono">
                {currentJob.model_name}
              </h3>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase ${
                currentJob.status === 'training'
                  ? 'bg-sky-950 text-sky-300 border-sky-400/50 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : currentJob.status === 'completed'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  : currentJob.status === 'cancelled'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                  : 'bg-red-950 text-red-300 border-red-500/50'
              }`}>
                {currentJob.status}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Job ID: {currentJob.job_id}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1 font-sans">
              Architecture: <span className="font-mono text-slate-300">{currentJob.architecture}</span> • Dataset: <span className="font-mono text-slate-300">{currentJob.dataset_id}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Job Switcher if multiple */}
            {jobs.length > 1 && (
              <select
                value={currentJob.job_id}
                onChange={(e) => onSelectJob(e.target.value)}
                className="bg-[#060b08] border border-teal-500/30 text-xs font-mono text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-400"
              >
                {jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.model_name} ({j.status})
                  </option>
                ))}
              </select>
            )}

            {currentJob.status === 'training' && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelJob}
                isLoading={cancelling}
                icon={<Square size={13} />}
              >
                Cancel Training
              </Button>
            )}

            {currentJob.status === 'completed' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onGoToEvaluation(currentJob)}
                icon={<ArrowRight size={14} />}
              >
                Inspect Evaluation
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar & Telemetry */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-2">
              <Activity size={14} className="text-sky-400" />
              Epoch {currentJob.current_epoch} of {currentJob.total_epochs}
            </span>
            <span className="text-sky-400 font-bold">{currentJob.progress_pct}% Completed</span>
          </div>

          <div className="h-3 rounded-full bg-slate-900 overflow-hidden border border-teal-500/30 p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
              style={{ width: `${currentJob.progress_pct}%` }}
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-teal-500/15 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-[#060b08] border border-teal-500/20">
              <span className="text-slate-500 text-[10px] block">TRAIN LOSS</span>
              <span className="text-sm font-bold text-sky-300">
                {currentJob.current_train_loss !== null && currentJob.current_train_loss !== undefined
                  ? currentJob.current_train_loss.toFixed(4)
                  : '--'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060b08] border border-teal-500/20">
              <span className="text-slate-500 text-[10px] block">VALIDATION LOSS</span>
              <span className="text-sm font-bold text-teal-300">
                {currentJob.current_val_loss !== null && currentJob.current_val_loss !== undefined
                  ? currentJob.current_val_loss.toFixed(4)
                  : '--'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060b08] border border-teal-500/20">
              <span className="text-slate-500 text-[10px] block">VALIDATION IOU</span>
              <span className="text-sm font-bold text-emerald-400">
                {lossHistory.length > 0 && lossHistory[lossHistory.length - 1].val_iou !== undefined
                  ? (lossHistory[lossHistory.length - 1].val_iou! * 100).toFixed(1) + '%'
                  : '--'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#060b08] border border-teal-500/20">
              <span className="text-slate-500 text-[10px] block">COMPUTE DEVICE</span>
              <span className="text-sm font-bold text-slate-200 truncate block">
                {currentJob.compute_device || 'CPU'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Loss Curve Graph & Interactive Log Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real Loss Curve Plot (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-5 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-teal-500/15">
            <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
              <TrendingDown size={14} />
              Epoch Convergence Loss Curves
            </h4>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-1 rounded bg-sky-400 inline-block" />
                Train Loss
              </span>
              <span className="flex items-center gap-1.5 text-teal-300">
                <span className="w-2.5 h-1 rounded bg-teal-300 inline-block" />
                Val Loss
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="h-64 mt-4 w-full relative flex items-center justify-center bg-[#050b07] rounded-xl border border-teal-500/20 p-2">
            {lossHistory.length === 0 ? (
              <p className="text-xs font-mono text-slate-500">
                Waiting for Epoch 1 loss backpropagation pass...
              </p>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="30" y1="20" x2="490" y2="20" stroke="#12251d" strokeDasharray="3 3" />
                <line x1="30" y1="70" x2="490" y2="70" stroke="#12251d" strokeDasharray="3 3" />
                <line x1="30" y1="120" x2="490" y2="120" stroke="#12251d" strokeDasharray="3 3" />
                <line x1="30" y1="170" x2="490" y2="170" stroke="#12251d" strokeDasharray="3 3" />

                {/* Y Axis Labels */}
                <text x="5" y="25" fill="#64748b" fontSize="9" fontFamily="monospace">
                  {maxLoss.toFixed(2)}
                </text>
                <text x="5" y="175" fill="#64748b" fontSize="9" fontFamily="monospace">
                  {minLoss.toFixed(2)}
                </text>

                {/* Train Loss Path */}
                {(() => {
                  const points = lossHistory.map((pt, i) => {
                    const x = 35 + (i / Math.max(1, lossHistory.length - 1)) * 450;
                    const normY = (pt.train_loss - minLoss) / lossRange;
                    const y = 175 - normY * 150;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Val Loss Path */}
                {(() => {
                  const points = lossHistory.map((pt, i) => {
                    const x = 35 + (i / Math.max(1, lossHistory.length - 1)) * 450;
                    const normY = (pt.val_loss - minLoss) / lossRange;
                    const y = 175 - normY * 150;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polyline
                      fill="none"
                      stroke="#2dd4bf"
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                      strokeDasharray="4 2"
                    />
                  );
                })()}

                {/* Data Points */}
                {lossHistory.map((pt, i) => {
                  const x = 35 + (i / Math.max(1, lossHistory.length - 1)) * 450;
                  const normYTrain = (pt.train_loss - minLoss) / lossRange;
                  const yTrain = 175 - normYTrain * 150;

                  const normYVal = (pt.val_loss - minLoss) / lossRange;
                  const yVal = 175 - normYVal * 150;

                  return (
                    <g key={i}>
                      <circle cx={x} cy={yTrain} r="3.5" fill="#38bdf8" />
                      <circle cx={x} cy={yVal} r="3.5" fill="#2dd4bf" />
                      <text x={x - 8} y="200" fill="#64748b" fontSize="8" fontFamily="monospace">
                        E{pt.epoch}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <p className="text-[11px] text-slate-500 font-mono mt-3">
            Loss curves are generated directly from genuine PyTorch forward-backward gradient evaluations across each training epoch.
          </p>
        </div>

        {/* Live Logs Terminal (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#0e1b15]/90 to-[#09100d]/90 border border-teal-500/25 p-5 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-teal-500/15">
              <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold flex items-center gap-2">
                <Terminal size={14} />
                Live Worker Console Logs
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                {currentJob.logs.length} lines
              </span>
            </div>

            <div className="h-64 mt-3 bg-[#040805] rounded-xl border border-teal-500/20 p-3 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
              {currentJob.logs.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line.includes('ERROR') ? (
                    <span className="text-red-400 font-bold">{line}</span>
                  ) : line.includes('Epoch') ? (
                    <span className="text-sky-300">{line}</span>
                  ) : line.includes('registered') || line.includes('complete') ? (
                    <span className="text-emerald-400 font-bold">{line}</span>
                  ) : (
                    <span className="text-slate-400">{line}</span>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          <div className="pt-3 border-t border-teal-500/15 mt-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">
              Live updates via reactive polling
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshJobs}
              icon={<RefreshCw size={12} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
