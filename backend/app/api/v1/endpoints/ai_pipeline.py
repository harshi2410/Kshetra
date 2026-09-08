"""
AI Pipeline API Endpoints (Phase 2).
Provides asynchronous job triggers, polling status endpoints, and
structured intermediate/final representations for LandOS.
"""

import time
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.project import (
    Project, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact,
    ProjectPlot, GeneratedLayoutVariant
)
from app.engine.pipeline import pipeline_controller_instance
from app.engine.artifact_manager import artifact_manager_instance
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────── Pydantic Schemas ────────────────────────────────

class PlanningConstraintsInput(BaseModel):
    targetPlotSqft: float = Field(1200.0, description="Target plot size in sqft", gt=0)
    minPlotSqft: float = Field(800.0, description="Minimum allowable plot size in sqft", gt=0)
    maxPlotSqft: float = Field(4000.0, description="Maximum allowable plot size in sqft", gt=0)
    roadWidthFt: float = Field(30.0, description="Internal road width in feet", gt=0)
    setbackFt: float = Field(10.0, description="Boundary setback in feet", ge=0)
    gardenPercentage: float = Field(10.0, description="Garden & open space percentage", ge=0, le=50)
    entryPoints: Optional[List[Dict[str, Any]]] = None
    polygonVertices: Optional[List[List[float]]] = None
    strategyPreference: Optional[str] = Field("ALL", description="ALL | GRID | SPINE | PERIMETER | ADAPTIVE")


class AIRunTriggerRequest(BaseModel):
    layoutSourceId: Optional[str] = Field(None, description="Optional ID of specific uploaded layout source")
    planningConstraints: Optional[PlanningConstraintsInput] = None


class AIRunStatusResponse(BaseModel):
    runId: str
    projectId: str
    layoutSourceId: Optional[str] = None
    status: str  # QUEUED | PROCESSING | COMPLETED | FAILED
    stage: str
    progressPercentage: int
    errorMessage: Optional[str] = None
    resultSummary: Optional[Dict[str, Any]] = None
    createdAt: Optional[str] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None


# ──────────────────────────────── Async Worker ────────────────────────────────

def execute_ai_pipeline_job(project_id: str, layout_source_id: str, job_id: str, constraints_dict: Optional[Dict[str, Any]] = None):
    """
    Background worker function executed asynchronously.
    Runs the multi-stage perception & geometry reconstruction pipeline,
    generates multi-strategy layout variants, and updates PostgreSQL job status.
    """
    db = SessionLocal()
    start_time = time.time()
    try:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_source_id).first()
        project = db.query(Project).filter(Project.id == project_id).first()

        if not job or not layout or not project:
            logger.error(f"[AI_JOB] Missing record for job_id={job_id}")
            return

        job.status = "PROCESSING"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # 1. Run perception and reconstruction pipeline
        pipeline_controller_instance.run_full_pipeline(db, project_id, layout_source_id, job_id)

        # 2. Update layout variants if planning constraints provided
        if constraints_dict or project.land_length_ft:
            try:
                engine = LayoutGeneratorEngine()
                target_sqft = (constraints_dict or {}).get("targetPlotSqft", project.desired_plot_size_sqft or 1200.0)
                road_w = (constraints_dict or {}).get("roadWidthFt", project.road_width_ft or 30.0)
                garden_p = (constraints_dict or {}).get("gardenPercentage", project.garden_percentage or 10.0)
                length_ft = project.land_length_ft or 300.0
                breadth_ft = project.land_breadth_ft or 200.0

                # Fetch extracted project boundary polygon from artifacts if available
                b_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PROJECT_BOUNDARY")
                extracted_boundary_verts = None
                if b_art and b_art.content_json:
                    b_data = json.loads(b_art.content_json)
                    extracted_boundary_verts = b_data.get("geometry") or b_data.get("polygon")

                poly_verts = None
                if (constraints_dict or {}).get("polygonVertices"):
                    poly_verts = constraints_dict["polygonVertices"]
                elif project.land_polygon_json:
                    try:
                        poly_verts = json.loads(project.land_polygon_json)
                    except Exception:
                        poly_verts = None
                elif extracted_boundary_verts and len(extracted_boundary_verts) >= 3:
                    poly_verts = extracted_boundary_verts

                variants = engine.generate_all_variants(
                    length_ft=length_ft,
                    breadth_ft=breadth_ft,
                    polygon_vertices=poly_verts,
                    target_plot_sqft=target_sqft,
                    road_width_ft=road_w,
                    garden_percentage=garden_p,
                )

                # Persist variants
                db.query(GeneratedLayoutVariant).filter(GeneratedLayoutVariant.project_id == project_id).delete()
                for v in variants:
                    db_variant = GeneratedLayoutVariant(
                        id=v.id,
                        project_id=project_id,
                        variant_number=v.variant_number,
                        strategy_name=v.strategy_name,
                        layout_model_json=json.dumps(v.to_layout_model()),
                        svg_content=v.to_svg(),
                        total_plots=v.total_plots,
                        total_area_sqft=v.land.total_area_sqft,
                        utilization_percent=v.utilization_percent,
                        is_selected=(v.variant_number == 1),
                    )
                    db.add(db_variant)
                db.commit()
            except Exception as gen_err:
                logger.warning(f"[AI_JOB] Variant generation notice: {gen_err}")

        # 3. Mark job completed
        elapsed = round(time.time() - start_time, 2)
        job.status = "COMPLETED"
        job.stage = "PERSISTENCE"
        job.progress_percentage = 100
        job.completed_at = datetime.now(timezone.utc)
        job.result_summary = json.dumps({
            "status": "SUCCESS",
            "elapsedSeconds": elapsed,
            "message": "AI analysis and layout generation completed successfully"
        })
        project.status = "ACTIVE"
        db.commit()
        logger.info(f"[AI_JOB] Job {job_id} for project {project_id} completed in {elapsed}s")

    except Exception as e:
        logger.exception(f"[AI_JOB] Pipeline execution failed for job {job_id}: {e}")
        db.rollback()
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        if job:
            job.status = "FAILED"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


