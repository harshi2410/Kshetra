import sys
from pathlib import Path
import math

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.geometry_engine import GeometryEngine, geometry_engine_instance
from shapely.geometry import Polygon

def run_geometry_engine_tests():
    print("=" * 60)
    print("RUNNING TASK-055 PRODUCTION GEOMETRY ENGINE TEST SUITE")
    print("=" * 60)

    # 1. CLEAN VALID POLYGON TEST
    clean_pts = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]]
    info_clean = geometry_engine_instance.analyze_polygon(clean_pts)
    print(f"[1] Clean Valid Polygon PASSED:")
    print(f"    Area = {info_clean['area']} | Perimeter = {info_clean['perimeter']} | Centroid = {info_clean['centroid']}")
    assert info_clean["isValid"] is True
    assert info_clean["area"] == 5000.0
    assert info_clean["perimeter"] == 300.0
    assert info_clean["centroid"] == [50.0, 25.0]

    # 2. SELF-INTERSECTING / BOW-TIE POLYGON REPAIR TEST
    bowtie_pts = [[0, 0], [100, 100], [100, 0], [0, 100], [0, 0]]
    info_bowtie = geometry_engine_instance.analyze_polygon(bowtie_pts)
    print(f"[2] Self-Crossing Bow-Tie Polygon Repair PASSED:")
    print(f"    Repaired Area = {info_bowtie['area']} | IsValid = {info_bowtie['isValid']}")
    assert info_bowtie["isValid"] is True
    assert info_bowtie["area"] > 0.0

    # 3. OVERLAPPING POLYGONS GEOS TEST
    poly_a, _, _ = GeometryEngine.to_shapely_polygon([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]])
    poly_b, _, _ = GeometryEngine.to_shapely_polygon([[5, 0], [15, 0], [15, 10], [5, 10], [5, 0]])
    pred_overlap = GeometryEngine.compute_spatial_predicate(poly_a, poly_b)
    print(f"[3] Overlapping Polygons GEOS Test PASSED:")
    print(f"    Relationship = {pred_overlap['relationship']} | Overlap Area = {pred_overlap['overlapArea']}")
    assert pred_overlap["relationship"] == "OVERLAPS"
    assert pred_overlap["overlapArea"] == 50.0

    # 4. TOUCHING BOUNDARIES / SHARED EDGE TEST
    poly_c, _, _ = GeometryEngine.to_shapely_polygon([[10, 0], [20, 0], [20, 10], [10, 10], [10, 0]])
    pred_touch = GeometryEngine.compute_spatial_predicate(poly_a, poly_c)
    print(f"[4] Touching Shared Edge Test PASSED:")
    print(f"    Relationship = {pred_touch['relationship']} | Shared Length = {pred_touch['sharedLength']}")
    assert pred_touch["relationship"] in ["TOUCHES", "SHARED_EDGE"]
    assert pred_touch["sharedLength"] == 10.0

    # 5. DUPLICATED VERTICES CLEANUP TEST
    dup_pts = [[0, 0], [0, 0], [10, 0], [10, 0], [10, 10], [10, 10], [0, 10], [0, 10], [0, 0]]
    info_dup = geometry_engine_instance.analyze_polygon(dup_pts)
    print(f"[5] Duplicated Vertices Cleanup PASSED:")
    print(f"    Clean Vertices Count = {len(info_dup['vertices'])} | Area = {info_dup['area']}")
    assert info_dup["isValid"] is True
    assert info_dup["area"] == 100.0

    # 6. TINY GAP MINIMUM DISTANCE TEST
    poly_d, _, _ = GeometryEngine.to_shapely_polygon([[12, 0], [22, 0], [22, 10], [12, 10], [12, 0]])
    pred_gap = GeometryEngine.compute_spatial_predicate(poly_a, poly_d)
    print(f"[6] Tiny Gap Distance Test PASSED:")
    print(f"    Distance = {pred_gap['distance']} | Relationship = {pred_gap['relationship']}")
    assert pred_gap["distance"] == 2.0

    # 7. ROTATED LAYOUT POLYGON GEOMETRY TEST
    angle = math.radians(45)
    rot_pts = []
    for x, y in [[0, 0], [10, 0], [10, 10], [0, 10]]:
        rx = x * math.cos(angle) - y * math.sin(angle)
        ry = x * math.sin(angle) + y * math.cos(angle)
        rot_pts.append([rx, ry])
    info_rot = geometry_engine_instance.analyze_polygon(rot_pts)
    print(f"[7] Rotated Polygon Geometry PASSED:")
    print(f"    Rotated Area = {info_rot['area']} | Rotated Perimeter = {info_rot['perimeter']}")
    assert abs(info_rot["area"] - 100.0) < 0.1

    print("=" * 60)
    print("ALL TASK-055 PRODUCTION GEOMETRY ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_geometry_engine_tests()
