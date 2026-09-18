from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

from datetime import datetime

class LayoutFileMetadata(BaseModel):
    name: str
    size: int
    type: str

class ProjectCreate(BaseModel):
    # Step 1: Identity & Type
    name: str = Field(..., min_length=2, description="Project registration name")
    developer: str = Field(..., min_length=2, description="Legal developer entity name")
    type: str = Field(..., description="Project type (e.g. Residential, Commercial)")
    landClassification: str = Field(..., description="Land classification (e.g. N.A. Residential)")
    description: Optional[str] = None

    # Step 2: Location, Survey & Geo Identity
    state: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    taluka: str = Field(..., min_length=2)
    cityVillage: str = Field(..., min_length=2)
    pincode: str = Field(..., min_length=6, max_length=6)
    surveyNumbers: List[str] = Field(default_factory=list, description="Array of survey/gut numbers")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    approvingAuthority: Optional[str] = None
    reraNo: Optional[str] = None

    # Step 3: Commercial Baseline & Land Metrics
    grossArea: float = Field(..., gt=0, description="Gross land area number")
    areaUnit: str = Field(..., description="Measurement unit (Acres, Sq. Ft., Gunta, Hectares)")
    baseRatePerSqFt: Optional[float] = None
    priceMin: Optional[float] = None
    priceMax: Optional[float] = None
    startDate: Optional[str] = None
    expectedCompletion: Optional[str] = None

    # Step 4: Master Layout Blueprint & Scale
    knownScale: Optional[str] = "Not specified"
    scaleRatio: Optional[str] = None
    status: Optional[str] = "DRAFT"
    layoutUploaded: bool = False
    layoutFile: Optional[LayoutFileMetadata] = None

    @field_validator('surveyNumbers')
    def validate_survey_numbers(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one Survey / Gut / Khasra number is required")
        return [s.strip() for s in v if s.strip()]

class LocationDetailsResponse(BaseModel):
    state: str
    district: str
    taluka: str
    cityVillage: str
    pincode: str
    surveyNumbers: List[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    approvingAuthority: Optional[str] = None
    reraNo: Optional[str] = None

class LandDetailsResponse(BaseModel):
    grossArea: Optional[float] = None
    areaUnit: str
    baseRatePerSqFt: Optional[float] = None
    priceMin: Optional[float] = None
    priceMax: Optional[float] = None

class ProcessingArtifactResponse(BaseModel):
    id: str
    projectId: str
    jobId: str
    artifactType: str
    mimeType: str = "application/json"
    contentJson: Optional[str] = None
    filePath: Optional[str] = None
    createdAt: str

class ProcessingJobResponse(BaseModel):
    id: str
    projectId: str
    layoutSourceId: str
    status: str  # QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    stage: str   # INSPECTION, EXTRACTION, GEOMETRY_NORMALIZATION, PERSISTENCE
    progressPercentage: int = 0
    errorMessage: Optional[str] = None
    resultSummary: Optional[str] = None
    createdAt: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None

class VectorExtractionStats(BaseModel):
    pages: int = 0
    totalOperators: int = 0
    totalPrimitives: int = 0
    lines: int = 0
    curves: int = 0
    rectangles: int = 0
    closedPolygons: int = 0
    polylines: int = 0
    ignoredOperators: int = 0
    unsupportedOperators: int = 0
    warnings: List[str] = []

class VectorExtractionResponse(BaseModel):
    layoutId: str
    status: str
    stage: str
    progress: int
    statistics: VectorExtractionStats

class GeometryNormalizationStats(BaseModel):
    pages: int = 0
    rawPrimitivesCount: int = 0
    normalizedPrimitivesCount: int = 0
    duplicateRemovals: int = 0
    mergedSegments: int = 0
    repairedPolygons: int = 0
    linesCount: int = 0
    curvesCount: int = 0
    rectanglesCount: int = 0
    closedPolygonsCount: int = 0
    polylinesCount: int = 0
    warnings: List[str] = []

class GeometryNormalizationResponse(BaseModel):
    layoutId: str
    status: str
    stage: str
    progress: int
    statistics: GeometryNormalizationStats




class LayoutSourceResponse(BaseModel):
    id: str
    projectId: str
    fileName: str
    filePath: str
    fileSize: int
    fileType: str
    mimeType: Optional[str] = "application/pdf"
    scaleRatio: Optional[str] = "Not specified"
    uploadStatus: str = "UPLOADED"
    uploadedAt: str
    activeJob: Optional[ProcessingJobResponse] = None

class LayoutSourceDetailResponse(LayoutSourceResponse):
    processingJobs: List[ProcessingJobResponse] = []
    artifacts: List[ProcessingArtifactResponse] = []

class ProjectResponse(BaseModel):
    id: str
    name: str
    type: str
    landClassification: str
    status: str
    location: str
    developer: str
    description: Optional[str] = ""

    # Derived stats start at 0 until layout engine parses blueprint
    totalPlots: int = 0
    availablePlots: int = 0
    soldPlots: int = 0
    reservedPlots: int = 0
    blockedPlots: int = 0
    revenue: float = 0.0

    locationDetails: LocationDetailsResponse
    landDetails: LandDetailsResponse

    totalArea: str
    priceRange: str
    startDate: Optional[str] = None
    expectedCompletion: Optional[str] = None
    thumbnail: Optional[str] = None

    layoutUploaded: bool = False
    layoutSource: Optional[LayoutSourceResponse] = None

    createdAt: str
    updatedAt: str

class ProjectCreateResponse(BaseModel):
    id: str
    name: str
    status: str
    layoutUploaded: bool
    createdAt: str
    message: str = "Project created successfully"

class CLMBuildResponse(BaseModel):
    status: str
    stage: str
    progress: int
    layoutId: str
    statistics: Dict[str, Any]


class PlotUpdate(BaseModel):

    status: Optional[str] = None
    notes: Optional[str] = None
    customerId: Optional[str] = None
    reservationDate: Optional[str] = None
    basePrice: Optional[float] = None


class PlotBookingCreate(BaseModel):

    customerName: str
    customerPhone: str
    customerEmail: Optional[str] = None
    customerAddress: Optional[str] = None
    bookingDate: Optional[str] = None
    totalAmount: Optional[float] = None
    bookingAmount: float
    paidAmount: Optional[float] = None
    paymentStatus: Optional[str] = "PARTIAL"
    paymentMethod: Optional[str] = "UPI"
    transactionId: Optional[str] = None
    notes: Optional[str] = None


class PlotBookingUpdate(BaseModel):
    customerName: Optional[str] = None
    customerPhone: Optional[str] = None
    customerEmail: Optional[str] = None
    customerAddress: Optional[str] = None
    bookingDate: Optional[str] = None
    bookingAmount: Optional[float] = None
    paidAmount: Optional[float] = None
    paymentStatus: Optional[str] = None
    paymentMethod: Optional[str] = None
    transactionId: Optional[str] = None
    notes: Optional[str] = None
    bookingStatus: Optional[str] = None


class PlotBookingResponse(BaseModel):
    id: str
    projectId: str
    plotId: str
    plotNumber: Optional[str] = None
    customerName: str
    customerPhone: str
    customerEmail: Optional[str] = None
    customerAddress: Optional[str] = None
    bookingDate: str
    totalAmount: float
    bookingAmount: float
    paidAmount: float
    remainingAmount: float
    paymentStatus: str
    paymentMethod: str
    transactionId: Optional[str] = None
    notes: Optional[str] = None
    bookingStatus: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class PlotResponse(BaseModel):
    id: str
    projectId: str
    layoutSourceId: Optional[str] = None
    plotNumber: str
    polygonGeojson: str
    calculatedAreaSqFt: Optional[float] = None
    facingDirection: Optional[str] = "NORTH"
    centroidX: Optional[float] = None
    centroidY: Optional[float] = None
    status: str = "AVAILABLE"
    basePrice: Optional[float] = None
    notes: Optional[str] = None
    customerId: Optional[str] = None
    reservationDate: Optional[str] = None
    updatedAt: Optional[str] = None
    dimensions: Optional[str] = None
    roadName: Optional[str] = None
    isCorner: Optional[bool] = False
    activeBooking: Optional[PlotBookingResponse] = None




