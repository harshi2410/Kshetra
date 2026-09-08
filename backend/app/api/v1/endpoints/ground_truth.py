import os
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ground_truth.version_manager import ground_truth_version_manager_instance
from app.services.ground_truth.exporter import ground_truth_exporter_instance
from app.services.ground_truth.schemas import GroundTruthExportDTO, GroundTruthVersionSummary

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{project_id}/ground-truth/versions", response_model=List[GroundTruthVersionSummary])
def list_ground_truth_versions(project_id: str):
    """Returns all Ground Truth version summaries for a project."""
    summaries = ground_truth_version_manager_instance.get_version_summaries(project_id)
    return summaries

@router.get("/{project_id}/ground-truth")
def get_latest_ground_truth(project_id: str):
    """Retrieves the latest Ground Truth dataset snapshot (metadata, manifest, model)."""
    versions = ground_truth_version_manager_instance.list_project_versions(project_id)
    if not versions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No Ground Truth datasets found for project '{project_id}'. Approve a layout first.")
    latest_v = versions[-1]
    details = ground_truth_version_manager_instance.get_version_details(project_id, latest_v)
    return details

@router.get("/{project_id}/ground-truth/versions/{version_str}")
def get_specific_ground_truth_version(project_id: str, version_str: str):
    """Retrieves specific Ground Truth version snapshot details."""
    details = ground_truth_version_manager_instance.get_version_details(project_id, version_str)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ground Truth version '{version_str}' not found for project '{project_id}'.")
    return details

@router.get("/{project_id}/ground-truth/export", response_model=GroundTruthExportDTO)
def export_ground_truth_dataset(project_id: str, version: str = Query("latest")):
    """Generates Ground Truth export DTO with ZIP download URL."""
    summaries = ground_truth_version_manager_instance.get_version_summaries(project_id)
    if not summaries:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No Ground Truth versions found for project '{project_id}'.")
    latest_v = summaries[-1].version if version == "latest" else version
    return GroundTruthExportDTO(
        projectId=project_id,
        totalVersionsCount=len(summaries),
        latestVersion=latest_v,
        versions=summaries,
        downloadUrl=f"/api/v1/projects/{project_id}/ground-truth/download?version={latest_v}"
    )

@router.get("/{project_id}/ground-truth/download")
def download_ground_truth_bundle(project_id: str, version: str = Query("latest")):
    """Streams zipped Ground Truth dataset bundle."""
    try:
        zip_path, filename = ground_truth_exporter_instance.create_zip_archive(project_id, version)
        return FileResponse(path=zip_path, filename=filename, media_type="application/zip")
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
