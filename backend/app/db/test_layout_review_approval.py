import sys
import json
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.project import Project, LayoutSource, LayoutProcessingJob, LayoutProcessingArtifact, ProjectPlot
from app.services.project_service import project_service_instance
from app.services.layout_review_service import layout_review_service_instance
from app.services.layout_version_service import layout_version_service_instance

def run_layout_review_approval_tests():
    print("=" * 60)
    print("RUNNING TASK-056 LAYOUT REVIEW & APPROVAL TEST SUITE")
    print("=" * 60)

    db = SessionLocal()

    # Create Test Project & LayoutSource
    project_id = "test-proj-approval-001"
    layout_id = "test-layout-approval-001"

    # Cleanup existing
    project_service_instance.delete_project(db, project_id)

    proj = Project(id=project_id, name="Test Approval Project", developer_name="Dev Corp", project_type="PLOTTED_DEVELOPMENT", land_classification="AGRICULTURAL", status="ACTIVE")
    db.add(proj)

    layout = LayoutSource(id=layout_id, project_id=project_id, file_name="blueprint.png", file_path="uploads/sample_blueprint_greenfield.png", file_type="PNG", file_size_bytes=1024, mime_type="image/png", layout_status="DRAFT", layout_version=1)
    db.add(layout)

    job = LayoutProcessingJob(id="job-app-001", project_id=project_id, layout_source_id=layout_id, status="COMPLETED")
    db.add(job)

    # 1. Save Valid UNIVERSAL_LAYOUT_MODEL Artifact
    valid_model = {
        "status": "DRAFT",
        "metadata": {"layoutVersion": 1},
        "boundary": {"boundaryId": "b-1", "geometry": [[0,0],[100,0],[100,100],[0,100],[0,0]], "boundingBox": [0,0,100,100]},
        "roads": [{"roadId": "r-1", "roadName": "MAIN ROAD", "geometry": [[0,45],[100,45],[100,55],[0,55],[0,45]]}],
        "plots": [
            {"id": "p-1", "plotNumber": "101", "polygon": [[5,5],[45,5],[45,40],[5,40],[5,5]], "centroid": [25,22], "area": 1400.0},
            {"id": "p-2", "plotNumber": "102", "polygon": [[55,5],[95,5],[95,40],[55,40],[55,5]], "centroid": [75,22], "area": 1400.0}
        ],
        "labels": []
    }
    db.add(LayoutProcessingArtifact(project_id=project_id, job_id="job-app-001", artifact_type="UNIVERSAL_LAYOUT_MODEL", content_json=json.dumps(valid_model)))
    db.commit()

    # TEST 1: GEOS VALIDATION REPORT ON DRAFT
    val_report = layout_review_service_instance.validate_layout_draft(db, project_id, layout_id)
    print(f"[1] Layout Draft Validation PASSED:")
    print(f"    CanApprove = {val_report['canApprove']} | Errors = {len(val_report['errors'])}")
    assert val_report["canApprove"] is True
    assert len(val_report["errors"]) == 0

    # TEST 2: APPROVAL & GEOMETRY FREEZE
    app_res = layout_review_service_instance.approve_layout(db, project_id, layout_id, "Chief Architect")
    db.refresh(layout)
    print(f"[2] Layout Approval & Freeze PASSED:")
    print(f"    Status = {layout.layout_status} | ApprovedBy = {layout.approved_by}")
    assert layout.layout_status == "APPROVED"
    assert layout.approved_by == "Chief Architect"

    # Verify project_plots persistence
    db_plots = db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).all()
    print(f"    Persisted ProjectPlots DB Count = {len(db_plots)}")
    assert len(db_plots) == 2

    # TEST 3: READ-ONLY GEOMETRY LOCKING ON APPROVED LAYOUT
    locked_error = False
    try:
        layout_version_service_instance.patch_plot(db, project_id, layout_id, "p-1", {"plotNumber": "999"})
    except ValueError as e:
        locked_error = True
        print(f"[3] Read-Only Geometry Locking PASSED (Blocked edit on APPROVED layout): {e}")
    assert locked_error is True

    # TEST 4: CREATE REVISION & PATCH PLOT GEOMETRY
    rev_res = layout_version_service_instance.create_revision(db, project_id, layout_id)
    db.refresh(layout)
    print(f"[4] Create Revision PASSED:")
    print(f"    Status = {layout.layout_status} | GeometryRevision = {layout.geometry_revision}")
    assert layout.layout_status == "UNDER_REVIEW"

    patch_res = layout_version_service_instance.patch_plot(db, project_id, layout_id, "p-1", {"plotNumber": "101-A", "polygon": [[5,5],[40,5],[40,40],[5,40],[5,5]]})
    db.refresh(layout)
    print(f"[5] Patch Plot Geometry PASSED:")
    print(f"    New Layout Version = {patch_res['version']} | Updated PlotNo = {patch_res['plot']['plotNumber']}")
    assert patch_res["version"] == 2
    assert patch_res["plot"]["plotNumber"] == "101-A"

    # TEST 5: ROLLBACK VERSION
    roll_res = layout_version_service_instance.rollback_version(db, project_id, layout_id, target_version=1)
    print(f"[6] Rollback Version PASSED:")
    print(f"    Target Version Restored = {roll_res['rolledBackToVersion']} | Current Version = {roll_res['currentVersion']}")
    assert roll_res["status"] == "SUCCESS"

    # Cleanup
    project_service_instance.delete_project(db, project_id)
    db.close()

    print("=" * 60)
    print("ALL TASK-056 LAYOUT REVIEW & APPROVAL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_layout_review_approval_tests()
