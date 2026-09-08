from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.db.session import get_db
from app.services.layout_review_service import layout_review_service_instance
from app.services.layout_version_service import layout_version_service_instance

router = APIRouter()

@router.get("/{project_id}/layouts/{layout_id}/review", summary="Get layout draft review & GEOS validation report")
def get_layout_review(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    try:
        return layout_review_service_instance.validate_layout_draft(db, project_id, layout_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{project_id}/layouts/{layout_id}/approve", summary="Approve and freeze layout geometry for CRM")
def approve_layout(
    project_id: str,
    layout_id: str,
    approved_by: Optional[str] = Query("System Admin", description="Name of approving manager"),
    db: Session = Depends(get_db)
):
    try:
        return layout_review_service_instance.approve_layout(db, project_id, layout_id, approved_by)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{project_id}/layouts/{layout_id}/plots/{plot_id}", summary="PATCH plot geometry or metadata")
def patch_plot(
    project_id: str,
    layout_id: str,
    plot_id: str,
    patch_payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return layout_version_service_instance.patch_plot(db, project_id, layout_id, plot_id, patch_payload)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{project_id}/layouts/{layout_id}/roads/{road_id}", summary="PATCH road geometry or metadata")
def patch_road(
    project_id: str,
    layout_id: str,
    road_id: str,
    patch_payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return layout_version_service_instance.patch_road(db, project_id, layout_id, road_id, patch_payload)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{project_id}/layouts/{layout_id}/model", summary="PUT updated Universal Layout Model snapshot")
def put_layout_model(
    project_id: str,
    layout_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    try:
        model = payload.get("layoutModel") or payload
        summary = payload.get("changeSummary", "Updated geometry model via Production Geometry Editor")
        return layout_version_service_instance.patch_full_model(db, project_id, layout_id, model, summary)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{project_id}/layouts/{layout_id}/georeference", summary="PATCH georeference transform metadata")
def patch_georeference(
    project_id: str,
    layout_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return layout_version_service_instance.patch_georeference(db, project_id, layout_id, payload)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{project_id}/layouts/{layout_id}/revisions", summary="Create editable revision from approved layout")
def create_layout_revision(project_id: str, layout_id: str, db: Session = Depends(get_db)):
    try:
        return layout_version_service_instance.create_revision(db, project_id, layout_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{project_id}/layouts/{layout_id}/rollback", summary="Rollback layout model to historical version")
def rollback_layout_version(
    project_id: str,
    layout_id: str,
    target_version: int = Query(..., description="Target version integer to restore"),
    db: Session = Depends(get_db)
):
    try:
        return layout_version_service_instance.rollback_version(db, project_id, layout_id, target_version)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
