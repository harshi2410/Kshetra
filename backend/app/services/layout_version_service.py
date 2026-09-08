import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.project import LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact
from app.engine.universal_layout_reconstruction_engine import universal_layout_reconstruction_engine_instance
from app.engine.geometry_engine import geometry_engine_instance

logger = logging.getLogger(__name__)

class LayoutVersionService:
    """
    Layout Versioning & Geometry Patching Service (TASK-056 / TASK-057)
    Provides endpoints for PATCHing plot/road/boundary geometry & metadata,
    maintains incremental version snapshots (Version 1, 2, 3...), handles rollbacks,
    and enforces read-only locking on APPROVED layouts.
    """

    def _get_latest_model(self, db: Session, project_id: str) -> Tuple[Optional[LayoutProcessingArtifact], Dict[str, Any]]:
        art = db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.project_id == project_id,
            LayoutProcessingArtifact.artifact_type.in_(["UNIVERSAL_LAYOUT_MODEL", "APPROVED_LAYOUT_MODEL"])
        ).order_by(LayoutProcessingArtifact.created_at.desc()).first()
        model_dict = json.loads(art.content_json) if (art and art.content_json) else {}
        return art, model_dict

    def _save_new_version(self, db: Session, project_id: str, layout: LayoutSource, model_dict: Dict[str, Any], change_summary: str) -> int:
        layout.layout_version = (layout.layout_version or 1) + 1
        layout.geometry_revision = (layout.geometry_revision or 1) + 1

        svg = universal_layout_reconstruction_engine_instance.generate_vector_svg(
            model_dict.get("boundary", {}),
            model_dict.get("roads", []),
            model_dict.get("plots", []),
            model_dict.get("labels", [])
        )
        model_dict["svgContent"] = svg
        model_dict["metadata"] = model_dict.get("metadata", {})
        model_dict["metadata"]["layoutVersion"] = layout.layout_version
        model_dict["metadata"]["changeSummary"] = change_summary
        model_dict["metadata"]["updatedAt"] = datetime.utcnow().isoformat() + "Z"

        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.layout_source_id == layout.id).order_by(LayoutProcessingJob.created_at.desc()).first()

        db.add(LayoutProcessingArtifact(
            project_id=project_id,
            job_id=job.id if job else layout.id,
            artifact_type="UNIVERSAL_LAYOUT_MODEL",
            content_json=json.dumps(model_dict)
        ))
        db.commit()
        db.refresh(layout)
        return layout.layout_version

    def patch_plot(self, db: Session, project_id: str, layout_id: str, plot_id: str, patch_data: Dict[str, Any]) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        if layout.layout_status in ["APPROVED", "LOCKED"]: raise ValueError(f"Layout '{layout_id}' is {layout.layout_status}. Geometry edits locked.")

        art, model = self._get_latest_model(db, project_id)
        plots = model.get("plots", [])
        updated = None

        for p in plots:
            pid = p.get("id") or p.get("plotId")
            if pid == plot_id:
                if "plotNumber" in patch_data: p["plotNumber"] = patch_data["plotNumber"]
                if "facing" in patch_data: p["facing"] = patch_data["facing"]
                if "dimensions" in patch_data: p["dimensions"] = patch_data["dimensions"]
                if "status" in patch_data: p["status"] = patch_data["status"]
                if "polygon" in patch_data:
                    geo = geometry_engine_instance.analyze_polygon(patch_data["polygon"])
                    p["polygon"] = geo["vertices"]
                    p["area"] = geo["area"]
                    p["perimeter"] = geo["perimeter"]
                    p["centroid"] = geo["centroid"]
                    p["wkt"], p["geoJson"] = geo["wkt"], geo["geoJson"]
                updated = p
                break

        if not updated: raise ValueError(f"Plot '{plot_id}' not found")
        v = self._save_new_version(db, project_id, layout, model, f"Patched plot '{plot_id}'")
        return {"version": v, "plot": updated, "layoutModel": model}

    def patch_road(self, db: Session, project_id: str, layout_id: str, road_id: str, patch_data: Dict[str, Any]) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        if layout.layout_status in ["APPROVED", "LOCKED"]: raise ValueError(f"Layout '{layout_id}' is {layout.layout_status}. Edits locked.")

        art, model = self._get_latest_model(db, project_id)
        roads = model.get("roads", [])
        updated = None
        for r in roads:
            rid = r.get("roadId")
            if rid == road_id:
                if "roadName" in patch_data: r["roadName"] = patch_data["roadName"]
                if "roadWidth" in patch_data: r["roadWidth"] = patch_data["roadWidth"]
                if "polygon" in patch_data:
                    geo = geometry_engine_instance.analyze_polygon(patch_data["polygon"])
                    r["polygon"] = geo["vertices"]
                    r["wkt"], r["geoJson"] = geo["wkt"], geo["geoJson"]
                updated = r
                break

        if not updated: raise ValueError(f"Road '{road_id}' not found")
        v = self._save_new_version(db, project_id, layout, model, f"Patched road '{road_id}'")
        return {"version": v, "road": updated, "layoutModel": model}

    def patch_full_model(self, db: Session, project_id: str, layout_id: str, new_model: Dict[str, Any], change_summary: str) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        if layout.layout_status in ["APPROVED", "LOCKED"]: raise ValueError(f"Layout '{layout_id}' is {layout.layout_status}. Edits locked.")

        v = self._save_new_version(db, project_id, layout, new_model, change_summary)
        return {"version": v, "layoutModel": new_model}

    def patch_georeference(self, db: Session, project_id: str, layout_id: str, geo_patch: Dict[str, Any]) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        if layout.layout_status in ["APPROVED", "LOCKED"]: raise ValueError(f"Layout '{layout_id}' is {layout.layout_status}. Edits locked.")

        art, model = self._get_latest_model(db, project_id)
        if "metadata" not in model: model["metadata"] = {}
        if "georeference" not in model["metadata"]:
            model["metadata"]["georeference"] = {
                "status": "UNCONFIGURED", "provider": "OSM", "latitude": None, "longitude": None,
                "zoom": 18, "rotation": 0, "scale": 1, "translation": {"x": 0, "y": 0}
            }
        
        current_geo = model["metadata"]["georeference"]
        current_geo.update(geo_patch)
        
        # Also update ProjectLocation if latitude/longitude changed
        if "latitude" in geo_patch or "longitude" in geo_patch:
            from app.models.project import ProjectLocation
            loc = db.query(ProjectLocation).filter(ProjectLocation.project_id == project_id).first()
            if loc:
                if "latitude" in geo_patch: loc.latitude = geo_patch["latitude"]
                if "longitude" in geo_patch: loc.longitude = geo_patch["longitude"]
                db.add(loc)

        # Re-calculate facing for all plots based on the new geographic rotation
        from app.engine.facing_calculator import facing_calculator_instance
        rotation = current_geo.get("layoutTransform", {}).get("rotation", 0)
        roads = model.get("roads", [])
        for p in model.get("plots", []):
            new_facing = facing_calculator_instance.calculate_plot_facing(p, roads, rotation)
            if new_facing != "UNKNOWN":
                p["facing"] = new_facing
            elif "facing" not in p:
                p["facing"] = "UNKNOWN"

        v = self._save_new_version(db, project_id, layout, model, "Updated geographic reference alignment")
        return {"version": v, "georeference": current_geo, "layoutModel": model}

    def create_revision(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        layout.layout_status = "UNDER_REVIEW"
        layout.geometry_revision = (layout.geometry_revision or 1) + 1
        db.commit()
        db.refresh(layout)
        return {"status": "UNDER_REVIEW", "geometryRevision": layout.geometry_revision}

    def rollback_version(self, db: Session, project_id: str, layout_id: str, target_version: int) -> Dict[str, Any]:
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout: raise ValueError("LayoutSource not found")
        artifacts = db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.project_id == project_id,
            LayoutProcessingArtifact.artifact_type == "UNIVERSAL_LAYOUT_MODEL"
        ).order_by(LayoutProcessingArtifact.created_at.asc()).all()

        match = None
        for a in artifacts:
            m = json.loads(a.content_json) if a.content_json else {}
            if m.get("metadata", {}).get("layoutVersion") == target_version:
                match = m
                break
        if not match: raise ValueError(f"Layout version {target_version} not found")
        v = self._save_new_version(db, project_id, layout, match, f"Rolled back to version {target_version}")
        return {"status": "SUCCESS", "rolledBackToVersion": target_version, "currentVersion": v}

layout_version_service_instance = LayoutVersionService()
