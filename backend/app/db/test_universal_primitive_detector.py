import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.universal_primitive_detector import universal_primitive_detector_instance

def run_universal_primitive_detector_tests():
    print("=" * 60)
    print("RUNNING TASK-043 UNIVERSAL PRIMITIVE DETECTION ENGINE TEST SUITE")
    print("=" * 60)

    # 1. VECTOR PRIMITIVES TEST CASE
    vec_dict = {
        "canvasWidth": 1000,
        "canvasHeight": 800,
        "primitives": [
            {
                "id": "v1",
                "primitiveType": "POLYGON",
                "isClosed": True,
                "area": 400000.0,
                "boundingBox": [50.0, 50.0, 950.0, 750.0]
            },
            {
                "id": "v2",
                "primitiveType": "POLYGON",
                "isClosed": True,
                "area": 12000.0,
                "boundingBox": [100.0, 100.0, 200.0, 220.0]
            }
        ]
    }
    res_vec = universal_primitive_detector_instance.detect_universal_primitives(vec_dict, source_pipeline="VECTOR")
    print(f"[1] Vector Primitives Classification PASSED:")
    print(f"    Source = {res_vec['sourcePipeline']} | Total = {res_vec['totalCount']} | Boundary = {res_vec['boundaryCandidatesCount']}")
    assert res_vec["artifactType"] == "UNIVERSAL_PRIMITIVES"
    assert res_vec["sourcePipeline"] == "VECTOR"
    assert res_vec["boundaryCandidatesCount"] == 1

    # 2. RASTER PRIMITIVES TEST CASE
    ras_dict = {
        "canvasWidth": 1200,
        "canvasHeight": 800,
        "primitives": [
            {
                "primitiveId": "r1",
                "primitiveType": "POLYGON",
                "isClosed": True,
                "area": 5000.0,
                "boundingBox": [100.0, 100.0, 800.0, 120.0]  # Long thin road shape
            },
            {
                "primitiveId": "r2",
                "primitiveType": "POLYGON",
                "isClosed": True,
                "area": 10.0,
                "boundingBox": [300.0, 300.0, 310.0, 315.0]  # Small text region
            }
        ]
    }
    res_ras = universal_primitive_detector_instance.detect_universal_primitives(ras_dict, source_pipeline="RASTER")
    print(f"[2] Raster Primitives Classification PASSED:")
    print(f"    Source = {res_ras['sourcePipeline']} | Roads = {res_ras['roadCandidatesCount']} | Text = {res_ras['textRegionsCount']}")
    assert res_ras["artifactType"] == "UNIVERSAL_PRIMITIVES"
    assert res_ras["roadCandidatesCount"] == 1
    assert res_ras["textRegionsCount"] == 1

    # 3. MIXED PRIMITIVE INPUT TEST CASE
    mixed_dict = {
        "canvasWidth": 1000,
        "canvasHeight": 1000,
        "primitives": [
            {
                "id": "m1",
                "primitiveType": "LINE",
                "isClosed": False,
                "area": 0.0,
                "boundingBox": [0.0, 0.0, 500.0, 500.0]
            },
            {
                "id": "m2",
                "primitiveType": "POLYGON",
                "isClosed": True,
                "area": 15000.0,
                "boundingBox": [200.0, 200.0, 350.0, 300.0]
            }
        ]
    }
    res_mixed = universal_primitive_detector_instance.detect_universal_primitives(mixed_dict, source_pipeline="MIXED")
    print(f"[3] Mixed Primitive Input PASSED:")
    print(f"    Open Regions = {res_mixed['openRegionsCount']} | Plots = {res_mixed['plotCandidatesCount']}")
    assert res_mixed["openRegionsCount"] == 1
    assert res_mixed["plotCandidatesCount"] == 1

    # 4. EMPTY INPUT TEST CASE (NO CRASH GUARANTEE)
    empty_dict = {}
    res_empty = universal_primitive_detector_instance.detect_universal_primitives(empty_dict, source_pipeline="RASTER")
    print(f"[4] Empty Input Vectorization PASSED (No Crash):")
    print(f"    Total Primitives = {res_empty['totalCount']}")
    assert res_empty["artifactType"] == "UNIVERSAL_PRIMITIVES"
    assert res_empty["totalCount"] == 0

    print("=" * 60)
    print("ALL TASK-043 UNIVERSAL PRIMITIVE DETECTION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_universal_primitive_detector_tests()
