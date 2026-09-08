import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.boundary_detection_engine import boundary_detection_engine_instance

def run_boundary_detection_engine_tests():
    print("=" * 60)
    print("RUNNING TASK-046 BOUNDARY DETECTION ENGINE TEST SUITE")
    print("=" * 60)

    # 1. BOUNDARY DETECTION & LARGEST ENCLOSING POLYGON / GAP REPAIR TEST CASE
    universal_primitives = {
        "universalPrimitives": [
            {
                "id": "outer-boundary-poly",
                "primitiveType": "POLYGON",
                "candidateType": "BOUNDARY_CANDIDATE",
                "isClosed": False, # Gap repair test: unclosed ring
                "vertices": [[0.0, 0.0], [1200.0, 0.0], [1200.0, 900.0], [0.0, 900.0]],
                "boundingBox": [0.0, 0.0, 1200.0, 900.0],
                "area": 1080000.0,
                "perimeter": 4200.0
            },
            {
                "id": "inner-plot-poly",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "vertices": [[100.0, 100.0], [300.0, 100.0], [300.0, 300.0], [100.0, 300.0], [100.0, 100.0]],
                "boundingBox": [100.0, 100.0, 300.0, 300.0],
                "area": 40000.0,
                "perimeter": 800.0
            }
        ]
    }

    geometry_graph = {
        "edges": [
            {
                "sourceId": "outer-boundary-poly",
                "targetId": "inner-plot-poly",
                "relationshipType": "CONTAINS",
                "distance": 350.0
            }
        ]
    }

    road_network = {
        "roads": [
            {
                "roadId": "road-1",
                "centerline": [[100.0, 450.0], [1100.0, 450.0]]
            }
        ]
    }

    boundary_res = boundary_detection_engine_instance.detect_project_boundary(universal_primitives, geometry_graph, road_network)

    print(f"[1] Boundary Polygon Detection & Gap Repair PASSED:")
    print(f"    Boundary ID = {boundary_res['boundaryId']} | Area = {boundary_res['area']} | Perimeter = {boundary_res['perimeter']} | Valid = {boundary_res['isValidBoundary']}")
    assert boundary_res["artifactType"] == "PROJECT_BOUNDARY"
    assert boundary_res["boundaryId"] == "outer-boundary-poly"
    assert boundary_res["area"] == 1080000.0
    assert boundary_res["isValidBoundary"] is True
    # Gap repair check: start and end vertices match
    assert boundary_res["geometry"][0] == boundary_res["geometry"][-1]

    print(f"[2] Road Containment Validation PASSED:")
    print(f"    Roads Contained = {boundary_res['roadsContainedCount']} | Confidence = {boundary_res['confidence']}")
    assert boundary_res["roadsContainedCount"] == 1

    # 3. EMPTY LAYOUT TEST CASE (FALLBACK BOUNDARY, NO CRASH)
    empty_primitives = {}
    empty_graph = {}
    empty_roads = {}
    boundary_empty = boundary_detection_engine_instance.detect_project_boundary(empty_primitives, empty_graph, empty_roads)

    print(f"[3] Empty Layout Fallback Boundary PASSED (No Crash):")
    print(f"    Fallback ID = {boundary_empty['boundaryId']} | Area = {boundary_empty['area']}")
    assert boundary_empty["artifactType"] == "PROJECT_BOUNDARY"
    assert boundary_empty["boundaryId"] == "boundary-fallback-001"
    assert boundary_empty["isValidBoundary"] is False

    print("=" * 60)
    print("ALL TASK-046 BOUNDARY DETECTION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_boundary_detection_engine_tests()
