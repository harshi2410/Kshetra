import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectPlot
from app.schemas.project import PlotUpdate

logger = logging.getLogger(__name__)

class PlotInventoryService:
    """Plot Inventory Management Service (`project_plots` PostgreSQL table)."""

    def get_project_plots(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' not found.")
        plots = db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).order_by(ProjectPlot.plot_number.asc()).all()
        return [self._format_plot_response(p) for p in plots]

    def update_project_plot(self, db: Session, project_id: str, plot_id: str, payload: PlotUpdate) -> Dict[str, Any]:
        plot = db.query(ProjectPlot).filter(ProjectPlot.id == plot_id, ProjectPlot.project_id == project_id).first()
        if not plot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plot '{plot_id}' not found.")

        VALID_STATUSES = {"AVAILABLE", "RESERVED", "SOLD", "BLOCKED"}
        if payload.status is not None:
            new_status = payload.status.upper().strip()
            if new_status not in VALID_STATUSES:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}.")
            plot.status = new_status

        if payload.notes is not None: plot.notes = payload.notes
        if payload.customerId is not None: plot.customer_id = payload.customerId if payload.customerId.strip() != "" else None
        if payload.basePrice is not None: plot.base_price = payload.basePrice

        if payload.reservationDate is not None:
            if payload.reservationDate.strip() == "": plot.reservation_date = None
            else:
                try: plot.reservation_date = datetime.fromisoformat(payload.reservationDate.replace('Z', '+00:00'))
                except Exception: plot.reservation_date = datetime.utcnow()

        plot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(plot)
        return self._format_plot_response(plot)

    def _format_plot_response(self, p: ProjectPlot) -> Dict[str, Any]:
        return {
            "id": p.id, "projectId": p.project_id, "layoutSourceId": p.layout_source_id,
            "plotNumber": p.plot_number, "polygonGeojson": p.polygon_geojson,
            "calculatedAreaSqFt": float(p.calculated_area_sqft) if p.calculated_area_sqft is not None else None,
            "facingDirection": p.facing_direction,
            "centroidX": float(p.centroid_x) if p.centroid_x is not None else None,
            "centroidY": float(p.centroid_y) if p.centroid_y is not None else None,
            "status": p.status,
            "basePrice": float(p.base_price) if p.base_price is not None else None,
            "notes": p.notes, "customerId": p.customer_id,
            "reservationDate": p.reservation_date.isoformat() if p.reservation_date else None,
            "updatedAt": p.updated_at.isoformat() if p.updated_at else None
        }

plot_inventory_service_instance = PlotInventoryService()
