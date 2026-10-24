/**
 * AI Model Lab API Service
 */

import { API_BASE_URL, apiFetch } from '../api/client';
import type {
  ModelLabInfo,
  ModelArchitectureConfig,
  DatasetSummary,
  DatasetPrepareRequest,
  DatasetPrepareResponse,
  ModelTrainingConfigRequest,
  TrainingJobResponse,
  ModelRegistryItem,
  InferenceResultResponse
} from '../types/modelLab';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
}

export const ModelLabService = {
  async getInfo(): Promise<ModelLabInfo> {
    return request<ModelLabInfo>('/api/model-lab/info');
  },

  async getArchitectures(): Promise<ModelArchitectureConfig[]> {
    return request<ModelArchitectureConfig[]>('/api/model-lab/architectures');
  },

  async getDatasets(): Promise<DatasetSummary[]> {
    return request<DatasetSummary[]>('/api/model-lab/datasets');
  },

  async getDataset(id: string): Promise<DatasetSummary> {
    return request<DatasetSummary>(`/api/model-lab/datasets/${encodeURIComponent(id)}`);
  },

  async deleteDataset(id: string): Promise<{ status: string; message: string }> {
    return request(`/api/model-lab/datasets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async uploadDataset(file: File, name?: string): Promise<DatasetSummary> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }

    return apiFetch<DatasetSummary>('/api/model-lab/datasets/upload', {
      method: 'POST',
      body: formData,
      timeoutMs: 60000,
    });
  },

  async prepareDataset(req: DatasetPrepareRequest): Promise<DatasetPrepareResponse> {
    return request<DatasetPrepareResponse>('/api/model-lab/datasets/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },

  async startTraining(config: ModelTrainingConfigRequest): Promise<TrainingJobResponse> {
    return request<TrainingJobResponse>('/api/model-lab/training/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  async getJobs(): Promise<TrainingJobResponse[]> {
    return request<TrainingJobResponse[]>('/api/model-lab/jobs');
  },

  async getJob(id: string): Promise<TrainingJobResponse> {
    return request<TrainingJobResponse>(`/api/model-lab/jobs/${encodeURIComponent(id)}`);
  },

  async cancelJob(id: string): Promise<{ status: string; message: string }> {
    return request(`/api/model-lab/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  },

  async getModels(): Promise<ModelRegistryItem[]> {
    return request<ModelRegistryItem[]>('/api/model-lab/models');
  },

  async getModel(id: string): Promise<ModelRegistryItem> {
    return request<ModelRegistryItem>(`/api/model-lab/models/${encodeURIComponent(id)}`);
  },

  async deleteModel(id: string): Promise<{ status: string; message: string }> {
    return request(`/api/model-lab/models/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async runInference(params: {
    file?: File;
    sampleName?: string;
    modelId: string;
    confidenceThreshold: number;
  }): Promise<InferenceResultResponse> {
    const formData = new FormData();
    if (params.file) {
      formData.append('file', params.file);
    }
    if (params.sampleName) {
      formData.append('sample_name', params.sampleName);
    }
    formData.append('model_id', params.modelId);
    formData.append('confidence_threshold', params.confidenceThreshold.toString());

    return apiFetch<InferenceResultResponse>('/api/model-lab/inference/predict', {
      method: 'POST',
      body: formData,
      timeoutMs: 60000,
    });
  },

  getAssetUrl(relativePath: string): string {
    const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${API_BASE_URL}${normalized}`;
  }
};
