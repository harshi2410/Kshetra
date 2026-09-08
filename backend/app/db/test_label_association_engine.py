import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.label_association_engine import label_association_engine_instance

def run_label_association_engine_tests():
    print("=" * 60)
    print("RUNNING TASK-049 LABEL ASSOCIATION ENGINE TEST SUITE")
    print("=" * 60)

    # Setup Input Artifacts
    detected_plots = {
        "plots": [
            {
                "plotId": "plot-uuid-101",
                "primitiveId": "p101",
                "boundingBox": [100.0, 100.0, 200.0, 200.0],
                "centroid": [150.0, 150.0],
                "area": 10000.0,
                "orientation": "NORTH"
            },
            {
                "plotId": "plot-uuid-102",
                "primitiveId": "p102",
                "boundingBox": [200.0, 100.0, 300.0, 200.0],
                "centroid": [250.0, 150.0],
                "area": 10000.0,
                "orientation": "NORTH"
            }
        ]
    }

    road_network = {
        "roads": [
            {
                "roadId": "road-uuid-001",
                "centerline": [[100.0, 400.0], [900.0, 400.0]],
                "width": 40.0
            }
        ]
    }

    project_boundary = {
        "boundaryId": "boundary-001",
        "area": 800000.0
    }

    ocr_text_elements = {
        "textElements": [
            {
                "id": "ocr-1",
                "text": "NORTH",
                "center": [500.0, 50.0]
            },
            {
                "id": "ocr-2",
                "text": "MAIN ROAD 40FT",
                "center": [500.0, 390.0]
            },
            {
                "id": "ocr-3",
                "text": "101",
                "center": [150.0, 150.0] # Point-in-polygon inside plot-101
            },
            {
                "id": "ocr-4",
                "text": "AREA: 1200 SQ FT",
                "center": [250.0, 150.0] # Point-in-polygon inside plot-102
            },
            {
                "id": "ocr-5",
                "text": "102",
                "center": [320.0, 150.0] # Outside plot-102 -> Nearest neighbor fallback
            },
            {
                "id": "ocr-6",
                "text": "SURVEY NO 45/1",
                "center": [800.0, 750.0]
            }
        ]
    }

    # Execute Label Association Engine
    res = label_association_engine_instance.associate_labels(
        detected_plots, road_network, project_boundary, ocr_text_elements
    )

    print(f"[1] Label Association PASSED:")
    print(f"    Labeled Plots = {res['totalPlotsCount']} | Labeled Roads = {res['totalRoadsCount']} | Total OCR Processed = {res['totalOcrAssignmentsCount']}")
    assert res["artifactType"] == "LABELED_LAYOUT"
    assert res["totalPlotsCount"] == 2
    assert res["totalRoadsCount"] == 1
    assert res["totalOcrAssignmentsCount"] == 6

    p1 = res["plots"][0]
    p2 = res["plots"][1]
    print(f"[2] Plot Number & Area Label Verification:")
    print(f"    Plot 101 Number = '{p1['plotNumber']}' | Nearest Road = '{p1['roadName']}'")
    print(f"    Plot 102 Number = '{p2['plotNumber']}' | Area Label = '{p2['areaLabel']}'")
    assert p1["plotNumber"] == "101"
    assert p2["areaLabel"] == "AREA: 1200 SQ FT"
    assert p2["plotNumber"] == "102" # Nearest neighbor fallback match

    r1 = res["roads"][0]
    print(f"[3] Road Name Association Verification:")
    print(f"    Road 1 Name = '{r1['roadName']}' | Width = {r1['roadWidth']}")
    assert r1["roadName"] == "MAIN ROAD 40FT"

    print(f"[4] Boundary Label Association Verification:")
    print(f"    Boundary Labels = {res['boundaryLabels']}")
    assert "NORTH" in res["boundaryLabels"]
    assert "SURVEY NO 45/1" in res["boundaryLabels"]

    # 5. EMPTY LAYOUT TEST CASE (NO CRASH GUARANTEE)
    empty_dict = {}
    res_empty = label_association_engine_instance.associate_labels(
        empty_dict, empty_dict, empty_dict, empty_dict
    )
    print(f"[5] Empty Layout Association PASSED (No Crash):")
    print(f"    Total Labeled Plots = {res_empty['totalPlotsCount']}")
    assert res_empty["artifactType"] == "LABELED_LAYOUT"
    assert res_empty["totalPlotsCount"] == 0

    print("=" * 60)
    print("ALL TASK-049 LABEL ASSOCIATION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_label_association_engine_tests()
