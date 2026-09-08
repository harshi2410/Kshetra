from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Point2D(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0.0 to 1.0) or pixel coordinate")
    y: float = Field(..., description="Normalized Y coordinate (0.0 to 1.0) or pixel coordinate")

class BBox2D(BaseModel):
    minX: float
    minY: float
    maxX: float
    maxY: float

class CLMLabel(BaseModel):
    id: str
    text: str
    bbox: BBox2D
    rotationAngle: float = 0.0
    confidence: float = 1.0
    category: Optional[str] = "PLOT_NUMBER" # PLOT_NUMBER, ROAD_NAME, DIMENSION, SURVEY_NO, OTHER

class CLMPath(BaseModel):
    id: str
    points: List[Point2D]
    isClosed: bool = False
    strokeWidth: float = 1.0
    color: Optional[str] = "#000000"

class CLMPolygon(BaseModel):
    id: str
    vertices: List[Point2D]
    calculatedAreaSqFt: Optional[float] = None
    labelHint: Optional[str] = None
    entityType: Optional[str] = "UNCLASSIFIED" # PLOT, ROAD, COMMON_AREA, AMENITY, BOUNDARY

class CLMRoadCandidate(BaseModel):
    id: str
    polyline: List[Point2D]
    widthMeters: Optional[float] = None
    roadName: Optional[str] = None

class CLMReferencePoint(BaseModel):
    id: str
    point: Point2D
    pointType: str # COMPASS_NORTH, ENTRANCE_GATE, BENCHMARK_CORNER, SURVEY_MARKER
    metadata: Optional[Dict[str, Any]] = None

class SourceFileMetadata(BaseModel):
    fileName: str
    format: str
    fileSizeBytes: int
    pagesCount: int = 1
    hasVectorStream: bool = False
    isScannedImage: bool = False
    recommendedParser: str

class CanonicalLayoutModel(BaseModel):
    """
    Root LandOS Canonical Layout Model (CLM / Layout IR).
    The universal intermediate representation produced by all parsers
    (PDF, Image, CAD, OCR) before spatial analysis or GeoJSON generation.
    """
    version: str = "1.0.0"
    sourceMetadata: SourceFileMetadata
    boundaries: List[CLMPolygon] = []
    roads: List[CLMRoadCandidate] = []
    closedPolygons: List[CLMPolygon] = []
    paths: List[CLMPath] = []
    labels: List[CLMLabel] = []
    symbols: List[CLMReferencePoint] = []
    dimensions: List[CLMLabel] = []
    referencePoints: List[CLMReferencePoint] = []
