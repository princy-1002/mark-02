/**
 * Type definitions for AI Model Lab (Satellite Dataset Upload & Model Training)
 */

export interface ComputeDeviceInfo {
  has_pytorch: boolean;
  cuda_available: boolean;
  device_type: 'cuda' | 'cpu';
  device_name: string;
  device_count: number;
  recommended_batch_size: number;
  fallback_message: string;
}

export interface ModelArchitectureConfig {
  id: string;
  name: string;
  task: string;
  description: string;
  input_channels: number;
  classes: number;
  default_epochs: number;
  default_batch_size: number;
  default_lr: number;
  is_available: boolean;
  requires_gpu: boolean;
  estimated_time_per_epoch_sec: number;
}

export interface ModelLabInfo {
  status: string;
  service: string;
  version: string;
  compute_device: ComputeDeviceInfo;
  available_architectures: ModelArchitectureConfig[];
  dataset_count: number;
  registered_models_count: number;
  total_jobs_count: number;
  disclaimer: string;
}

export interface DatasetSampleImage {
  name: string;
  dimensions?: string;
  has_mask: boolean;
  mask_name?: string;
  preview_url: string;
}

export interface DatasetInvalidFile {
  file: string;
  reason: string;
}

export interface DatasetSummary {
  dataset_id: string;
  name: string;
  description?: string;
  file_count: number;
  image_count: number;
  mask_count: number;
  size_bytes: number;
  dimensions?: string;
  formats: string[];
  has_labels: boolean;
  has_geospatial_metadata: boolean;
  crs?: string;
  created_at: string;
  status: 'ready' | 'processing' | 'error';
  sample_images: DatasetSampleImage[];
  invalid_files: DatasetInvalidFile[];
}

export interface DatasetPrepareRequest {
  dataset_id: string;
  train_split: number;
  val_split: number;
  test_split: number;
  normalization: 'min_max' | 'standard' | 'robust';
  spatial_grouping: boolean;
  augmentation: boolean;
}

export interface DatasetPrepareResponse {
  dataset_id: string;
  status: string;
  train_count: number;
  val_count: number;
  test_count: number;
  spatial_groups_count: number;
  label_coverage_pct: number;
  class_distribution: {
    stable_forest_canopy_pct: number;
    forest_loss_cleared_pct: number;
  };
  warnings: string[];
  message: string;
}

export interface ModelTrainingConfigRequest {
  dataset_id: string;
  model_name: string;
  architecture: string;
  task: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  optimizer: 'AdamW' | 'Adam' | 'SGD';
  loss_function: 'Combined_BCE_Dice' | 'BCE' | 'Dice';
  use_pretrained: boolean;
}

export interface LossPoint {
  epoch: number;
  train_loss: number;
  val_loss: number;
  val_iou?: number;
  val_dice?: number;
}

export interface ConfusionMatrix {
  true_positive: number;
  false_positive: number;
  true_negative: number;
  false_negative: number;
}

export interface QualitativeSample {
  sample_id: string;
  image_url: string;
  ground_truth_url?: string;
  prediction_url: string;
  difference_url: string;
  iou: number;
  dice: number;
}

export interface TrainingJobResponse {
  job_id: string;
  model_name: string;
  architecture: string;
  dataset_id: string;
  dataset_name?: string;
  status: 'queued' | 'training' | 'evaluating' | 'completed' | 'failed' | 'cancelled';
  progress_pct: number;
  current_epoch: number;
  total_epochs: number;
  current_train_loss?: number;
  current_val_loss?: number;
  loss_history: LossPoint[];
  metrics?: {
    iou: number;
    dice: number;
    f1_score: number;
    precision: number;
    recall: number;
    accuracy: number;
    specificity: number;
    confusion_matrix: ConfusionMatrix;
    sample_count: number;
    qualitative_samples: QualitativeSample[];
  };
  logs: string[];
  compute_device: string;
  created_at: string;
  updated_at: string;
  error_detail?: string;
  model_version_id?: string;
}

export interface ModelRegistryItem {
  model_id: string;
  version: string;
  name: string;
  architecture: string;
  task: string;
  dataset_id: string;
  dataset_name: string;
  hyperparameters: Record<string, any>;
  metrics: {
    iou: number;
    dice: number;
    precision: number;
    recall: number;
    accuracy: number;
  };
  weights_path: string;
  size_bytes: number;
  status: 'active' | 'archived' | 'training';
  created_at: string;
  description?: string;
}

export interface InferenceResultResponse {
  inference_id: string;
  model_id: string;
  model_version: string;
  model_name: string;
  image_name: string;
  original_image_url: string;
  mask_image_url: string;
  overlay_image_url: string;
  mask_download_url: string;
  total_area_ha?: number;
  total_pixels: number;
  forest_loss_pixels: number;
  forest_loss_pct: number;
  forest_loss_ha?: number;
  mean_confidence: number;
  is_georeferenced: boolean;
  crs?: string;
  severity_breakdown: {
    critical: number;
    high: number;
    moderate: number;
  };
  geojson?: Record<string, any>;
  execution_time_sec: number;
  created_at: string;
  disclaimer: string;
}

export type ModelLabTab =
  | 'datasets'
  | 'prepare'
  | 'configure'
  | 'training'
  | 'evaluation'
  | 'registry'
  | 'inference';
