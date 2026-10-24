"""
Pydantic Schemas for CL-01 AI Model Lab
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

class DatasetSummary(BaseModel):
    dataset_id: str
    name: str
    description: Optional[str] = None
    file_count: int = 0
    image_count: int = 0
    mask_count: int = 0
    size_bytes: int = 0
    dimensions: Optional[str] = None
    formats: List[str] = Field(default_factory=list)
    has_labels: bool = False
    has_geospatial_metadata: bool = False
    crs: Optional[str] = None
    created_at: str
    status: str = "ready"  # ready, processing, error
    sample_images: List[Dict[str, Any]] = Field(default_factory=list)
    invalid_files: List[Dict[str, str]] = Field(default_factory=list)

class DatasetPrepareRequest(BaseModel):
    dataset_id: str
    train_split: float = Field(0.70, ge=0.4, le=0.9, description="Training partition ratio")
    val_split: float = Field(0.15, ge=0.05, le=0.4, description="Validation partition ratio")
    test_split: float = Field(0.15, ge=0.05, le=0.4, description="Test partition ratio")
    normalization: Literal["min_max", "standard", "robust"] = "min_max"
    spatial_grouping: bool = Field(True, description="Group overlapping scene tiles to prevent data leakage")
    augmentation: bool = Field(True, description="Enable rotation/flips during training")

class DatasetPrepareResponse(BaseModel):
    dataset_id: str
    status: str
    train_count: int
    val_count: int
    test_count: int
    spatial_groups_count: int
    label_coverage_pct: float
    class_distribution: Dict[str, float]
    warnings: List[str] = Field(default_factory=list)
    message: str

class ModelTrainingConfigRequest(BaseModel):
    dataset_id: str
    model_name: str = Field("ForestLoss-UNet-Custom", min_length=2, max_length=60)
    architecture: str = Field("unet_satellite_v1", description="Model architecture identifier")
    task: str = Field("forest_loss_segmentation", description="Task type")
    epochs: int = Field(10, ge=1, le=50, description="Training epochs")
    batch_size: int = Field(4, ge=1, le=32, description="Batch size")
    learning_rate: float = Field(0.001, ge=1e-5, le=0.1, description="Learning rate")
    optimizer: Literal["AdamW", "Adam", "SGD"] = "AdamW"
    loss_function: Literal["Combined_BCE_Dice", "BCE", "Dice"] = "Combined_BCE_Dice"
    use_pretrained: bool = Field(False, description="Initialize with pre-trained feature representations")

class LossPoint(BaseModel):
    epoch: int
    train_loss: float
    val_loss: float
    val_iou: Optional[float] = None
    val_dice: Optional[float] = None

class TrainingJobResponse(BaseModel):
    job_id: str
    model_name: str
    architecture: str
    dataset_id: str
    dataset_name: Optional[str] = None
    status: str  # queued, training, evaluating, completed, failed, cancelled
    progress_pct: int = 0
    current_epoch: int = 0
    total_epochs: int = 10
    current_train_loss: Optional[float] = None
    current_val_loss: Optional[float] = None
    loss_history: List[LossPoint] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
    logs: List[str] = Field(default_factory=list)
    compute_device: str = "cpu"
    created_at: str
    updated_at: str
    error_detail: Optional[str] = None
    model_version_id: Optional[str] = None

class ConfusionMatrix(BaseModel):
    true_positive: int
    false_positive: int
    true_negative: int
    false_negative: int

class QualitativeSample(BaseModel):
    sample_id: str
    image_url: str
    ground_truth_url: Optional[str] = None
    prediction_url: str
    difference_url: str
    iou: float
    dice: float

class EvaluationMetricsResponse(BaseModel):
    model_id: str
    model_version: str
    model_name: str
    architecture: str
    dataset_id: str
    dataset_name: str
    evaluation_split: str
    sample_count: int
    iou: float
    dice: float
    f1_score: float
    precision: float
    recall: float
    accuracy: float
    specificity: float
    confusion_matrix: ConfusionMatrix
    loss_history: List[LossPoint] = Field(default_factory=list)
    qualitative_samples: List[QualitativeSample] = Field(default_factory=list)
    class_imbalance_ratio: str
    evaluation_timestamp: str
    status: str = "completed"

class ModelRegistryItem(BaseModel):
    model_id: str
    version: str
    name: str
    architecture: str
    task: str
    dataset_id: str
    dataset_name: str
    hyperparameters: Dict[str, Any]
    metrics: Dict[str, float]
    weights_path: str
    size_bytes: int
    status: str  # active, archived, training
    created_at: str
    description: Optional[str] = None

class InferenceResultResponse(BaseModel):
    inference_id: str
    model_id: str
    model_version: str
    model_name: str
    image_name: str
    original_image_url: str
    mask_image_url: str
    overlay_image_url: str
    mask_download_url: str
    total_area_ha: Optional[float] = None
    total_pixels: int
    forest_loss_pixels: int
    forest_loss_pct: float
    forest_loss_ha: Optional[float] = None
    mean_confidence: float
    is_georeferenced: bool
    crs: Optional[str] = None
    severity_breakdown: Dict[str, int]
    geojson: Optional[Dict[str, Any]] = None
    execution_time_sec: float
    created_at: str
    disclaimer: str = (
        "Model prediction is an automated statistical estimate intended for environmental "
        "monitoring and analyst triage. Ground verification is required before legal confirmation."
    )
