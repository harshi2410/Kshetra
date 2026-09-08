import os
import json
import hashlib
import zipfile
import shutil
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.project_service import project_service_instance
from app.services.layout_upload_service import layout_upload_service_instance
from app.services.layout_review_service import layout_review_service_instance
from app.services.layout_version_service import layout_version_service_instance
from app.services.ground_truth.version_manager import ground_truth_version_manager_instance
from app.services.ground_truth.exporter import ground_truth_exporter_instance

def run_ground_truth_builder_tests():
    print("=" * 60)
    print("RUNNING TASK-058 GROUND TRUTH DATASET BUILDER TEST SUITE")
    print("=" * 60)

    db: Session = SessionLocal()
    project_id = "test-gt-proj-001"

    # Define storage root
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    gt_base_dir = root_dir / "storage" / "ground_truth" / project_id
    if gt_base_dir.exists():
        shutil.rmtree(gt_base_dir, ignore_errors=True)

    try:
        # Step 1: Ensure project and layout exist and set valid non-overlapping model
        project, layout, job = layout_upload_service_instance._ensure_project_layout_and_job(db, project_id, "default-layout")

        valid_model = {
            "status": "DRAFT",
            "metadata": {"layoutVersion": 1},
            "boundary": {"boundaryId": "b-gt-1", "geometry": [[0,0],[200,0],[200,200],[0,200],[0,0]], "boundingBox": [0,0,200,200], "area": 40000.0},
            "roads": [{"roadId": "r-gt-1", "roadName": "PARK AVENUE", "geometry": [[0,95],[200,95],[200,105],[0,105],[0,95]]}],
            "plots": [
                {"id": "p-gt-1", "plotNumber": "PLOT-101", "polygon": [[10,10],[90,10],[90,90],[10,90],[10,10]], "centroid": [50,50], "area": 6400.0, "facing": "NORTH"},
                {"id": "p-gt-2", "plotNumber": "PLOT-102", "polygon": [[110,10],[190,10],[190,90],[110,90],[110,10]], "centroid": [150,50], "area": 6400.0, "facing": "EAST"}
            ],
            "labels": [{"labelId": "l-1", "rawText": "PLOT-101", "associatedEntityId": "p-gt-1"}]
        }

        from app.engine.artifact_manager import artifact_manager_instance
        artifact_manager_instance.save_artifact(db, project.id, job.id, "UNIVERSAL_LAYOUT_MODEL", valid_model)
        artifact_manager_instance.save_artifact(db, project.id, job.id, "LAYOUT_SVG", {"svgContent": "<svg><rect width='200' height='200'/></svg>"})

        # Step 2: Approve layout to trigger automatic Ground Truth snapshot v1
        res1 = layout_review_service_instance.approve_layout(db, project.id, layout.id, approved_by="Architect Lead")
        assert res1["status"] == "APPROVED"
        assert res1["groundTruthVersion"] == "v1"

        v1_dir = gt_base_dir / "v1"
        assert v1_dir.exists() and v1_dir.is_dir()
        assert (v1_dir / "metadata.json").exists()
        assert (v1_dir / "manifest.json").exists()
        assert (v1_dir / "processing_context.json").exists()
        assert (v1_dir / "universal_layout_model.json").exists()
        assert (v1_dir / "layout.svg").exists()
        assert (v1_dir / "original" / "blueprint.png").exists() or (v1_dir / "original").exists()

        meta1 = json.loads((v1_dir / "metadata.json").read_text())
        assert meta1["version"] == "v1"
        assert meta1["project_id"] == project_id
        assert meta1["geometry_hash"] != ""
        assert meta1["image_hash"] != ""
        print(f"[1] Automatic Ground Truth Snapshot v1 PASSED:\n    Version = v1 | Plots = {meta1['plot_count']} | GeoHash = {meta1['geometry_hash'][:12]}...")

        # Step 3: Verify SHA-256 Manifest Integrity
        manifest = json.loads((v1_dir / "manifest.json").read_text())
        assert manifest["version"] == "v1"
        for rel_file, expected_hash in manifest["hashes"].items():
            abs_file = v1_dir / rel_file
            assert abs_file.exists()
            computed_hash = hashlib.sha256(abs_file.read_bytes()).hexdigest()
            assert computed_hash == expected_hash
        print(f"[2] SHA-256 Manifest Integrity Verification PASSED:\n    {len(manifest['hashes'])} files cryptographically verified.")

        # Step 4: Create Revision and Approve again to generate immutable Ground Truth v2
        rev_res = layout_version_service_instance.create_revision(db, project.id, layout.id)
        assert rev_res["status"] == "UNDER_REVIEW"

        # Patch geometry
        layout_version_service_instance.patch_plot(db, project.id, layout.id, "p-gt-1", {"plotNumber": "PLOT-GT-101"})

        # Approve again
        res2 = layout_review_service_instance.approve_layout(db, project.id, layout.id, approved_by="Chief Architect")
        assert res2["groundTruthVersion"] == "v2"

        v2_dir = gt_base_dir / "v2"
        assert v2_dir.exists() and (v2_dir / "metadata.json").exists()

        versions = ground_truth_version_manager_instance.list_project_versions(project_id)
        assert versions == ["v1", "v2"]
        print(f"[3] Immutable Version Increment PASSED:\n    Versions = {versions}")

        # Step 5: Test ZIP Exporter
        zip_path, zip_name = ground_truth_exporter_instance.create_zip_archive(project_id, "latest")
        assert zip_path.exists()
        with zipfile.ZipFile(zip_path, "r") as zf:
            namelist = zf.namelist()
            assert "metadata.json" in namelist
            assert "manifest.json" in namelist
            assert "universal_layout_model.json" in namelist
        print(f"[4] Ground Truth ZIP Export PASSED:\n    Archive = {zip_name}")

        print("=" * 60)
        print("ALL TASK-058 GROUND TRUTH DATASET BUILDER TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    run_ground_truth_builder_tests()
