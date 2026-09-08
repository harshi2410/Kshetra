import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.project import Project, ProjectLocation, ProjectSurvey, ProjectCommercial, ProjectLegal, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact, ProjectPlot
from app.schemas.project import ProjectCreate
from app.services.project_dto_formatter import ProjectDtoFormatter

logger = logging.getLogger(__name__)

class ProjectCrudService:
    """Project CRUD Operations & Atomic Database Persistence."""

    def get_projects(self, db: Session) -> List[Dict[str, Any]]:
        projects = db.query(Project).options(
            joinedload(Project.location), joinedload(Project.surveys),
            joinedload(Project.commercial), joinedload(Project.legal),
            joinedload(Project.layout_sources), joinedload(Project.plots)
        ).order_by(Project.created_at.desc()).all()
        return [ProjectDtoFormatter.format_project_response(p) for p in projects]

    def get_project_by_id(self, db: Session, project_id: str) -> Optional[Dict[str, Any]]:
        project = db.query(Project).options(
            joinedload(Project.location), joinedload(Project.surveys),
            joinedload(Project.commercial), joinedload(Project.legal),
            joinedload(Project.layout_sources), joinedload(Project.plots)
        ).filter(Project.id == project_id).first()
        return ProjectDtoFormatter.format_project_response(project) if project else None

    def create_project(self, db: Session, data: ProjectCreate) -> Dict[str, Any]:
        try:
            project_id = str(uuid.uuid4())
            layout_uploaded = bool(data.layoutFile or data.layoutUploaded)
            status = data.status or ("LAYOUT_PENDING" if layout_uploaded else "DRAFT")

            project = Project(id=project_id, name=data.name, developer_name=data.developer, project_type=data.type, land_classification=data.landClassification, status=status, description=data.description)
            db.add(project)
            db.flush()

            location = ProjectLocation(id=str(uuid.uuid4()), project_id=project_id, state=data.state, district=data.district, taluka=data.taluka, city_village=data.cityVillage, pincode=data.pincode, latitude=data.latitude, longitude=data.longitude)
            db.add(location)

            for s_num in data.surveyNumbers:
                if s_num.strip():
                    db.add(ProjectSurvey(id=str(uuid.uuid4()), project_id=project_id, survey_number=s_num.strip()))

            start_date = datetime.strptime(data.startDate, "%Y-%m-%d").date() if data.startDate else None
            comp_date = datetime.strptime(data.expectedCompletion, "%Y-%m-%d").date() if data.expectedCompletion else None

            commercial = ProjectCommercial(id=str(uuid.uuid4()), project_id=project_id, gross_land_area=data.grossArea, area_unit=data.areaUnit, base_rate_per_sqft=data.baseRatePerSqFt, min_price=data.priceMin, max_price=data.priceMax, launch_date=start_date, completion_date=comp_date)
            db.add(commercial)

            if data.reraNo or data.approvingAuthority:
                db.add(ProjectLegal(id=str(uuid.uuid4()), project_id=project_id, rera_number=data.reraNo or None, approval_authority=data.approvingAuthority or None))

            if data.layoutFile:
                db.add(LayoutSource(id=str(uuid.uuid4()), project_id=project_id, file_name=data.layoutFile.name, file_path=f"/uploads/projects/{project_id}/layouts/{data.layoutFile.name}", file_type=data.layoutFile.type, file_size_bytes=data.layoutFile.size, mime_type=data.layoutFile.type, scale_ratio=data.scaleRatio or "Not specified", upload_status="UPLOADED"))

            db.commit()
            db.refresh(project)
            return self.get_project_by_id(db, project_id)
        except Exception as e:
            db.rollback()
            raise RuntimeError(f"Database transaction failed during project creation: {str(e)}")

    def delete_project(self, db: Session, project_id: str) -> bool:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project: return False
        try:
            jobs = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.project_id == project_id).all()
            for job in jobs:
                db.query(LayoutProcessingArtifact).filter(LayoutProcessingArtifact.job_id == job.id).delete(synchronize_session=False)
            db.query(LayoutProcessingJob).filter(LayoutProcessingJob.project_id == project_id).delete(synchronize_session=False)
            db.query(LayoutSource).filter(LayoutSource.project_id == project_id).delete(synchronize_session=False)
            db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).delete(synchronize_session=False)
            db.query(ProjectLocation).filter(ProjectLocation.project_id == project_id).delete(synchronize_session=False)
            db.query(ProjectSurvey).filter(ProjectSurvey.project_id == project_id).delete(synchronize_session=False)
            db.query(ProjectCommercial).filter(ProjectCommercial.project_id == project_id).delete(synchronize_session=False)
            db.query(ProjectLegal).filter(ProjectLegal.project_id == project_id).delete(synchronize_session=False)
            db.delete(project)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise RuntimeError(f"Failed to delete project '{project_id}': {str(e)}")

project_crud_service_instance = ProjectCrudService()
