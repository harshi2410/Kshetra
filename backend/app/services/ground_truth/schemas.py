from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class GroundTruthMetadata(BaseModel):
    """Metadata specification for Ground Truth Datasets (metadata.json)."""
    project_id: str
    layout_id: str
    version: str
    approval_date: str
    approved_by: str
    layout_version: int
    geometry_revision: int
    pipeline_version: str = "1.0.0"
    git_commit: str
    geometry_hash: str
    image_hash: str
    image_format: str
    plot_count: int
    road_count: int
    boundary_area: float
    ocr_element_count: int
    processing_time: float
    created_at: str
    created_by: str

class GroundTruthProcessingContext(BaseModel):
    """Runtime processing environment context (processing_context.json)."""
    pipeline_version: str = "1.0.0"
    engine_versions: Dict[str, str] = Field(default_factory=lambda: {
        "geos": "3.12.0", "shapely": "2.1.2", "opencv": "4.10.0", "pymupdf": "1.24.0", "tesseract": "5.3.0"
    })
    ocr_provider_used: str = "PyMuPDF+PyTesseract+EasyOCR"
    geometry_engine_version: str = "GEOS C++ Engine 2.1"
    preprocessing_settings: Dict[str, Any] = Field(default_factory=lambda: {
        "denoise_h": 10, "binarization_threshold": "Otsu", "target_dpi": 300
    })
    image_resolution: Dict[str, int] = Field(default_factory=lambda: {"width": 1920, "height": 1080})
    execution_time_seconds: float = 0.0

class GroundTruthManifest(BaseModel):
    """Cryptographic file manifest for data integrity validation (manifest.json)."""
    version: str
    files: List[str]
    hashes: Dict[str, str]

class GroundTruthVersionSummary(BaseModel):
    """DTO summarizing a single Ground Truth version."""
    version: str
    approvalDate: str
    approvedBy: str
    plotCount: int
    roadCount: int
    boundaryArea: float
    geometryHash: str
    imageHash: str
    isLatest: bool

class GroundTruthExportDTO(BaseModel):
    """DTO for Ground Truth exports."""
    projectId: str
    totalVersionsCount: int
    latestVersion: str
    versions: List[GroundTruthVersionSummary]
    downloadUrl: str
