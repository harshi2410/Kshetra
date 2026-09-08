"""
Unit & Integration Test Suite for InputIngestionEngine (Phase 2).
Validates multi-format ingestion, stream analysis (vector vs raster),
metadata preservation, coordinate transforms, and artifact persistence.
"""

import os
import json
import uuid
import pytest
import numpy as np
import cv2
from pathlib import Path

from app.engine.input_ingestion_engine import input_ingestion_engine_instance, DocumentIngestionResult
from app.db.session import SessionLocal
from app.models.project import Project, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact
from app.engine.pipeline_stages_a import PipelineStagesA
from app.engine.artifact_manager import artifact_manager_instance


def test_raster_image_ingestion(tmp_path):
    """Test intake of native raster images (PNG, JPG) with dimension and DPI tracking."""
    test_img = np.ones((600, 900, 3), dtype=np.uint8) * 240
    # Draw sample boundary box
    cv2.rectangle(test_img, (50, 50), (850, 550), (0, 0, 0), 2)
    img_path = tmp_path / "test_blueprint_site.png"
    cv2.imwrite(str(img_path), test_img)

    result = input_ingestion_engine_instance.ingest_document(
        file_path_str=str(img_path),
        scale_ratio_hint="1:500",
        target_render_dpi=300
    )

    assert isinstance(result, DocumentIngestionResult)
    assert result.file_type == "PNG"
    assert result.source_type == "RASTER_IMAGE"
    assert result.dimensions["widthPx"] == 900
    assert result.dimensions["heightPx"] == 600
    assert result.dimensions["aspectRatio"] == 1.5
    assert result.dpi == 300
    assert result.page_count == 1
    assert result.scale_ratio_hint == "1:500"
    assert result.coordinate_transform["unit"] == "PIXELS"


def test_cad_dxf_ingestion(tmp_path):
    """Test intake of CAD DXF blueprint format."""
    dxf_path = tmp_path / "site_plan.dxf"
    dxf_path.write_text("0\nSECTION\n2\nENTITIES\n0\nLINE\n0\nENDSEC\n0\nEOF\n")

    result = input_ingestion_engine_instance.ingest_document(
        file_path_str=str(dxf_path),
        scale_ratio_hint="1:1000"
    )

    assert result.file_type == "DXF"
    assert result.source_type == "CAD_DXF"
    assert result.has_vector_stream is True
    assert result.recommended_pipeline == "CAD_DXF_PARSER"


def test_pipeline_integration_artifact_saving(tmp_path):
    """Test database artifact generation and stage execution."""
    db = SessionLocal()
    proj_id = str(uuid.uuid4())
    layout_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    try:
        # Create temporary project and layout record
        test_img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        img_path = tmp_path / "integration_test.png"
        cv2.imwrite(str(img_path), test_img)

        proj = Project(
            id=proj_id,
            name="Ingestion Test Project",
            developer_name="LandOS Dev",
            project_type="Residential",
            land_classification="N.A. Residential",
            status="DRAFT"
        )
        db.add(proj)
        db.commit()

        layout = LayoutSource(
            id=layout_id,
            project_id=proj.id,
            file_name="integration_test.png",
            file_path=str(img_path),
            file_type="PNG",
            file_size_bytes=os.path.getsize(str(img_path)),
            mime_type="image/png",
            scale_ratio="1:500",
            upload_status="UPLOADED"
        )
        db.add(layout)
        db.commit()

        job = LayoutProcessingJob(
            id=job_id,
            project_id=proj.id,
            layout_source_id=layout.id,
            status="QUEUED",
            stage="INSPECTION",
            progress_percentage=0
        )
        db.add(job)
        db.commit()

        # Run Stage 1 (Inspection & Ingestion)
        pipeline = PipelineStagesA()
        clm_res = pipeline.run_inspection_stage(db, proj.id, layout.id, job.id)

        assert clm_res is not None

        # Verify INGESTION_METADATA artifact in PostgreSQL
        artifact = artifact_manager_instance.get_latest_artifact_by_type(db, job.id, "INGESTION_METADATA")
        assert artifact is not None
        assert artifact.content_json is not None

        art_data = json.loads(artifact.content_json)
        assert art_data["artifactType"] == "INGESTION_METADATA"
        assert art_data["sourceType"] == "RASTER_IMAGE"
        assert art_data["dimensions"]["widthPx"] == 600
        assert art_data["dimensions"]["heightPx"] == 400

    finally:
        # Cleanup test records
        try:
            db.query(LayoutProcessingArtifact).filter(LayoutProcessingArtifact.project_id == proj.id).delete()
            db.query(LayoutProcessingJob).filter(LayoutProcessingJob.project_id == proj.id).delete()
            db.query(LayoutSource).filter(LayoutSource.project_id == proj.id).delete()
            db.query(Project).filter(Project.id == proj.id).delete()
            db.commit()
        except Exception:
            pass
        db.close()


if __name__ == "__main__":
    pytest.main(["-s", __file__])