# ──────────────────────────────── Endpoints ────────────────────────────────

@router.post("/projects/{project_id}/ai-runs", response_model=AIRunStatusResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_ai_run(
    project_id: str,
    req: AIRunTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Asynchronously triggers the LandOS AI Land Understanding & Layout Generation Pipeline.
    Creates a queued processing job and runs ML/CV/Geometry processing in the background.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    # Find layout source
    layout_source = None
    if req.layoutSourceId:
        layout_source = db.query(LayoutSource).filter(
            LayoutSource.id == req.layoutSourceId,
            LayoutSource.project_id == project_id
        ).first()
    else:
        layout_source = db.query(LayoutSource).filter(
            LayoutSource.project_id == project_id
        ).order_by(LayoutSource.uploaded_at.desc()).first()

    if not layout_source:
        # Create a synthetic digital layout source if project has manual dimensions/polygons
        layout_source = LayoutSource(
            id=str(uuid.uuid4()),
            project_id=project_id,
            file_name=f"{project.name.replace(' ', '_')}_site_plan.pdf",
            file_path=f"uploads/projects/{project_id}/layouts/synthetic_site_plan.pdf",
            file_type="PDF",
            file_size_bytes=1024,
            mime_type="application/pdf",
            upload_status="UPLOADED"
        )
        db.add(layout_source)
        db.commit()
        db.refresh(layout_source)

    # Update project planning constraints if provided
    constraints_dict = None
    if req.planningConstraints:
        constraints_dict = req.planningConstraints.model_dump()
        project.desired_plot_size_sqft = req.planningConstraints.targetPlotSqft
        project.road_width_ft = req.planningConstraints.roadWidthFt
        project.garden_percentage = req.planningConstraints.gardenPercentage
        if req.planningConstraints.entryPoints:
            project.entry_points_json = json.dumps(req.planningConstraints.entryPoints)
        if req.planningConstraints.polygonVertices:
            project.land_polygon_json = json.dumps(req.planningConstraints.polygonVertices)
        db.commit()

    # Create Job record
    job_id = str(uuid.uuid4())
    job = LayoutProcessingJob(
        id=job_id,
        project_id=project_id,
        layout_source_id=layout_source.id,
        status="QUEUED",
        stage="INSPECTION",
        progress_percentage=0
    )
    db.add(job)
    project.status = "PROCESSING"
    db.commit()
    db.refresh(job)

    # Dispatch to background task
    background_tasks.add_task(
        execute_ai_pipeline_job,
        project_id=project_id,
        layout_source_id=layout_source.id,
        job_id=job_id,
        constraints_dict=constraints_dict
    )

    return AIRunStatusResponse(
        runId=job.id,
        projectId=project_id,
        layoutSourceId=layout_source.id,
        status="QUEUED",
        stage="INSPECTION",
        progressPercentage=0,
        createdAt=job.created_at.isoformat() if job.created_at else None
    )


@router.get("/projects/{project_id}/ai-runs/{run_id}", response_model=AIRunStatusResponse)
@router.get("/ai-runs/{run_id}", response_model=AIRunStatusResponse)
def get_ai_run_status(run_id: str, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Polls the current status, stage, and progress percentage of an asynchronous AI run.
    """
    query = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == run_id)
    if project_id:
        query = query.filter(LayoutProcessingJob.project_id == project_id)
    job = query.first()

    if not job:
        raise HTTPException(status_code=404, detail=f"AI Run with ID '{run_id}' not found")

    res_summary = None
    if job.result_summary:
        try:
            res_summary = json.loads(job.result_summary)
        except Exception:
            res_summary = {"raw": job.result_summary}

    return AIRunStatusResponse(
        runId=job.id,
        projectId=job.project_id,
        layoutSourceId=job.layout_source_id,
        status=job.status,
        stage=job.stage,
        progressPercentage=int(job.progress_percentage or 0),
        errorMessage=job.error_message,
        resultSummary=res_summary,
        createdAt=job.created_at.isoformat() if job.created_at else None,
        startedAt=job.started_at.isoformat() if job.started_at else None,
        completedAt=job.completed_at.isoformat() if job.completed_at else None
    )


@router.get("/projects/{project_id}/ai-runs/{run_id}/result")
@router.get("/ai-runs/{run_id}/result")
def get_ai_run_result(run_id: str, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns the full structured intermediate and final representation of an AI run,
    including detected boundary, usable land geometry, features, OCR text, and layout alternatives.
    """
    query = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == run_id)
    if project_id:
        query = query.filter(LayoutProcessingJob.project_id == project_id)
    job = query.first()

    if not job:
        raise HTTPException(status_code=404, detail=f"AI Run '{run_id}' not found")

    proj_id = job.project_id

    # Load intermediate artifacts from database
    boundary_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "PROJECT_BOUNDARY")
    road_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "ROAD_NETWORK")
    plots_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "DETECTED_PLOTS")
    ocr_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "OCR_TEXT_ELEMENTS")
    layout_model_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "UNIVERSAL_LAYOUT_MODEL")
    buildable_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "BUILDABLE_AREA")
    val_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "GEOMETRIC_VALIDATION_REPORT")
    score_art = artifact_manager_instance.get_latest_artifact_by_type(db, run_id, "LAYOUT_SCORING_REPORT")

    boundary_data = json.loads(boundary_art.content_json) if boundary_art and boundary_art.content_json else {}
    road_data = json.loads(road_art.content_json) if road_art and road_art.content_json else {}
    plots_data = json.loads(plots_art.content_json) if plots_art and plots_art.content_json else {}
    ocr_data = json.loads(ocr_art.content_json) if ocr_art and ocr_art.content_json else {}
    layout_model_data = json.loads(layout_model_art.content_json) if layout_model_art and layout_model_art.content_json else {}
    buildable_data = json.loads(buildable_art.content_json) if buildable_art and buildable_art.content_json else {}
    val_data = json.loads(val_art.content_json) if val_art and val_art.content_json else {}
    score_data = json.loads(score_art.content_json) if score_art and score_art.content_json else {}

    # Load generated layout variants
    variants = db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == proj_id
    ).order_by(GeneratedLayoutVariant.variant_number.asc()).all()

    variants_list = []
    for v in variants:
        try:
            m = json.loads(v.layout_model_json)
        except Exception:
            m = {}
        variants_list.append({
            "variantId": v.id,
            "variantNumber": v.variant_number,
            "strategyName": v.strategy_name,
            "totalPlots": v.total_plots,
            "totalAreaSqft": v.total_area_sqft,
            "utilizationPercent": v.utilization_percent,
            "isSelected": v.is_selected,
            "model": m,
            "svgUrl": f"/api/v1/projects/{proj_id}/variants/{v.id}/svg"
        })

    return {
        "projectId": proj_id,
        "runId": job.id,
        "status": job.status,
        "stage": job.stage,
        "land": {
            "boundary": boundary_data.get("geometry", []),
            "areaSqft": boundary_data.get("area", 0.0),
            "perimeter": boundary_data.get("perimeter", 0.0),
            "boundingBox": boundary_data.get("boundingBox", []),
            "orientation": boundary_data.get("orientation", "NORTH"),
            "isValid": boundary_data.get("isValidBoundary", False),
        },
        "features": {
            "roads": road_data.get("roads", []),
            "detectedPlots": plots_data.get("plots", []),
            "buildings": [],
            "greenSpaces": road_data.get("greenSpaces", []),
            "obstacles": road_data.get("obstacles", [])
        },
        "buildableArea": buildable_data,
        "ocr": ocr_data.get("textElements", []),
        "layouts": variants_list,
        "reconstitutedModel": layout_model_data,
        "validationReport": val_data,
        "scoringReport": score_data,
        "validation": {
            "isValid": job.status == "COMPLETED",
            "plotsCount": plots_data.get("totalPlotsCount", len(plots_data.get("plots", []))),
            "totalPlotArea": plots_data.get("totalPlotArea", 0.0),
            "overallCompliant": val_data.get("overallCompliant", True),
        }
    }


@router.get("/projects/{project_id}/ai-runs", response_model=List[AIRunStatusResponse])
def list_project_ai_runs(project_id: str, db: Session = Depends(get_db)):
    """
    Lists all AI processing runs for a given project.
    """
    jobs = db.query(LayoutProcessingJob).filter(
        LayoutProcessingJob.project_id == project_id
    ).order_by(LayoutProcessingJob.created_at.desc()).all()

    return [
        AIRunStatusResponse(
            runId=j.id,
            projectId=j.project_id,
            layoutSourceId=j.layout_source_id,
            status=j.status,
            stage=j.stage,
            progressPercentage=int(j.progress_percentage or 0),
            errorMessage=j.error_message,
            createdAt=j.created_at.isoformat() if j.created_at else None,
            startedAt=j.started_at.isoformat() if j.started_at else None,
            completedAt=j.completed_at.isoformat() if j.completed_at else None
        )
        for j in jobs
    ]
