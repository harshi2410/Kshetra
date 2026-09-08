import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.plot_detection_engine import plot_detection_engine_instance

def run_plot_detection_engine_tests():
    print("=" * 60)
    print("RUNNING TASK-047 PLOT DETECTION ENGINE TEST SUITE")
    print("=" * 60)

    # 1. PLOT EXTRACTION & STABLE DETERMINISTIC UUID RERUN TEST CASE
    universal_primitives = {
        "universalPrimitives": [
            {
                "id": "outer-boundary-1",
                "primitiveType": "POLYGON",
                "candidateType": "BOUNDARY_CANDIDATE",
                "isClosed": True,
                "boundingBox": [0.0, 0.0, 1000.0, 800.0],
                "area": 800000.0
            },
            {
                "id": "road-corridor-1",
                "primitiveType": "POLYGON",
                "candidateType": "ROAD_CANDIDATE",
                "isClosed": True,
                "boundingBox": [0.0, 380.0, 1000.0, 420.0],
                "area": 40000.0
            },
            {
                "id": "plot-candidate-101",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [100.0, 100.0, 200.0, 200.0],
                "area": 10000.0,
                "perimeter": 400.0
            },
            {
                "id": "plot-candidate-102",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [200.0, 100.0, 300.0, 200.0],
                "area": 10000.0,
                "perimeter": 400.0
            }
        ]
    }

    geometry_graph = {
        "edges": [
            {
                "sourceId": "plot-candidate-101",
                "targetId": "plot-candidate-102",
                "relationshipType": "SHARED_EDGE",
                "distance": 100.0
            }
        ]
    }

    road_network = {
        "roads": [
            {
                "roadId": "road-corridor-1",
                "width": 40.0
            }
        ]
    }

    project_boundary = {
        "boundaryId": "outer-boundary-1",
        "area": 800000.0
    }

    # Run 1: Primary Detection
    res_run1 = plot_detection_engine_instance.detect_plots(
        universal_primitives, geometry_graph, road_network, project_boundary
    )

    print(f"[1] Plot Detection PASSED:")
    print(f"    Total Plots = {res_run1['totalPlotsCount']} | Total Area = {res_run1['totalPlotArea']}")
    assert res_run1["artifactType"] == "DETECTED_PLOTS"
    assert res_run1["totalPlotsCount"] == 2
    assert res_run1["totalPlotArea"] == 20000.0

    p1 = res_run1["plots"][0]
    p2 = res_run1["plots"][1]
    print(f"[2] Plot Metadata & Centroid Calculation:")
    print(f"    Plot 1 ID = {p1['plotId']} | Centroid = {p1['centroid']} | Area = {p1['area']}")
    assert p1["centroid"] == [150.0, 150.0]
    assert p1["area"] == 10000.0
    assert len(p1["neighborPlots"]) >= 1

    # Run 2: Idempotency & Stable UUID Rerun Test
    res_run2 = plot_detection_engine_instance.detect_plots(
        universal_primitives, geometry_graph, road_network, project_boundary
    )

    print(f"[3] Stable Deterministic UUID Rerun Test PASSED:")
    print(f"    Run 1 Plot 1 ID = {p1['plotId']}")
    print(f"    Run 2 Plot 1 ID = {res_run2['plots'][0]['plotId']}")
    assert res_run1["plots"][0]["plotId"] == res_run2["plots"][0]["plotId"]
    assert res_run1["plots"][1]["plotId"] == res_run2["plots"][1]["plotId"]

    # 4. EMPTY LAYOUT TEST CASE (NO CRASH GUARANTEE)
    empty_dict = {}
    res_empty = plot_detection_engine_instance.detect_plots(
        empty_dict, empty_dict, empty_dict, empty_dict
    )
    print(f"[4] Empty Layout Plot Detection PASSED (No Crash):")
    print(f"    Total Plots = {res_empty['totalPlotsCount']}")
    assert res_empty["artifactType"] == "DETECTED_PLOTS"
    assert res_empty["totalPlotsCount"] == 0

    print("=" * 60)
    print("ALL TASK-047 PLOT DETECTION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_plot_detection_engine_tests()
