"""
Pipeline Stages B (Stages 1.7 to 1.14 & Stages 5 to 12).
Handles Universal Primitives, Geometry Graph, Semantic Boundary & Road Extraction,
OCR Linking, Buildable Area Computation, Constraint Validation, Multi-Objective Scoring,
and Layout Reconstruction.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.project import LayoutSource, LayoutProcessingJob
from app.engine.artifact_manager import artifact_manager_instance
from app.engine.universal_primitive_detector import universal_primitive_detector_instance
from app.engine.geometry_relationship_graph import geometry_relationship_graph_instance
from app.engine.road_detection_engine import road_detection_engine_instance
from app.engine.boundary_detection_engine import boundary_detection_engine_instance
from app.engine.plot_detection_engine import plot_detection_engine_instance
from app.engine.ocr_text_engine import ocr_text_engine_instance
from app.engine.label_association_engine import label_association_engine_instance
from app.engine.buildable_area_engine import buildable_area_engine_instance
from app.engine.constraint_validation_engine import constraint_validation_engine_instance
from app.engine.layout_scorer import layout_scorer_instance
from app.engine.universal_layout_reconstruction_engine import universal_layout_reconstruction_engine_instance
from app.engine.plot_persister import plot_persister_instance

logger = logging.getLogger(__name__)


class PipelineStagesB:
    """Pipeline Stages (Primitives, Graph, Roads, Boundary, Plots, OCR, Labels, Buildable Area, Reconstruction, Persister)."""

    def run_universal_primitive_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "UNIVERSAL_PRIMITIVE_DETECTION", 38
        db.commit()

        r_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "RASTER_VECTOR_PRIMITIVES")
        r_dict = json.loads(r_art.content_json) if r_art and r_art.content_json else {}
        u_res = universal_primitive_detector_instance.detect_universal_primitives(r_dict, source_pipeline="RASTER")
        artifact_manager_instance.save_artifact(db, project_id, job_id, "UNIVERSAL_PRIMITIVES", u_res)
        job.result_summary = json.dumps({"message": "Universal primitives completed"})
        db.commit()
        return u_res

    def run_geometry_relationship_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "GEOMETRY_RELATIONSHIP_GRAPH", 40
        db.commit()

        u_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "UNIVERSAL_PRIMITIVES")
        u_dict = json.loads(u_art.content_json) if u_art and u_art.content_json else {}
        g_res = geometry_relationship_graph_instance.compute_relationship_graph(u_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "GEOMETRY_RELATIONSHIP_GRAPH", g_res)
        job.result_summary = json.dumps({"message": "Geometry relationship graph completed"})
        db.commit()
        return g_res

    def run_road_detection_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "ROAD_DETECTION", 44
        db.commit()

        u_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "UNIVERSAL_PRIMITIVES")
        g_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "GEOMETRY_RELATIONSHIP_GRAPH")
        s_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "SEMANTIC_SEGMENTATION_MASKS")

        u_dict = json.loads(u_art.content_json) if u_art and u_art.content_json else {}
        g_dict = json.loads(g_art.content_json) if g_art and g_art.content_json else {}
        s_dict = json.loads(s_art.content_json) if s_art and s_art.content_json else {}

        rd_res = road_detection_engine_instance.detect_roads(
            universal_primitives_dict=u_dict,
            geometry_graph_dict=g_dict,
            segmentation_masks_dict=s_dict
        )
        artifact_manager_instance.save_artifact(db, project_id, job_id, "ROAD_NETWORK", rd_res)
        job.result_summary = json.dumps({"message": "Road detection completed", "roadsCount": rd_res.get("totalRoadsCount", 0)})
        db.commit()
        return rd_res

    def run_boundary_detection_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "BOUNDARY_DETECTION", 48
        db.commit()

        u_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "UNIVERSAL_PRIMITIVES")
        g_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "GEOMETRY_RELATIONSHIP_GRAPH")
        r_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "ROAD_NETWORK")
        s_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "SEMANTIC_SEGMENTATION_MASKS")

        u_dict = json.loads(u_art.content_json or "{}") if u_art else {}
        g_dict = json.loads(g_art.content_json or "{}") if g_art else {}
        r_dict = json.loads(r_art.content_json or "{}") if r_art else {}
        s_dict = json.loads(s_art.content_json or "{}") if s_art else {}

        b_res = boundary_detection_engine_instance.detect_project_boundary(
            universal_primitives_dict=u_dict,
            geometry_graph_dict=g_dict,
            road_network_dict=r_dict,
            segmentation_masks_dict=s_dict
        )
        artifact_manager_instance.save_artifact(db, project_id, job_id, "PROJECT_BOUNDARY", b_res)
        job.result_summary = json.dumps({"message": "Boundary detection completed", "area": b_res.get("area", 0)})
        db.commit()
        return b_res

    def run_plot_detection_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "PLOT_DETECTION", 52
        db.commit()

        u_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "UNIVERSAL_PRIMITIVES").content_json or "{}")
        g_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "GEOMETRY_RELATIONSHIP_GRAPH").content_json or "{}")
        r_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "ROAD_NETWORK").content_json or "{}")
        b_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PROJECT_BOUNDARY").content_json or "{}")

        p_res = plot_detection_engine_instance.detect_plots(u_dict, g_dict, r_dict, b_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "DETECTED_PLOTS", p_res)
        job.result_summary = json.dumps({"message": "Plot detection completed", "plotsCount": p_res.get("totalPlotsCount", 0)})
        db.commit()
        return p_res

    def run_ocr_text_extraction_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "OCR_TEXT_EXTRACTION", 56
        db.commit()

        v_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "VISION_PROCESSING_CONTEXT")
        p_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PREPROCESSED_IMAGE")

        v_dict = json.loads(v_art.content_json or "{}") if v_art else {}
        p_dict = json.loads(p_art.content_json or "{}") if p_art else {}

        ocr_res = ocr_text_engine_instance.extract_text_elements(v_dict, p_dict, layout.file_path)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "OCR_TEXT_ELEMENTS", ocr_res)
        job.result_summary = json.dumps({"message": "OCR text extraction completed", "words": len(ocr_res.get("textElements", []))})
        db.commit()
        return ocr_res

    def run_label_association_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "LABEL_ASSOCIATION", 62
        db.commit()

        p_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "DETECTED_PLOTS").content_json or "{}")
        r_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "ROAD_NETWORK").content_json or "{}")
        b_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PROJECT_BOUNDARY").content_json or "{}")
        ocr_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "OCR_TEXT_ELEMENTS").content_json or "{}")

        lbl_res = label_association_engine_instance.associate_labels(p_dict, r_dict, b_dict, ocr_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "LABELED_LAYOUT", lbl_res)
        job.result_summary = json.dumps({"message": "Label association completed"})
        db.commit()
        return lbl_res

    def run_buildable_area_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        """Calculates exact usable buildable land domain via GEOS subtraction (Stage 8/9)."""
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "BUILDABLE_AREA_CALCULATION", 68
        db.commit()

        b_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PROJECT_BOUNDARY").content_json or "{}")
        r_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "ROAD_NETWORK").content_json or "{}")

        b_verts = b_dict.get("geometry") or b_dict.get("polygon", [])
        roads = r_dict.get("roads", [])
        green_spaces = r_dict.get("greenSpaces", [])
        obstacles = r_dict.get("obstacles", [])

        buildable_res = buildable_area_engine_instance.compute_buildable_area(
            boundary_vertices=b_verts,
            setback_ft=10.0,
            road_polygons=roads,
            green_spaces=green_spaces,
            obstacles=obstacles
        )
        buildable_dict = buildable_res.to_dict()
        artifact_manager_instance.save_artifact(db, project_id, job_id, "BUILDABLE_AREA", buildable_dict)
        job.result_summary = json.dumps({
            "message": "Buildable area calculated",
            "netBuildableSqft": buildable_dict.get("netBuildableAreaSqft", 0),
            "blocksCount": buildable_dict.get("totalBlocksCount", 0)
        })
        db.commit()
        return buildable_dict

    def run_reconstruction_and_persister_stages(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "RECONSTRUCTION", 78
        db.commit()

        l_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "LABELED_LAYOUT").content_json or "{}")
        r_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "ROAD_NETWORK").content_json or "{}")
        b_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PROJECT_BOUNDARY").content_json or "{}")
        p_dict = json.loads(artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "DETECTED_PLOTS").content_json or "{}")

        rec_res = universal_layout_reconstruction_engine_instance.reconstruct_universal_layout(l_dict, r_dict, b_dict, p_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "UNIVERSAL_LAYOUT_MODEL", rec_res)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "LAYOUT_SVG", {"svgContent": rec_res["svgContent"]}, mime_type="image/svg+xml")

        # 1. Run 12-rule Geometric Constraint Validation
        plots_list = rec_res.get("plots", [])
        roads_list = rec_res.get("roads", [])
        boundary_info = rec_res.get("boundary", {})

        val_report = constraint_validation_engine_instance.validate_layout(
            boundary_polygon=boundary_info.get("boundaryPolygon", []),
            plots=plots_list,
            roads=roads_list,
            min_plot_sqft=600.0,
            min_frontage_ft=15.0,
            min_road_width_ft=20.0,
            setback_ft=5.0
        )
        val_report_dict = val_report.to_dict()
        artifact_manager_instance.save_artifact(db, project_id, job_id, "GEOMETRIC_VALIDATION_REPORT", val_report_dict)

        # 2. Run Multi-Objective Layout Scoring
        score_breakdown = layout_scorer_instance.score_layout(
            gross_land_area_sqft=boundary_info.get("layoutArea", 0.0),
            plots=plots_list,
            roads=roads_list,
            validation_report=val_report_dict,
        )
        scoring_dict = score_breakdown.to_dict()
        artifact_manager_instance.save_artifact(db, project_id, job_id, "LAYOUT_SCORING_REPORT", scoring_dict)

        # 3. Generate 4 Multi-Strategy Layout Variants from True Extracted Boundary & Buildable Geometry
        try:
            from app.models.project import GeneratedLayoutVariant, Project
            from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine

            project = db.query(Project).filter(Project.id == project_id).first()
            gen_engine = LayoutGeneratorEngine()

            b_poly_verts = boundary_info.get("boundaryPolygon") or b_dict.get("geometry")
            target_sqft = getattr(project, "desired_plot_size_sqft", 1200.0) or 1200.0
            road_w = getattr(project, "road_width_ft", 30.0) or 30.0
            garden_p = getattr(project, "garden_percentage", 10.0) or 10.0
            gross_area = float(boundary_info.get("layoutArea") or 60000.0)

            # Estimate length/breadth from bounding box if not explicitly provided
            bbox = boundary_info.get("boundingBox", [0, 0, 300, 200])
            len_ft = max(float(bbox[2] - bbox[0]), 100.0)
            brd_ft = max(float(bbox[3] - bbox[1]), 100.0)

            variants = gen_engine.generate_all_variants(
                length_ft=len_ft,
                breadth_ft=brd_ft,
                polygon_vertices=b_poly_verts,
                target_plot_sqft=target_sqft,
                road_width_ft=road_w,
                garden_percentage=garden_p,
                setback_ft=5.0
            )

            if variants:
                db.query(GeneratedLayoutVariant).filter(GeneratedLayoutVariant.project_id == project_id).delete()
                for v in variants:
                    db_var = GeneratedLayoutVariant(
                        id=v.id,
                        project_id=project_id,
                        variant_number=v.variant_number,
                        strategy_name=v.strategy_name,
                        layout_model_json=json.dumps(v.to_layout_model()),
                        svg_content=v.to_svg(),
                        total_plots=v.total_plots,
                        total_area_sqft=v.land.total_area_sqft,
                        utilization_percent=v.utilization_percent,
                        is_selected=(v.variant_number == 1)
                    )
                    db.add(db_var)
                db.commit()
                logger.info(f"Persisted {len(variants)} generative layout variants for project {project_id}")
        except Exception as var_err:
            logger.warning(f"Generative variant persistence notice: {var_err}")

        # Finalize job
        job.status, job.stage, job.progress_percentage, job.completed_at = "COMPLETED", "PERSISTED", 100, datetime.now(timezone.utc)
        job.result_summary = json.dumps({
            "message": "AI Pipeline completed successfully",
            "plotsCount": len(plots_list),
            "roadsCount": len(roads_list),
            "overallCompliant": val_report.overall_compliant,
            "compositeScore": scoring_dict.get("compositeScore", 0.0)
        })
        db.commit()
        return rec_res
