from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.schemas.project import (
    ProjectCreate, ProjectResponse, LayoutSourceResponse, LayoutSourceDetailResponse,
    ProcessingJobResponse, ProcessingArtifactResponse, VectorExtractionResponse,
    GeometryNormalizationResponse, CLMBuildResponse, PlotResponse, PlotUpdate,
    PlotBookingCreate, PlotBookingUpdate, PlotBookingResponse
)
from app.api.v1.endpoints.ai_pipeline import execute_ai_pipeline_job


from app.services.project_service import project_service_instance

router = APIRouter()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary="Create a new project transactionally in PostgreSQL")
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    """
    Creates a new project record.
    Executes an atomic PostgreSQL transaction inserting across 6 normalized tables:
    projects -> project_locations -> project_surveys -> project_commercials -> project_legal -> layout_sources
    """
    try:
        created_project = project_service_instance.create_project(db, project_in)
        return created_project
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create project in database: {str(e)}"
        )

@router.get("", response_model=List[ProjectResponse], summary="List all projects from PostgreSQL")
def get_projects(db: Session = Depends(get_db)):
    """
    Returns all projects stored in PostgreSQL for the portfolio view.
    """
    return project_service_instance.get_projects(db)

@router.get("/{project_id}", response_model=ProjectResponse, summary="Get project by ID from PostgreSQL")
def get_project_by_id(project_id: str, db: Session = Depends(get_db)):
    """
    Retrieves project details by ID joined from PostgreSQL tables for Project Workspace rendering.
    """
    project = project_service_instance.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in database"
        )
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project permanently from PostgreSQL")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """
    Permanently deletes a project and all associated layout sources, jobs, artifacts, and plot records from PostgreSQL.
    """
    deleted = project_service_instance.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in database"
        )
    return None

@router.post("/{project_id}/layouts", response_model=LayoutSourceResponse, status_code=status.HTTP_201_CREATED, summary="Upload a real binary layout blueprint file")
def upload_layout_file(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Master layout blueprint file (PDF, PNG, JPG, JPEG, TIFF)"),
    scale_ratio: Optional[str] = Form("Not specified", description="Layout calibration scale ratio (e.g. 1:500)"),
    db: Session = Depends(get_db)
):
    """
    Uploads a real binary layout blueprint file for a project.
    Saves the file to project-scoped backend storage (backend/uploads/projects/{project_id}/layouts/),
    records metadata in layout_sources, enqueues LayoutProcessingJob, updates project status to LAYOUT_PENDING,
    and dispatches the 12-stage AI Land Understanding & Reconstruction pipeline in the background.
    """
    res = project_service_instance.upload_project_layout(db, project_id, file, scale_ratio or "Not specified")
    if res and res.get("id") and res.get("activeJob") and res["activeJob"].get("id"):
        background_tasks.add_task(
            execute_ai_pipeline_job,
            project_id=project_id,
            layout_source_id=res["id"],
            job_id=res["activeJob"]["id"]
        )
    return res

@router.get("/{project_id}/layouts", response_model=List[LayoutSourceResponse], summary="List all layout sources for a project")
def get_project_layout_sources(project_id: str, db: Session = Depends(get_db)):
    """
    Returns all layout sources associated with a project, including active processing job status.
    """
    return project_service_instance.get_project_layout_sources(db, project_id)

@router.get("/{project_id}/layouts/{layout_id}", response_model=LayoutSourceDetailResponse, summary="Get layout source details with processing history")
def get_layout_source_by_id(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Retrieves layout source details with historical processing job attempts.
    """
    return project_service_instance.get_layout_source_by_id(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/processing-status", response_model=ProcessingJobResponse, summary="Get latest processing job status for polling")
def get_processing_status(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Returns the latest processing job status, stage, progress percentage, and results for a layout source.
    """
    return project_service_instance.get_processing_status(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/inspect", response_model=ProcessingJobResponse, summary="Trigger FileInspector engine for a layout source")
def inspect_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Triggers Stage 1 (File Inspection). Inspects the stored blueprint file,
    persists an INSPECTION_METADATA artifact to PostgreSQL layout_processing_artifacts,
    and updates the active processing job status.
    """
    return project_service_instance.inspect_layout_source(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/artifacts", response_model=List[ProcessingArtifactResponse], summary="List all pipeline stage artifacts for a layout source")
def get_layout_artifacts(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Returns all intermediate pipeline artifacts (INSPECTION_METADATA, CANONICAL_LAYOUT_MODEL, RAW_PRIMITIVES, OCR_TEXT_MAP, etc.)
    produced for a layout source.
    """
    return project_service_instance.get_layout_artifacts(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/clm", response_model=ProcessingArtifactResponse, summary="Get the latest Canonical Layout Model (CLM / Layout IR) artifact")
def get_clm_artifact(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the latest Canonical Layout Model (CLM / Layout IR) artifact containing universal layout primitives.
    """
    return project_service_instance.get_clm_artifact(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/extract-pdf", response_model=ProcessingJobResponse, summary="Trigger PDFReader stream inspection component")
def extract_pdf_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Triggers Stage 2 (PDF Reader Stream Inspection). Reads PDF pages, font tables, image objects, and text preview,
    persists a PDF_RAW_STREAM_METADATA artifact to PostgreSQL layout_processing_artifacts,
    and updates job stage to EXTRACTION (40% progress).
    """
    return project_service_instance.extract_pdf_layout_source(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/extract-vectors", response_model=VectorExtractionResponse, summary="Trigger VectorPathExtractor drawing primitives component")
def extract_vectors_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Triggers Stage 2 (Vector Path Extraction Engine). Reads PDF vector drawing operators (m, l, c, re, h, S, s, f, F),
    extracts drawing primitives (LINE, CURVE, RECTANGLE, POLYLINE, CLOSED_POLYGON),
    persists a RAW_VECTOR_PRIMITIVES artifact to PostgreSQL layout_processing_artifacts,
    and updates job stage to EXTRACTION (60% progress).
    """
    return project_service_instance.extract_vectors_layout_source(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/normalize-geometry", response_model=GeometryNormalizationResponse, summary="Trigger GeometryNormalizer engine component")
def normalize_geometry_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Triggers Stage 3 (Geometry Normalization Engine). Reads RAW_VECTOR_PRIMITIVES artifact from PostgreSQL,
    executes duplicate removal, segment merging, polygon gap repair, rich bounding box and centroid calculations,
    persists a NORMALIZED_VECTOR_PRIMITIVES artifact to PostgreSQL layout_processing_artifacts,
    and updates job stage to NORMALIZATION (75% progress).
    """
    return project_service_instance.normalize_geometry_layout_source(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/build-clm", response_model=CLMBuildResponse, summary="Trigger CLMPrimitiveBuilder engine component")
def build_clm_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Triggers Stage 4 (CLM Primitive Builder Engine). Reads NORMALIZED_VECTOR_PRIMITIVES artifact from PostgreSQL,
    classifies vector shapes into semantic CLM entities (Boundaries, Roads, Plots, Amenities, Paths),
    persists a CANONICAL_LAYOUT_MODEL artifact to PostgreSQL layout_processing_artifacts,
    and updates job stage to CLM_BUILD (85% progress).
    """
    return project_service_instance.build_clm_layout_source(db, project_id, layout_id)

@router.post("/{project_id}/layouts/{layout_id}/process", response_model=ProcessingJobResponse, summary="Single-Trigger Pipeline Auto-Run Controller")
def process_layout_source(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Single-Trigger Pipeline Auto-Run Endpoint.
    Automatically executes all active engine stages sequentially:
    Inspection (25%) -> PDF Reader (40%) -> Vector Extraction (60%) -> Normalization (75%) -> CLM Primitive Build (85%) -> Spatial Analysis (95%) -> Plot Persistence (100%).
    """
    return project_service_instance.process_layout_source(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/geojson", summary="Get standard GeoJSON FeatureCollection format for interactive vector map")
def get_geojson_layout(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the latest GEOJSON_LAYOUT artifact containing standard GeoJSON FeatureCollection format.
    Renders clickable plots, roads, and boundaries directly on interactive frontend vector maps.
    """
    return project_service_instance.get_geojson_layout(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/layout-svg", summary="Get reconstituted vector LAYOUT_SVG artifact for direct frontend SVG rendering")
def get_layout_svg(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the latest LAYOUT_SVG artifact content produced by the Universal Layout Reconstruction Engine.
    """
    return project_service_instance.get_layout_svg(db, project_id, layout_id)

@router.get("/{project_id}/layouts/{layout_id}/layout-model", summary="Get synthesized UNIVERSAL_LAYOUT_MODEL artifact specification")
def get_layout_model(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the complete synthesized UNIVERSAL_LAYOUT_MODEL artifact specification.
    """
    return project_service_instance.get_layout_model(db, project_id, layout_id)


@router.get("/{project_id}/plots", response_model=List[PlotResponse], summary="List all persisted plot inventory database records for a project")
def get_project_plots(project_id: str, db: Session = Depends(get_db)):
    """
    Retrieves all persisted plot inventory database records (`project_plots` table) for a project.
    """
    return project_service_instance.get_project_plots(db, project_id)

@router.patch("/{project_id}/plots/{plot_id}", response_model=PlotResponse, summary="Update plot status, notes, reservation date, customer ID, or pricing")
def update_project_plot(project_id: str, plot_id: str, payload: PlotUpdate, db: Session = Depends(get_db)):
    """
    Updates plot inventory record (status = AVAILABLE, RESERVED, SOLD, BLOCKED, notes, customerId, reservationDate).
    Preserves pipeline-generated spatial geometry and area.
    """
    return project_service_instance.update_project_plot(db, project_id, plot_id, payload)


@router.get("/{project_id}/plots/{plot_id}", response_model=PlotResponse, summary="Get single plot details with active booking and customer info")
def get_project_plot(project_id: str, plot_id: str, db: Session = Depends(get_db)):
    """
    Retrieves individual plot details by ID or plot number, including current booking and customer details.
    """
    return project_service_instance.get_plot_by_id(db, project_id, plot_id)


@router.post("/{project_id}/plots/{plot_id}/book", response_model=PlotResponse, status_code=status.HTTP_201_CREATED, summary="Book an available plot with customer & payment details")
def book_project_plot(project_id: str, plot_id: str, payload: PlotBookingCreate, db: Session = Depends(get_db)):
    """
    Books an available plot, updates status from AVAILABLE to BOOKED, records customer & payment info,
    calculates financial balances, and protects against duplicate concurrent bookings.
    """
    return project_service_instance.book_plot(db, project_id, plot_id, payload)


@router.put("/{project_id}/bookings/{booking_id}", summary="Update existing booking and customer info")
def update_project_booking(project_id: str, booking_id: str, payload: PlotBookingUpdate, db: Session = Depends(get_db)):
    """
    Updates customer details, payment amounts, and notes for an existing booking.
    Automatically recalculates remaining balance.
    """
    return project_service_instance.update_booking(db, project_id, booking_id, payload)


@router.post("/{project_id}/bookings/{booking_id}/cancel", summary="Cancel a plot booking and release plot back to AVAILABLE")
def cancel_project_booking(project_id: str, booking_id: str, db: Session = Depends(get_db)):
    """
    Cancels an active booking, releases plot back to AVAILABLE (GREEN), and preserves audit history.
    """
    return project_service_instance.cancel_booking(db, project_id, booking_id)


@router.get("/{project_id}/bookings", response_model=List[PlotBookingResponse], summary="List all bookings for a project")
def get_project_bookings(project_id: str, db: Session = Depends(get_db)):
    """
    Lists all bookings for the project (both active and cancelled) for customer management table.
    """
    return project_service_instance.get_project_bookings(db, project_id)









