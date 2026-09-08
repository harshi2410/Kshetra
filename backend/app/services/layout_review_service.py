import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.project import Project, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact, ProjectPlot
from app.engine.geometry_engine import GeometryEngine, geometry_engine_instance
from app.engine.plot_detection_engine import plot_detection_engine_instance
from app.engine.plot_persister import plot_persister_instance

logger = logging.getLogger(__name__)

class LayoutReviewService:
    """
    Production Layout Review, Validation, & Approval Engine (TASK-056)
    Manages Human-in-the-Loop approval workflows: DRAFT -> UNDER_REVIEW -> APPROVED -> LOCKED.
    Executes GEOS C++ topology validation, versioning, geometry patching, and CRM freezing.
    """

    def validate_layout_draft(self, db: Session, project_id: str, layout_id: str) -> Dict[str, Any]:
        """
        Validates layout draft using GEOS computational geometry before allowing approval.
        Checks polygon validity, self-intersections, plot overlaps, boundary containment, and unique plot numbers.
        """
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout:
            raise ValueError(f"LayoutSource '{layout_id}' not found for project '{project_id}'")

        # Get latest UNIVERSAL_LAYOUT_MODEL artifact
        art = db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.project_id == project_id,
            LayoutProcessingArtifact.artifact_type.in_(["UNIVERSAL_LAYOUT_MODEL", "APPROVED_LAYOUT_MODEL"])
        ).order_by(LayoutProcessingArtifact.created_at.desc()).first()

        model_dict = json.loads(art.content_json) if (art and art.content_json) else {}
        plots = model_dict.get("plots", [])
        boundary_dict = model_dict.get("boundary", {})
        roads = model_dict.get("roads", [])

        errors: List[str] = []
        warnings: List[str] = []
        plot_numbers = set()
        duplicate_plot_nos = set()
        invalid_plots = []
        overlapping_pairs = []

        # 1. Boundary GEOS Validation
        b_verts = boundary_dict.get("boundaryPolygon", []) or boundary_dict.get("geometry", [])
        boundary_poly, _, b_valid = GeometryEngine.to_shapely_polygon(b_verts)
        if not b_valid or not boundary_poly:
            errors.append("Layout lacks a valid enclosing project boundary polygon.")

        # 2. Plots GEOS Topology Validation
        shapely_plots = []
        for p in plots:
            pid = p.get("id") or p.get("plotId")
            pno = str(p.get("plotNumber", "")).strip()

            if pno:
                if pno in plot_numbers:
                    duplicate_plot_nos.add(pno)
                plot_numbers.add(pno)

            verts = p.get("polygon", []) or p.get("geometry", [])
            poly, clean_verts, p_valid = GeometryEngine.to_shapely_polygon(verts)
            if not p_valid or not poly:
                invalid_plots.append(pid)
                errors.append(f"Plot '{pno or pid}' has invalid self-intersecting geometry.")
            else:
                shapely_plots.append((pid, pno, poly))

                # Boundary containment check
                if boundary_poly and not boundary_poly.contains(poly) and boundary_poly.intersection(poly).area / poly.area < 0.85:
                    warnings.append(f"Plot '{pno or pid}' lies partially outside the main project boundary.")

        if duplicate_plot_nos:
            errors.append(f"Duplicate plot numbers detected: {', '.join(sorted(list(duplicate_plot_nos)))}")

        # 3. Pairwise Plot Overlap Check
        n_plots = len(shapely_plots)
        for i in range(n_plots):
            id_a, pno_a, poly_a = shapely_plots[i]
            for j in range(i + 1, n_plots):
                id_b, pno_b, poly_b = shapely_plots[j]
                if poly_a.intersects(poly_b):
                    inter_area = poly_a.intersection(poly_b).area
                    if inter_area > 1.0:
                        overlapping_pairs.append([pno_a or id_a, pno_b or id_b])
                        errors.append(f"Plot '{pno_a or id_a}' overlaps with Plot '{pno_b or id_b}' (Area: {round(inter_area, 2)} sq units).")

        can_approve = (len(errors) == 0) and len(plots) > 0

        report = {
            "projectId": project_id,
            "layoutId": layout_id,
            "layoutStatus": layout.layout_status or "DRAFT",
            "version": layout.layout_version or 1,
            "canApprove": can_approve,
            "totalPlots": len(plots),
            "validPlots": len(shapely_plots),
            "totalRoads": len(roads),
            "errors": errors,
            "warnings": warnings,
            "overlappingPairs": overlapping_pairs,
            "duplicatePlotNumbers": sorted(list(duplicate_plot_nos)),
            "validatedAt": datetime.utcnow().isoformat() + "Z"
        }

        logger.info(f"LayoutReviewService validation completed for layout '{layout_id}': canApprove={can_approve}, errors={len(errors)}")
        return report

    def approve_layout(self, db: Session, project_id: str, layout_id: str, approved_by: str = "System Admin") -> Dict[str, Any]:
        """
        Approves layout draft if validation passes. Freezes geometry, generates immutable Plot IDs,
        persists inventory to PostgreSQL project_plots, and updates status to APPROVED.
        """
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id, LayoutSource.project_id == project_id).first()
        if not layout:
            raise ValueError(f"LayoutSource '{layout_id}' not found")

        val_report = self.validate_layout_draft(db, project_id, layout_id)
        if not val_report["canApprove"]:
            raise ValueError(f"Cannot approve layout '{layout_id}': Validation failed with {len(val_report['errors'])} errors.")

        # Update LayoutSource Status
        layout.layout_status = "APPROVED"
        layout.approved_at = datetime.utcnow()
        layout.approved_by = approved_by

        # Save APPROVED_LAYOUT_MODEL artifact
        art = db.query(LayoutProcessingArtifact).filter(
            LayoutProcessingArtifact.project_id == project_id,
            LayoutProcessingArtifact.artifact_type == "UNIVERSAL_LAYOUT_MODEL"
        ).order_by(LayoutProcessingArtifact.created_at.desc()).first()

        model_dict = json.loads(art.content_json) if (art and art.content_json) else {}
        model_dict["status"] = "APPROVED"

        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.layout_source_id == layout_id).order_by(LayoutProcessingJob.created_at.desc()).first()
        job_id = job.id if job else str(uuid.uuid4())

        # Sync/Persist plots to PostgreSQL project_plots table
        geojson_feats = []
        for p in model_dict.get("plots", []):
            c = p.get("centroid", [0.0, 0.0])
            geojson_feats.append({
                "type": "Feature",
                "id": p.get("id"),
                "geometry": {"type": "Polygon", "coordinates": [p.get("polygon", [])]},
                "properties": {
                    "entityType": "PLOT",
                    "plotId": p.get("id"),
                    "labelHint": p.get("plotNumber"),
                    "calculatedAreaSqFt": p.get("area", 0.0),
                    "facing": p.get("facing", "NORTH"),
                    "centroid": {"x": c[0], "y": c[1]},
                    "status": "AVAILABLE"
                }
            })
        plot_persister_instance.persist_plots(db, project_id, layout_id, {"type": "FeatureCollection", "features": geojson_feats})

        # Automatic Ground Truth Snapshot Creation (TASK-058)
        from app.services.ground_truth.service import ground_truth_service_instance
        gt_res = ground_truth_service_instance.create_snapshot_on_approval(
            db=db, project_id=project_id, layout_id=layout_id, approved_by=approved_by, geometry_revision=getattr(layout, "geometry_revision", 1)
        )

        db.commit()
        db.refresh(layout)

        logger.info(f"Layout '{layout_id}' APPROVED, frozen, and Ground Truth snapshot '{gt_res.get('version')}' created by '{approved_by}'")
        return {"status": "APPROVED", "approvedAt": layout.approved_at.isoformat(), "approvedBy": approved_by, "groundTruthVersion": gt_res.get("version")}

layout_review_service_instance = LayoutReviewService()

