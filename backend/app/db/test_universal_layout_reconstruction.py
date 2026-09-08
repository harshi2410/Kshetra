import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.universal_layout_reconstruction_engine import universal_layout_reconstruction_engine_instance

def run_universal_layout_reconstruction_tests():
    print("=" * 60)
    print("RUNNING TASK-050 UNIVERSAL LAYOUT RECONSTRUCTION TEST SUITE")
    print("=" * 60)

    # Setup Input Artifacts
    labeled_layout = {
        "plots": [
            {
                "plotId": "plot-uuid-101",
                "plotNumber": "101",
                "geometry": [[100.0, 100.0], [200.0, 100.0], [200.0, 200.0], [100.0, 200.0], [100.0, 100.0]],
                "centroid": [150.0, 150.0],
                "area": 10000.0,
                "perimeter": 400.0,
                "orientation": "NORTH",
                "nearestRoadId": "road-uuid-001",
                "roadName": "MAIN ROAD 40FT",
                "areaLabel": "10000 SQ FT",
                "dimensionLabels": ["100 x 100"]
            }
        ],
        "roads": [
            {
                "roadId": "road-uuid-001",
                "roadName": "MAIN ROAD 40FT",
                "roadWidth": 40.0,
                "centerline": [[100.0, 400.0], [900.0, 400.0]],
                "geometry": [[100.0, 380.0], [900.0, 380.0], [900.0, 420.0], [100.0, 420.0]],
                "connectedRoads": []
            }
        ],
        "boundaryLabels": ["NORTH", "SURVEY NO 45/1"]
    }

    road_network = {
        "roads": [
            {
                "roadId": "road-uuid-001",
                "width": 40.0
            }
        ]
    }

    project_boundary = {
        "boundaryId": "boundary-001",
        "geometry": [[0.0, 0.0], [1200.0, 0.0], [1200.0, 900.0], [0.0, 900.0], [0.0, 0.0]],
        "area": 1080000.0,
        "perimeter": 4200.0,
        "orientation": "NORTH",
        "boundingBox": [0.0, 0.0, 1200.0, 900.0]
    }

    detected_plots = {
        "plots": [
            {
                "plotId": "plot-uuid-101",
                "area": 10000.0
            }
        ]
    }

    # Execute Universal Layout Reconstruction Engine
    res = universal_layout_reconstruction_engine_instance.reconstruct_universal_layout(
        labeled_layout, road_network, project_boundary, detected_plots
    )

    print(f"[1] Universal Layout Model Synthesis PASSED:")
    print(f"    ArtifactType = {res['artifactType']} | Plots = {len(res['plots'])} | Roads = {len(res['roads'])}")
    assert res["artifactType"] == "UNIVERSAL_LAYOUT_MODEL"
    assert len(res["plots"]) == 1
    assert len(res["roads"]) == 1

    p = res["plots"][0]
    print(f"[2] Plot Model Verification:")
    print(f"    ID = {p['id']} | PlotNumber = {p['plotNumber']} | RoadName = {p['roadName']} | Dimensions = {p['dimensions']}")
    assert p["id"] == "plot-uuid-101"
    assert p["plotNumber"] == "101"
    assert p["roadName"] == "MAIN ROAD 40FT"

    print(f"[3] Clean Vector SVG Generation Verification:")
    svg_content = res.get("svgContent", "")
    print(f"    SVG Length = {len(svg_content)} bytes")
    assert "<svg" in svg_content
    assert "</svg>" in svg_content
    assert 'id="layer-boundary"' in svg_content
    assert 'id="layer-roads"' in svg_content
    assert 'id="layer-plots"' in svg_content
    assert 'id="layer-labels"' in svg_content
    assert 'data-plot-id="plot-uuid-101"' in svg_content

    # 4. EMPTY LAYOUT TEST CASE (FALLBACK SVG, NO CRASH)
    empty_dict = {}
    res_empty = universal_layout_reconstruction_engine_instance.reconstruct_universal_layout(
        empty_dict, empty_dict, empty_dict, empty_dict
    )
    print(f"[4] Empty Layout Fallback Model & SVG PASSED (No Crash):")
    print(f"    Empty Plots = {len(res_empty['plots'])} | SVG Length = {len(res_empty['svgContent'])}")
    assert res_empty["artifactType"] == "UNIVERSAL_LAYOUT_MODEL"
    assert "<svg" in res_empty["svgContent"]

    print("=" * 60)
    print("ALL TASK-050 UNIVERSAL LAYOUT RECONSTRUCTION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_universal_layout_reconstruction_tests()
