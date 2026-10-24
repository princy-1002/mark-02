import React, { useState, useEffect, useCallback } from 'react';
import type { 
  ModelLabTab, 
  DatasetSummary, 
  ModelArchitectureConfig, 
  ComputeDeviceInfo, 
  TrainingJobResponse, 
  ModelRegistryItem
} from '../../types/modelLab';
import { ModelLabService } from '../../services/modelLabService';
import { formatApiErrorMessage, API_BASE_URL } from '../../api/client';
import { DatasetUploadCard } from '../modelLab/DatasetUploadCard';
import { DatasetPreparePanel } from '../modelLab/DatasetPreparePanel';
import { ModelConfigurePanel } from '../modelLab/ModelConfigurePanel';
import { TrainingJobDashboard } from '../modelLab/TrainingJobDashboard';
import { EvaluationView } from '../modelLab/EvaluationView';
import { ModelRegistryView } from '../modelLab/ModelRegistryView';
import { InferenceWorkspace } from '../modelLab/InferenceWorkspace';
import { Button } from '../common/Button';
import { 
  BrainCircuit, 
  Layers, 
  Sliders, 
  Play, 
  BarChart2, 
  Database, 
  Scan, 
  ArrowLeft, 
  Cpu, 
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface AiModelLabViewProps {
  onBackToOverview: () => void;
}

export const AiModelLabView: React.FC<AiModelLabViewProps> = ({
  onBackToOverview,
}) => {
  const [activeTab, setActiveTab] = useState<ModelLabTab>('datasets');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineMessage, setOfflineMessage] = useState<string>('');

  // Data states
  const [deviceInfo, setDeviceInfo] = useState<ComputeDeviceInfo | null>(null);
  const [architectures, setArchitectures] = useState<ModelArchitectureConfig[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('ds-western-ghats-benchmark');
  const [jobs, setJobs] = useState<TrainingJobResponse[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [preselectedInferenceModelId, setPreselectedInferenceModelId] = useState<string>('');

  // Fetch all initial data
  const loadPlatformData = useCallback(async () => {
    setIsLoading(true);
    setIsOffline(false);
    try {
      const [info, archs, dsets, jobList, modelList] = await Promise.all([
        ModelLabService.getInfo(),
        ModelLabService.getArchitectures(),
        ModelLabService.getDatasets(),
        ModelLabService.getJobs(),
        ModelLabService.getModels(),
      ]);

      setDeviceInfo(info.compute_device);
      setArchitectures(archs);
      setDatasets(dsets);
      setJobs(jobList);
      setModels(modelList);

      if (dsets.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dsets[0].dataset_id);
      }
      if (jobList.length > 0 && !activeJobId) {
        setActiveJobId(jobList[0].job_id);
      }
    } catch (err: any) {
      setIsOffline(true);
      setOfflineMessage(formatApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, activeJobId]);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  const selectedDataset = datasets.find((d) => d.dataset_id === selectedDatasetId) || datasets[0] || null;
  const activeJob = jobs.find((j) => j.job_id === activeJobId) || jobs[0] || null;

  const tabItems = [
    { id: 'datasets' as const, label: '1. Datasets', icon: <Database size={15} />, badge: datasets.length },
    { id: 'prepare' as const, label: '2. Prepare Dataset', icon: <Sliders size={15} /> },
    { id: 'configure' as const, label: '3. Configure Model', icon: <Cpu size={15} /> },
    { id: 'training' as const, label: '4. Training Jobs', icon: <Play size={15} />, badge: jobs.filter(j => j.status === 'training').length || undefined },
    { id: 'evaluation' as const, label: '5. Evaluation', icon: <BarChart2 size={15} /> },
    { id: 'registry' as const, label: '6. Model Registry', icon: <Layers size={15} />, badge: models.length },
    { id: 'inference' as const, label: '7. Test Predictions', icon: <Scan size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Mission Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#0a1510] via-[#0d1e16] to-[#09120e] border border-teal-500/25 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToOverview}
            className="p-2 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition-all shrink-0"
            title="Back to Overview"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-400/50 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            <BrainCircuit size={22} className="animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-sans tracking-tight m-0">
                AI Model Lab
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-400/50 font-mono font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(56,189,248,0.25)]">
                <Sparkles size={11} /> PYTORCH DEEP LEARNING
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Satellite dataset ingestion • Spatial leakage prevention • Real neural network training • Version registry
            </p>
          </div>
        </div>

        {/* System Telemetry & Refresh Action */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#060c09] border border-teal-500/25 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'}`} />
            <span className="text-slate-300">
              {isOffline ? 'ML Engine Offline' : deviceInfo?.device_name || 'Compute Active'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadPlatformData}
            isLoading={isLoading}
            icon={<RefreshCw size={13} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Offline Alert Banner if backend is not running */}
      {isOffline && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-xs font-sans text-red-200 flex flex-col sm:flex-row items-start justify-between gap-3 shadow-[0_0_16px_rgba(239,68,68,0.2)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-red-100 font-mono">Backend Service Unavailable</h4>
              <p className="text-red-200/90 leading-relaxed">
                {offlineMessage}
              </p>
              <div className="text-[11px] font-mono text-slate-300 pt-1 flex flex-wrap items-center gap-2">
                <span>Start backend locally: <code className="bg-black/60 px-2 py-0.5 rounded text-sky-300">py -m uvicorn backend.main:app --port 8000</code></span>
                {API_BASE_URL && (
                  <span className="text-slate-400">• Configured URL: <code className="bg-black/60 px-2 py-0.5 rounded text-emerald-300">{API_BASE_URL}</code></span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPlatformData}
            isLoading={isLoading}
            icon={<RefreshCw size={13} />}
            className="shrink-0 border-red-500/40 hover:bg-red-900/30 text-red-200"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Stage Tab Navigation */}
      <div className="border-b border-teal-500/20 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max pb-2">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-950/80 to-teal-950/80 text-sky-200 border border-sky-400/80 shadow-[0_0_14px_rgba(56,189,248,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1813]/60 border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-500'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-sky-400 text-slate-950 font-bold' : 'bg-teal-950 text-teal-300 border border-teal-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Workspaces */}
      <div className="pt-2">
        {activeTab === 'datasets' && (
          <DatasetUploadCard
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={(id) => setSelectedDatasetId(id)}
            onDatasetUploaded={loadPlatformData}
            onGoToPrepare={(id) => {
              setSelectedDatasetId(id);
              setActiveTab('prepare');
            }}
          />
        )}

        {activeTab === 'prepare' && (
          <DatasetPreparePanel
            dataset={selectedDataset}
            onPrepareSuccess={(_res) => {
              loadPlatformData();
            }}
            onGoToTrain={(id) => {
              setSelectedDatasetId(id);
              setActiveTab('configure');
            }}
          />
        )}

        {activeTab === 'configure' && (
          <ModelConfigurePanel
            dataset={selectedDataset}
            architectures={architectures}
            deviceInfo={deviceInfo}
            onTrainingStarted={(job) => {
              setJobs((prev) => [job, ...prev]);
              setActiveJobId(job.job_id);
              setActiveTab('training');
            }}
          />
        )}

        {activeTab === 'training' && (
          <TrainingJobDashboard
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={(id) => setActiveJobId(id)}
            onRefreshJobs={loadPlatformData}
            onGoToEvaluation={(job) => {
              setActiveJobId(job.job_id);
              setActiveTab('evaluation');
            }}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView
            job={activeJob}
            onGoToInference={(modelId) => {
              setPreselectedInferenceModelId(modelId);
              setActiveTab('inference');
            }}
            onGoToRegistry={() => setActiveTab('registry')}
          />
        )}

        {activeTab === 'registry' && (
          <ModelRegistryView
            models={models}
            onSelectForInference={(modelId) => {
              setPreselectedInferenceModelId(modelId);
              setActiveTab('inference');
            }}
            onRefreshModels={loadPlatformData}
          />
        )}

        {activeTab === 'inference' && (
          <InferenceWorkspace
            models={models}
            preselectedModelId={preselectedInferenceModelId}
            onGoToTrain={() => setActiveTab('configure')}
          />
        )}
      </div>
    </div>
  );
};
export default AiModelLabView;
