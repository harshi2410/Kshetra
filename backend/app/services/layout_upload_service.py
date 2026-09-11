import os
import uuid
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.models.project import Project, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact
from app.services.storage_service import storage_service_instance
from app.engine import pipeline_controller_instance, artifact_manager_instance

logger = logging.getLogger(__name__)

class LayoutUploadService:
    """Layout Upload & Pipeline Artifact Management Service."""

    def upload_project_layout(self, db: Session, project_id: str, upload_file: UploadFile, scale_ratio: str = "Not specified") -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' not found.")

        original_filename, relative_path, file_size, mime_type = storage_service_instance.save_layout_file(project_id, upload_file)
        ext = upload_file.filename.split('.')[-1].lower() if (upload_file.filename and '.' in upload_file.filename) else 'bin'

        try:
            layout_id = str(uuid.uuid4())
            layout_record = LayoutSource(
                id=layout_id,
                project_id=project_id,
                file_name=original_filename,
                file_path=relative_path,
                file_type=ext,
                file_size_bytes=file_size,
                mime_type=mime_type,
                scale_ratio=scale_ratio or "Not specified",
                upload_status="UPLOADED"
            )
            db.add(layout_record)

            job_record = LayoutProcessingJob(
                id=str(uuid.uuid4()),
                project_id=project_id,
                layout_source_id=layout_id,
                status="QUEUED",
                stage="INSPECTION",
                progress_percentage=0,
                result_summary='{"message": "Job queued for AI land understanding pipeline"}'
            )
            db.add(job_record)

            project.status = "LAYOUT_PENDING"
            db.commit()
            db.refresh(layout_record)
            db.refresh(job_record)

            return {
                "id": layout_record.id,
                "projectId": layout_record.project_id,
                "fileName": layout_record.file_name,
                "filePath": layout_record.file_path,
                "fileSize": layout_record.file_size_bytes,
                "fileType": layout_record.file_type,
                "mimeType": layout_record.mime_type,
                "uploadStatus": layout_record.upload_status,
                "uploadedAt": layout_record.uploaded_at.isoformat() if layout_record.uploaded_at else "",
                "activeJob": self._format_job_response(job_record)
            }
        except Exception as e:
            db.rollback()
            storage_service_instance.delete_file_safely(relative_path)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database transaction failed: {str(e)}")

    def get_project_layout_sources(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        sources = db.query(LayoutSource).filter(LayoutSource.project_id == project_id).order_by(LayoutSource.uploaded_at.desc()).all()
        result = []
        for s in sources:
            latest_job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.layout_source_id == s.id).order_by(LayoutProcessingJob.created_at.desc()).first()
            result.append({
                "id": s.id,
                "projectId": s.project_id,
                "fileName": s.file_name,
                "filePath": s.file_path,
                "fileSize": s.file_size_bytes,
                "fileType": s.file_type,
                "mimeType": s.mime_type,
                "uploadStatus": s.upload_status,
                "uploadedAt": s.uploaded_at.isoformat() if s.uploaded_at else "",
                "activeJob": self._format_job_response(latest_job) if latest_job else None
            })
        return result

    def get_layout_svg(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first() if (layout_id and layout_id != 'default-layout') else None
        if not layout:
            layout = db.query(LayoutSource).filter(LayoutSource.project_id == project_id).order_by(LayoutSource.uploaded_at.desc()).first()
        if not layout:
            return {}

        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.layout_source_id == layout.id).order_by(LayoutProcessingJob.created_at.desc()).first()
        if not job:
            return {}

        artifact = artifact_manager_instance.get_latest_artifact_by_type(db, job.id, "LAYOUT_SVG")
        if not artifact or not artifact.content_json:
            if job.status not in ["FAILED", "PROCESSING"]:
                try:
                    pipeline_controller_instance.run_full_pipeline(db, project_id, layout.id, job.id)
                    artifact = artifact_manager_instance.get_latest_artifact_by_type(db, job.id, "LAYOUT_SVG")
                except Exception as e:
                    logger.warning(f"Pipeline run on get_layout_svg notice: {e}")
        return json.loads(artifact.content_json) if artifact and artifact.content_json else {}

    def get_layout_model(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first() if (layout_id and layout_id != 'default-layout') else None
        if not layout:
            layout = db.query(LayoutSource).filter(LayoutSource.project_id == project_id).order_by(LayoutSource.uploaded_at.desc()).first()
        if not layout:
            return {}

        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.layout_source_id == layout.id).order_by(LayoutProcessingJob.created_at.desc()).first()
        if not job:
            return {}

        artifact = artifact_manager_instance.get_latest_artifact_by_type(db, job.id, "UNIVERSAL_LAYOUT_MODEL")
        if not artifact or not artifact.content_json:
            if job.status not in ["FAILED", "PROCESSING"]:
                try:
                    pipeline_controller_instance.run_full_pipeline(db, project_id, layout.id, job.id)
                    artifact = artifact_manager_instance.get_latest_artifact_by_type(db, job.id, "UNIVERSAL_LAYOUT_MODEL")
                except Exception as e:
                    logger.warning(f"Pipeline run on get_layout_model notice: {e}")
        return json.loads(artifact.content_json) if artifact and artifact.content_json else {}

    def _format_job_response(self, job: LayoutProcessingJob) -> Dict[str, Any]:
        return {
            "id": job.id,
            "projectId": job.project_id,
            "layoutSourceId": job.layout_source_id,
            "status": job.status,
            "stage": job.stage,
            "progressPercentage": int(job.progress_percentage or 0),
            "resultSummary": job.result_summary,
            "createdAt": job.created_at.isoformat() if job.created_at else ""
        }

layout_upload_service_instance = LayoutUploadService()
