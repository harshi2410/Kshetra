import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.road_detection_engine import road_detection_engine_instance

def run_road_detection_engine_tests():
    print("=" * 60)
    print("RUNNING TASK-045 ROAD DETECTION ENGINE TEST SUITE")
    print("=" * 60)

    # 1. ROAD CANDIDATE DETECTION & CENTERLINE / WIDTH / CONNECTIVITY TEST CASE
    universal_primitives = {
        "universalPrimitives": [
            {
                "id": "road-corridor-1",
                "primitiveType": "POLYGON",
                "candidateType": "ROAD_CANDIDATE",
                "isClosed": True,
                "boundingBox": [100.0, 400.0, 900.0, 440.0], # Horizontal road 800 long, 40 wide
                "area": 32000.0,
                "perimeter": 1680.0
            },
            {
                "id": "road-corridor-2",
                "primitiveType": "POLYGON",
                "candidateType": "ROAD_CANDIDATE",
                "isClosed": True,
                "boundingBox": [480.0, 100.0, 520.0, 700.0], # Vertical road 600 long, 40 wide
                "area": 24000.0,
                "perimeter": 1280.0
            },
            {
                "id": "plot-1",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [150.0, 150.0, 350.0, 350.0],
                "area": 40000.0,
                "perimeter": 800.0
            }
        ]
    }

    geometry_graph = {
        "edges": [
            {
                "sourceId": "road-corridor-1",
                "targetId": "road-corridor-2",
                "relationshipType": "INTERSECTS",
                "distance": 0.0
            }
        ]
    }

    road_network = road_detection_engine_instance.detect_road_network(universal_primitives, geometry_graph)

    print(f"[1] Road Corridor Detection PASSED:")
    print(f"    Total Roads = {road_network['totalRoadsCount']} | Intersections = {road_network['totalIntersectionsCount']} | Total Length = {road_network['totalRoadLength']} ft/px")
    assert road_network["artifactType"] == "ROAD_NETWORK"
    assert road_network["totalRoadsCount"] == 2
    assert road_network["totalIntersectionsCount"] >= 1

    r1 = road_network["roads"][0]
    print(f"[2] Centerline & Width Verification:")
    print(f"    Road 1 ID = {r1['roadId']} | Width = {r1['width']} | Length = {r1['length']} | Centerline = {r1['centerline']}")
    assert r1["width"] == 40.0
    assert r1["length"] == 800.0
    assert len(r1["centerline"]) == 2
    assert len(r1["connectedRoads"]) >= 1

    # 3. EMPTY LAYOUT TEST CASE (NO CRASH GUARANTEE)
    empty_primitives = {}
    empty_graph = {}
    road_empty = road_detection_engine_instance.detect_road_network(empty_primitives, empty_graph)
    print(f"[3] Empty Layout Road Detection PASSED (No Crash):")
    print(f"    Total Roads = {road_empty['totalRoadsCount']} | Total Intersections = {road_empty['totalIntersectionsCount']}")
    assert road_empty["artifactType"] == "ROAD_NETWORK"
    assert road_empty["totalRoadsCount"] == 0
    assert road_empty["totalIntersectionsCount"] == 0

    print("=" * 60)
    print("ALL TASK-045 ROAD DETECTION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_road_detection_engine_tests()
