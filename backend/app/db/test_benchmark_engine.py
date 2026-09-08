import sys
import json
import shutil
from pathlib import Path
from sqlalchemy.orm import Session

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.services.benchmark.benchmark_service import benchmark_service_instance
from app.services.benchmark.schemas import BenchmarkThresholds
from app.models.project import Project, LayoutProcessingArtifact

def _create_mock_ground_truth(project_id: str):
    root_dir = Path(__file__).resolve().parent.parent.parent.parent / "storage" / "ground_truth" / project_id
    if root_dir.exists():
        shutil.rmtree(root_dir)
        
    v1_dir = root_dir / "v1"
    v1_dir.mkdir(parents=True)
    
    gt_model = {
        "status": "APPROVED",
        "boundary": {"geometry": [[0,0],[100,0],[100,100],[0,100],[0,0]]},
        "roads": [{"geometry": [[0,45],[100,45],[100,55],[0,55],[0,45]]}],
        "plots": [
            {"id": "gt-p1", "polygon": [[5,5],[45,5],[45,40],[5,40],[5,5]]},
            {"id": "gt-p2", "polygon": [[55,5],[95,5],[95,40],[55,40],[55,5]]}
        ],
        "labels": [
            {"rawText": "PLOT 101", "associatedEntityId": "gt-p1"},
            {"rawText": "PLOT 102", "associatedEntityId": "gt-p2"}
        ]
    }
    
    model_str = json.dumps(gt_model, indent=2)
    model_path = v1_dir / "universal_layout_model.json"
    model_path.write_text(model_str, encoding="utf-8")
    
    metadata_str = '{"version": "v1"}'
    meta_path = v1_dir / "metadata.json"
    meta_path.write_text(metadata_str, encoding="utf-8")
    
    import hashlib
    def get_hash(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()
        
    manifest = {
        "version": "v1",
        "hashes": {
            "universal_layout_model.json": get_hash(model_path),
            "metadata.json": get_hash(meta_path)
        }
    }
    manifest_path = v1_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

def run_benchmark_tests():
    print("=" * 60)
    print("RUNNING TASK-059 BENCHMARK ENGINE TEST SUITE")
    print("=" * 60)
    
    project_id = "test-benchmark-001"
    db = SessionLocal()
    
    _create_mock_ground_truth(project_id)
    
    # 1. Perfect Prediction
    perfect_pred = {
        "boundary": {"geometry": [[0,0],[100,0],[100,100],[0,100],[0,0]]},
        "roads": [{"geometry": [[0,45],[100,45],[100,55],[0,55],[0,45]]}],
        "plots": [
            {"polygon": [[5,5],[45,5],[45,40],[5,40],[5,5]]},
            {"polygon": [[55,5],[95,5],[95,40],[55,40],[55,5]]}
        ],
        "labels": [
            {"rawText": "PLOT 101", "associatedEntityId": "gt-p1"},
            {"rawText": "PLOT 102", "associatedEntityId": "gt-p2"}
        ]
    }
    
    res1 = benchmark_service_instance.evaluate_layout(project_id, perfect_pred, "1.0", "HEAD")
    assert res1.plots.matched_count == 2
    assert res1.plots.mean_iou == 1.0
    assert res1.ocr.f1_score == 1.0
    assert res1.is_production_acceptable is True
    print("[1] Perfect Benchmark Match PASSED.")
    
    # 2. Flawed Prediction
    flawed_pred = {
        "boundary": {"geometry": [[10,10],[100,0],[100,100],[0,100],[10,10]]},
        "roads": [],
        "plots": [
            {"polygon": [[5,5],[40,5],[40,40],[5,40],[5,5]]} # Missing p2, p1 slightly smaller
        ],
        "labels": [
            {"rawText": "PLT 101", "associatedEntityId": "gt-p1"} # Levenshtein distance 1
        ]
    }
    
    res2 = benchmark_service_instance.evaluate_layout(project_id, flawed_pred, "1.0", "HEAD")
    assert res2.plots.matched_count == 1
    assert res2.plots.missing_count == 1
    assert res2.plots.mean_iou < 1.0
    assert res2.roads.ground_truth_count == 1
    assert res2.roads.predicted_count == 0
    assert res2.ocr.exact_match_ratio == 0.0
    assert res2.ocr.mean_levenshtein_distance > 0.0
    assert "MISSING_PLOTS" in res2.failure_categories
    assert "ROAD_FAILURE" in res2.failure_categories
    assert res2.is_production_acceptable is False
    print("[2] Flawed Benchmark Measurement PASSED.")
    
    print("ALL TASK-059 BENCHMARK ENGINE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_benchmark_tests()
