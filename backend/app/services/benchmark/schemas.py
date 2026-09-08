from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

class BenchmarkThresholds(BaseModel):
    min_plot_iou: float = Field(0.85, description="Minimum IoU for a plot to be considered a match")
    min_boundary_iou: float = Field(0.90, description="Minimum IoU for project boundary")
    min_ocr_recall: float = Field(0.80, description="Minimum recall for OCR text extraction")
    min_label_association_accuracy: float = Field(0.85, description="Minimum accuracy for label association")

class GeometryMetrics(BaseModel):
    boundary_iou: float
    boundary_area_error_percent: float
    boundary_perimeter_error_percent: float
    is_valid: bool
    containment_failures: int

class PlotMetrics(BaseModel):
    ground_truth_count: int
    predicted_count: int
    matched_count: int
    missing_count: int
    extra_count: int
    merged_count: int
    duplicated_count: int
    mean_iou: float
    median_iou: float
    mean_centroid_error: float
    mean_area_error_percent: float

class RoadMetrics(BaseModel):
    ground_truth_count: int
    predicted_count: int
    road_overlap_iou: float
    length_error_percent: float
    connectivity_accuracy: float

class OCRMetrics(BaseModel):
    precision: float
    recall: float
    f1_score: float
    exact_match_ratio: float
    normalized_match_ratio: float
    mean_levenshtein_distance: float
    wer: float

class LabelAssociationMetrics(BaseModel):
    total_labels: int
    associated_correctly: int
    incorrectly_associated: int
    unassociated: int
    accuracy: float

class BenchmarkResult(BaseModel):
    project_id: str
    ground_truth_version: str
    pipeline_version: str
    git_commit: str
    processing_time_ms: float
    peak_memory_kb: float
    
    geometry: GeometryMetrics
    plots: PlotMetrics
    roads: RoadMetrics
    ocr: OCRMetrics
    label_association: LabelAssociationMetrics
    
    failure_categories: List[str]
    is_production_acceptable: bool
    stage_evidence: Dict[str, Any]
