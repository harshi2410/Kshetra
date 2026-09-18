import logging
from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.schemas.project import ProjectCreate, PlotUpdate
from app.services.project_crud_service import project_crud_service_instance
from app.services.layout_upload_service import layout_upload_service_instance
from app.services.plot_inventory_service import plot_inventory_service_instance

logger = logging.getLogger(__name__)

class ProjectService:
    """
    Unified Facade Service Layer for LandOS Projects.
    Delegates CRUD operations, Layout Uploads, and Plot Inventory queries to specialized sub-services.
    """

    def get_projects(self, db: Session) -> List[Dict[str, Any]]:
        return project_crud_service_instance.get_projects(db)

    def get_project_by_id(self, db: Session, project_id: str) -> Optional[Dict[str, Any]]:
        return project_crud_service_instance.get_project_by_id(db, project_id)

    def create_project(self, db: Session, data: ProjectCreate) -> Dict[str, Any]:
        return project_crud_service_instance.create_project(db, data)

    def delete_project(self, db: Session, project_id: str) -> bool:
        return project_crud_service_instance.delete_project(db, project_id)

    def upload_project_layout(self, db: Session, project_id: str, upload_file: UploadFile, scale_ratio: str = "Not specified") -> Dict[str, Any]:
        return layout_upload_service_instance.upload_project_layout(db, project_id, upload_file, scale_ratio)

    def get_project_layout_sources(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        return layout_upload_service_instance.get_project_layout_sources(db, project_id)

    def get_layout_svg(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        return layout_upload_service_instance.get_layout_svg(db, project_id, layout_id)

    def get_layout_model(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        return layout_upload_service_instance.get_layout_model(db, project_id, layout_id)

    def get_project_plots(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        return plot_inventory_service_instance.get_project_plots(db, project_id)

    def get_plot_by_id(self, db: Session, project_id: str, plot_id: str) -> Dict[str, Any]:
        return plot_inventory_service_instance.get_plot_by_id(db, project_id, plot_id)

    def update_project_plot(self, db: Session, project_id: str, plot_id: str, payload: PlotUpdate) -> Dict[str, Any]:
        return plot_inventory_service_instance.update_project_plot(db, project_id, plot_id, payload)

    def book_plot(self, db: Session, project_id: str, plot_id: str, payload: Any) -> Dict[str, Any]:
        return plot_inventory_service_instance.book_plot(db, project_id, plot_id, payload)

    def update_booking(self, db: Session, project_id: str, booking_id: str, payload: Any) -> Dict[str, Any]:
        return plot_inventory_service_instance.update_booking(db, project_id, booking_id, payload)

    def cancel_booking(self, db: Session, project_id: str, booking_id: str) -> Dict[str, Any]:
        return plot_inventory_service_instance.cancel_booking(db, project_id, booking_id)

    def get_project_bookings(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        return plot_inventory_service_instance.get_project_bookings(db, project_id)

project_service_instance = ProjectService()
