from typing import Dict, Any
from app.models.project import Project

class ProjectDtoFormatter:
    """Formatter helper for converting SQLAlchemy Project models into API DTOs."""

    @staticmethod
    def format_project_response(project: Project) -> Dict[str, Any]:
        loc = project.location
        comm = project.commercial
        leg = project.legal
        layout = project.layout_sources[0] if project.layout_sources else None

        loc_str = f"{loc.city_village}, {loc.district}, {loc.state}" if loc else "Maharashtra, India"
        price_range = f"₹{int(comm.min_price):,} – ₹{int(comm.max_price):,}" if (comm and comm.min_price and comm.max_price) else "Price on request"
        total_area = f"{comm.gross_land_area} {comm.area_unit}" if comm else "Acres"
        surveys_arr = [s.survey_number for s in project.surveys] if project.surveys else []

        layout_dict = None
        if layout:
            layout_dict = {
                "id": layout.id,
                "projectId": layout.project_id,
                "fileName": layout.file_name,
                "filePath": layout.file_path,
                "fileSize": layout.file_size_bytes,
                "fileType": layout.file_type,
                "mimeType": layout.mime_type,
                "scaleRatio": layout.scale_ratio or "Not specified",
                "uploadStatus": layout.upload_status or "UPLOADED",
                "layoutStatus": getattr(layout, 'layout_status', 'DRAFT'),
                "layoutVersion": getattr(layout, 'layout_version', 1),
                "uploadedAt": layout.uploaded_at.isoformat() if layout.uploaded_at else ""
            }

        plots = getattr(project, 'plots', []) or []
        total_plots = len(plots)
        sold_plots = sum(1 for p in plots if getattr(p, 'status', None) == 'SOLD')
        available_plots = sum(1 for p in plots if getattr(p, 'status', None) == 'AVAILABLE')
        reserved_plots = sum(1 for p in plots if getattr(p, 'status', None) == 'RESERVED')
        blocked_plots = sum(1 for p in plots if getattr(p, 'status', None) == 'BLOCKED')
        revenue = float(sum((float(p.base_price) if p.base_price is not None else 0.0) for p in plots if getattr(p, 'status', None) == 'SOLD'))

        return {
            "id": project.id,
            "name": project.name,
            "developer": project.developer_name,
            "type": project.project_type,
            "landClassification": project.land_classification,
            "status": project.status,
            "location": loc_str,
            "description": project.description or "",
            "totalPlots": total_plots,
            "soldPlots": sold_plots,
            "availablePlots": available_plots,
            "reservedPlots": reserved_plots,
            "blockedPlots": blocked_plots,
            "revenue": revenue,
            "locationDetails": {
                "state": loc.state if loc else "", "district": loc.district if loc else "", "taluka": loc.taluka if loc else "",
                "cityVillage": loc.city_village if loc else "", "pincode": loc.pincode if loc else "", "surveyNumbers": surveys_arr,
                "latitude": float(loc.latitude) if (loc and loc.latitude) else None,
                "longitude": float(loc.longitude) if (loc and loc.longitude) else None,
                "approvingAuthority": leg.approval_authority if leg else "", "reraNo": leg.rera_number if leg else ""
            },
            "landDetails": {
                "grossArea": float(comm.gross_land_area) if comm else 0.0, "areaUnit": comm.area_unit if comm else "Acres",
                "baseRatePerSqFt": float(comm.base_rate_per_sqft) if (comm and comm.base_rate_per_sqft) else None,
                "priceMin": float(comm.min_price) if (comm and comm.min_price) else None,
                "priceMax": float(comm.max_price) if (comm and comm.max_price) else None
            },
            "totalArea": total_area, "priceRange": price_range,
            "startDate": comm.launch_date.strftime("%Y-%m-%d") if (comm and comm.launch_date) else None,
            "expectedCompletion": comm.completion_date.strftime("%Y-%m-%d") if (comm and comm.completion_date) else "",
            "layoutUploaded": bool(layout), "layoutSource": layout_dict,
            "createdAt": project.created_at.isoformat() if project.created_at else "",
            "updatedAt": project.updated_at.isoformat() if project.updated_at else ""
        }
