import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.project import LayoutProcessingArtifact

logger = logging.getLogger(__name__)

class ArtifactManager:
    """
    Modular Artifact Manager component of the Layout Intelligence Engine.
    Persists and retrieves intermediate pipeline stage outputs to PostgreSQL layout_processing_artifacts table.
    Prevents re-processing files from scratch when debugging or running downstream pipeline stages.
    """

    def save_artifact(
        self,
        db: Session,
        project_id: str,
        job_id: str,
        artifact_type: str,
        content_dict: Dict[str, Any],
        mime_type: str = "application/json",
        file_path: Optional[str] = None
    ) -> LayoutProcessingArtifact:
        """
        Persists a pipeline stage artifact to PostgreSQL layout_processing_artifacts.
        """
        content_json_str = json.dumps(content_dict)
        artifact = LayoutProcessingArtifact(
            id=str(uuid.uuid4()),
            project_id=project_id,
            job_id=job_id,
            artifact_type=artifact_type,
            mime_type=mime_type,
            content_json=content_json_str,
            file_path=file_path
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        logger.info(f"Persisted artifact '{artifact_type}' for job '{job_id}' (ID: {artifact.id})")
        return artifact

    def get_job_artifacts(self, db: Session, job_id: str) -> List[LayoutProcessingArtifact]:
        """
        Retrieves all processing artifacts produced for a specific job.
        """
        return db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.job_id == job_id
        ).order_by(LayoutProcessingArtifact.created_at.asc()).all()

    def get_latest_artifact_by_type(self, db: Session, job_id: str, artifact_type: str) -> Optional[LayoutProcessingArtifact]:
        """
        Retrieves the latest artifact of a specific stage type (e.g. INSPECTION_METADATA).
        """
        return db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.job_id == job_id,
            LayoutProcessingArtifact.artifact_type == artifact_type
        ).order_by(LayoutProcessingArtifact.created_at.desc()).first()

artifact_manager_instance = ArtifactManager()
