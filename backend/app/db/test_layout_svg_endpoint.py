import os
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.project import Project, LayoutSource, LayoutProcessingJob
from app.engine.artifact_manager import artifact_manager_instance

client = TestClient(app)

def run_layout_svg_endpoint_tests():
    print("=" * 60)
    print("RUNNING TASK-051 LAYOUT SVG & MODEL ENDPOINT TEST SUITE")
    print("=" * 60)

    db = SessionLocal()
    try:
        project_id = str(uuid.uuid4())
        layout_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())

        # Setup DB records
        test_project = Project(
            id=project_id,
            name="SVG Endpoint Test Project",
            developer_name="LandOS Test Corp",
            project_type="PLOTTED_DEVELOPMENT",
            land_classification="AGRICULTURAL",
            status="ACTIVE"
        )
        layout_source = LayoutSource(
            id=layout_id,
            project_id=project_id,
            file_name="test_layout.png",
            file_path="/uploads/test_layout.png",
            file_type="PNG",
            file_size_bytes=1024,
            mime_type="image/png",
            upload_status="UPLOADED"
        )
        job = LayoutProcessingJob(
            id=job_id,
            project_id=project_id,
            layout_source_id=layout_id,
            status="COMPLETED",
            stage="UNIVERSAL_LAYOUT_RECONSTRUCTION",
            progress_percentage=100
        )
        db.add(test_project)
        db.add(layout_source)
        db.add(job)
        db.commit()

        # Save LAYOUT_SVG & UNIVERSAL_LAYOUT_MODEL artifacts
        artifact_manager_instance.save_artifact(
            db, project_id, job_id, "LAYOUT_SVG",
            {"svgContent": '<svg viewBox="0 0 100 100"><polygon points="0,0 100,0 100,100" data-plot-id="p101"/></svg>', "length": 80}
        )
        artifact_manager_instance.save_artifact(
            db, project_id, job_id, "UNIVERSAL_LAYOUT_MODEL",
            {"artifactType": "UNIVERSAL_LAYOUT_MODEL", "plots": [{"id": "p101", "plotNumber": "101"}]}
        )

        # 1. Test GET /api/v1/projects/{project_id}/layouts/{layout_id}/layout-svg
        res_svg = client.get(f"/api/v1/projects/{project_id}/layouts/{layout_id}/layout-svg")
        print(f"[1] GET /layout-svg PASSED (Status Code: {res_svg.status_code}):")
        assert res_svg.status_code == 200
        assert "svgContent" in res_svg.json()

        # 2. Test GET /api/v1/projects/{project_id}/layouts/{layout_id}/layout-model
        res_model = client.get(f"/api/v1/projects/{project_id}/layouts/{layout_id}/layout-model")
        print(f"[2] GET /layout-model PASSED (Status Code: {res_model.status_code}):")
        assert res_model.status_code == 200
        assert res_model.json()["artifactType"] == "UNIVERSAL_LAYOUT_MODEL"

        print("=" * 60)
        print("ALL TASK-051 LAYOUT SVG & MODEL ENDPOINT TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    run_layout_svg_endpoint_tests()
