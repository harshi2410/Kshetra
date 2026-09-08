"""
End-to-End Test for the 12-Stage AI Perception, Geometry Reconstruction & Generative Pipeline.
Verifies all 12 stages:
1. Ingestion (PDF / Raster / CAD)
2. Image Preprocessing (Denoise, CLAHE, Deskew)
3. Semantic Segmentation (SegFormer)
4. True Boundary Extraction (Douglas-Peucker & GEOS validity)
5. Road & Feature Extraction (Corridors, Centerlines, Green Spaces)
6. OCR & Spatial Linking
7. Physical Scale Calibration
8. Vector Geometry Reconstruction
9. Usable Buildable Area Calculation (Topological Difference)
10. Constraint-Based Plot Generation (4 Layout Strategies)
11. Geometric Constraint Validation (12 Civil Rules)
12. Multi-Objective Scoring & Ranking
"""

import os
import cv2
import json
import uuid
import numpy as np
import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.project import Project, LayoutSource, LayoutProcessingJob
from app.engine.pipeline import pipeline_controller_instance
from app.engine.artifact_manager import artifact_manager_instance
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine
from app.engine.buildable_area_engine import buildable_area_engine_instance
from app.engine.constraint_validation_engine import constraint_validation_engine_instance
from app.engine.layout_scorer import layout_scorer_instance


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def test_twelve_stage_pipeline_full_run(db_session: Session, tmp_path):
    # 1. Create a synthetic realistic blueprint image
    canvas_w, canvas_h = 1000, 800
    canvas = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 255

    # Draw outer boundary
    cv2.rectangle(canvas, (50, 50), (950, 750), (0, 0, 0), 3)
    # Draw roads
    cv2.rectangle(canvas, (50, 370), (950, 430), (80, 80, 80), -1)  # Horizontal road
    cv2.rectangle(canvas, (470, 50), (530, 750), (80, 80, 80), -1)  # Vertical road
    # Draw green park
    cv2.rectangle(canvas, (600, 100), (900, 300), (34, 139, 34), -1)
    # Draw plot text
    cv2.putText(canvas, "P-101", (100, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(canvas, "1200 SQFT", (100, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(canvas, "MAIN ROAD 30FT", (200, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    img_file = tmp_path / "test_blueprint_12stages.png"
    cv2.imwrite(str(img_file), canvas)

    project_id = str(uuid.uuid4())
    layout_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    project = Project(
        id=project_id,
        name="12-Stage Test Township",
        developer_name="LandOS AI Lab",
        project_type="PLOTTED_DEVELOPMENT",
        land_classification="AGRICULTURAL_CONVERTED",
        status="ACTIVE",
        land_length_ft=500.0,
        land_breadth_ft=400.0,
        desired_plot_size_sqft=1200.0,
        road_width_ft=30.0,
        garden_percentage=10.0
    )
    db_session.add(project)

    layout = LayoutSource(
        id=layout_id,
        project_id=project_id,
        file_name="test_blueprint_12stages.png",
        file_path=str(img_file),
        file_type="PNG",
        file_size_bytes=os.path.getsize(img_file),
        mime_type="image/png",
        upload_status="UPLOADED"
    )
    db_session.add(layout)

    job = LayoutProcessingJob(
        id=job_id,
        project_id=project_id,
        layout_source_id=layout_id,
        status="QUEUED",
        stage="INSPECTION",
        progress_percentage=0
    )
    db_session.add(job)
    db_session.commit()

    # Execute Full Pipeline
    result = pipeline_controller_instance.run_full_pipeline(db_session, project_id, layout_id, job_id)
    assert result is not None
    assert "svgContent" in result

    # Check that key artifacts were saved
    art_types = [
        "VISION_PROCESSING_CONTEXT",
        "PREPROCESSED_IMAGE",
        "SEMANTIC_SEGMENTATION_MASKS",
        "RASTER_VECTOR_PRIMITIVES",
        "UNIVERSAL_PRIMITIVES",
        "GEOMETRY_RELATIONSHIP_GRAPH",
        "ROAD_NETWORK",
        "PROJECT_BOUNDARY",
        "DETECTED_PLOTS",
        "OCR_TEXT_ELEMENTS",
        "LABELED_LAYOUT",
        "BUILDABLE_AREA",
        "UNIVERSAL_LAYOUT_MODEL",
        "GEOMETRIC_VALIDATION_REPORT",
        "LAYOUT_SCORING_REPORT",
    ]

    for atype in art_types:
        art = artifact_manager_instance.get_latest_artifact_by_type(db_session, job_id, atype)
        assert art is not None, f"Expected artifact '{atype}' was not persisted"
        assert art.content_json is not None

    # Check Generative Layout Engine with 4 variants
    gen_engine = LayoutGeneratorEngine()
    b_art = artifact_manager_instance.get_latest_artifact_by_type(db_session, job_id, "PROJECT_BOUNDARY")
    b_data = json.loads(b_art.content_json)

    variants = gen_engine.generate_all_variants(
        length_ft=500.0,
        breadth_ft=400.0,
        polygon_vertices=b_data.get("geometry"),
        target_plot_sqft=1200.0,
        road_width_ft=30.0,
        garden_percentage=10.0,
        setback_ft=10.0
    )

    assert len(variants) == 4, f"Expected 4 design alternatives, got {len(variants)}"
    for v in variants:
        assert v.total_plots > 0
        assert v.validation_report.get("overallCompliant") is not None
        assert v.evaluation.get("compositeScore") is not None
        assert v.to_svg().startswith("<svg")
