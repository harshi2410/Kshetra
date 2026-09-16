"""
Road & Feature Detection Engine.
Extracts road corridors, centerlines, widths, intersection nodes, green spaces,
and natural obstacles using GEOS computational geometry (Shapely + OpenCV).
Consumes SEMANTIC_SEGMENTATION_MASKS (SegFormer class 2 ROAD, class 4 GREEN_SPACE, class 5 OPEN_SPACE, class 6 OBSTACLE)
or UNIVERSAL_PRIMITIVES and GEOMETRY_RELATIONSHIP_GRAPH.
"""

import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path for direct script execution
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
from typing import Dict, Any, List, Set, Optional, Tuple
from shapely.geometry import Polygon as ShapelyPolygon, LineString, Point as ShapelyPoint, MultiPolygon
from shapely.ops import unary_union
from app.engine.geometry_engine import GeometryEngine

logger = logging.getLogger(__name__)


class RoadDetectionEngine:
    """
    Road & Feature Detection Engine Singleton.
    Extracts road network corridors, centerlines, intersections, and green spaces.
    """

    def detect_roads(
        self,
        universal_primitives_dict: Optional[Dict[str, Any]] = None,
        geometry_graph_dict: Optional[Dict[str, Any]] = None,
        segmentation_masks_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        u_dict = universal_primitives_dict or {}
        g_dict = geometry_graph_dict or {}
        s_dict = segmentation_masks_dict or {}

        primitives = u_dict.get("universalPrimitives", []) or u_dict.get("primitives", [])
        edges = g_dict.get("edges", [])
        semantic_regions = s_dict.get("semanticRegions", []) or s_dict.get("regions", [])

        roads: List[Dict[str, Any]] = []
        intersections: List[List[float]] = []
        green_spaces: List[Dict[str, Any]] = []
        obstacles: List[Dict[str, Any]] = []
        total_length = 0.0

        # 1. Process Semantic Segmentation Regions
        seg_road_count = 0
        for r in semantic_regions:
            cls_name = r.get("className", "").upper()
            poly_pts = r.get("polygon", [])
            if len(poly_pts) < 3:
                continue

            try:
                poly = ShapelyPolygon(poly_pts)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_empty or poly.area <= 0:
                    continue

                if cls_name == "ROAD":
                    seg_road_count += 1
                    rid = f"road-seg-{seg_road_count:03d}"
                    b = poly.bounds
                    w = abs(b[2] - b[0])
                    h = abs(b[3] - b[1])
                    road_w = round(min(w, h, 60.0), 2)
                    road_l = round(max(w, h), 2)

                    if w >= h:
                        cline = [[round(b[0], 2), round((b[1] + b[3]) / 2.0, 2)], [round(b[2], 2), round((b[1] + b[3]) / 2.0, 2)]]
                    else:
                        cline = [[round((b[0] + b[2]) / 2.0, 2), round(b[1], 2)], [round((b[0] + b[2]) / 2.0, 2), round(b[3], 2)]]

                    clean_verts = [[round(pt[0], 2), round(pt[1], 2)] for pt in list(poly.exterior.coords)]
                    total_length += road_l

                    roads.append({
                        "roadId": rid,
                        "roadName": f"Avenue {seg_road_count}",
                        "geometry": clean_verts,
                        "polygon": clean_verts,
                        "wkt": poly.wkt,
                        "geoJson": {
                            "type": "Feature",
                            "geometry": {"type": "Polygon", "coordinates": [clean_verts]},
                            "properties": {"roadId": rid, "width": road_w, "length": road_l}
                        },
                        "centerline": cline,
                        "width": max(20.0, road_w),
                        "roadWidth": max(20.0, road_w),
                        "length": road_l,
                        "connectedRoads": [],
                        "intersectionNodes": [],
                        "confidence": 0.94,
                        "source": "SEMANTIC_SEGMENTATION"
                    })

                elif cls_name in ["GREEN_SPACE", "OPEN_SPACE", "VEGETATION"]:
                    gid = f"green-{len(green_spaces)+1:03d}"
                    clean_verts = [[round(pt[0], 2), round(pt[1], 2)] for pt in list(poly.exterior.coords)]
                    green_spaces.append({
                        "zoneId": gid,
                        "name": f"Green Park {len(green_spaces)+1}",
                        "type": "PARK",
                        "geometry": clean_verts,
                        "polygon": clean_verts,
                        "areaSqft": round(poly.area, 2),
                        "wkt": poly.wkt
                    })

                elif cls_name in ["OBSTACLE", "BUILDING", "WATER", "EXCLUSION"]:
                    oid = f"obstacle-{len(obstacles)+1:03d}"
                    clean_verts = [[round(pt[0], 2), round(pt[1], 2)] for pt in list(poly.exterior.coords)]
                    obstacles.append({
                        "id": oid,
                        "name": f"{cls_name.capitalize()} Zone {len(obstacles)+1}",
                        "type": cls_name,
                        "geometry": clean_verts,
                        "polygon": clean_verts,
                        "areaSqft": round(poly.area, 2),
                        "wkt": poly.wkt
                    })
            except Exception as e:
                logger.warning(f"Error processing semantic region {cls_name}: {e}")

        # 2. Process Universal Primitives if segmentation didn't find roads
        if not roads:
            road_primitives = [p for p in primitives if p.get("candidateType") == "ROAD_CANDIDATE"]
            road_ids = {p.get("id") or p.get("primitiveId") for p in road_primitives}
            adjacency: Dict[str, Set[str]] = {rid: set() for rid in road_ids}

            for edge in edges:
                src, tgt = edge.get("sourceId"), edge.get("targetId")
                if src in road_ids and tgt in road_ids:
                    adjacency[src].add(tgt)
                    adjacency[tgt].add(src)

            for r_idx, p in enumerate(road_primitives):
                r_id = p.get("id") or p.get("primitiveId") or f"road-{r_idx+1:03d}"
                raw_verts = p.get("vertices", [])
                if not raw_verts and p.get("boundingBox"):
                    bbox_raw = p.get("boundingBox")
                    if len(bbox_raw) == 4:
                        raw_verts = [
                            [float(bbox_raw[0]), float(bbox_raw[1])],
                            [float(bbox_raw[2]), float(bbox_raw[1])],
                            [float(bbox_raw[2]), float(bbox_raw[3])],
                            [float(bbox_raw[0]), float(bbox_raw[3])],
                            [float(bbox_raw[0]), float(bbox_raw[1])]
                        ]

                if not raw_verts or len(raw_verts) < 3:
                    continue

                geo_info = GeometryEngine.analyze_polygon(raw_verts)
                bbox = geo_info["boundingBox"]
                w = abs(bbox[2] - bbox[0])
                h = abs(bbox[3] - bbox[1])
                road_w = round(min(w, h), 2)
                road_l = round(max(w, h), 2)

                if w >= h:
                    cline = [[round(bbox[0], 2), round((bbox[1] + bbox[3]) / 2.0, 2)], [round(bbox[2], 2), round((bbox[1] + bbox[3]) / 2.0, 2)]]
                else:
                    cline = [[round((bbox[0] + bbox[2]) / 2.0, 2), round(bbox[1], 2)], [round((bbox[0] + bbox[2]) / 2.0, 2), round(bbox[3], 2)]]

                total_length += road_l
                conns = sorted(list(adjacency.get(r_id, set())))

                roads.append({
                    "roadId": r_id,
                    "roadName": f"Internal Road {r_idx+1}",
                    "geometry": geo_info["vertices"],
                    "polygon": geo_info["vertices"],
                    "wkt": geo_info.get("wkt", ""),
                    "geoJson": geo_info.get("geoJson"),
                    "centerline": cline,
                    "width": max(20.0, road_w),
                    "roadWidth": max(20.0, road_w),
                    "length": road_l,
                    "connectedRoads": conns,
                    "intersectionNodes": [],
                    "confidence": 0.92,
                    "source": "UNIVERSAL_PRIMITIVES"
                })

        # Calculate Intersections
        road_lines = []
        for r in roads:
            cl = r.get("centerline", [])
            if len(cl) >= 2:
                try:
                    road_lines.append((r["roadId"], LineString(cl)))
                except Exception:
                    pass

        for i in range(len(road_lines)):
            for j in range(i + 1, len(road_lines)):
                try:
                    r1_id, l1 = road_lines[i]
                    r2_id, l2 = road_lines[j]
                    if l1.intersects(l2):
                        pt = l1.intersection(l2)
                        if isinstance(pt, ShapelyPoint):
                            coord = [round(pt.x, 2), round(pt.y, 2)]
                            if coord not in intersections:
                                intersections.append(coord)
                except Exception:
                    pass

        result = {
            "artifactType": "ROAD_NETWORK",
            "totalRoadsCount": len(roads),
            "totalLength": round(total_length, 2),
            "totalRoadLength": round(total_length, 2),
            "intersectionsCount": len(intersections),
            "totalIntersectionsCount": len(intersections),
            "intersections": intersections,
            "greenSpacesCount": len(green_spaces),
            "greenSpaces": green_spaces,
            "obstaclesCount": len(obstacles),
            "obstacles": obstacles,
            "roads": roads
        }

        logger.info(f"RoadDetectionEngine completed: {len(roads)} roads, {len(green_spaces)} green spaces, {len(obstacles)} obstacles")
        return result

    def detect_road_network(
        self,
        universal_primitives_dict: Optional[Dict[str, Any]] = None,
        geometry_graph_dict: Optional[Dict[str, Any]] = None,
        segmentation_masks_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Alias for detect_roads providing backwards compatibility.
        """
        return self.detect_roads(
            universal_primitives_dict=universal_primitives_dict,
            geometry_graph_dict=geometry_graph_dict,
            segmentation_masks_dict=segmentation_masks_dict
        )


road_detection_engine_instance = RoadDetectionEngine()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print("=" * 70)
    print("  LANDOS ROAD & FEATURE DETECTION ENGINE (TASK-045)")
    print("=" * 70)

    # 1. DEMO: Universal Primitives Detection & Connectivity
    print("\n--- 1. Testing Universal Primitives Road Detection & Topology ---")
    sample_primitives = {
        "universalPrimitives": [
            {
                "id": "road-corridor-1",
                "primitiveType": "POLYGON",
                "candidateType": "ROAD_CANDIDATE",
                "isClosed": True,
                "boundingBox": [100.0, 400.0, 900.0, 440.0],  # Horizontal 800 ft long, 40 ft wide
                "area": 32000.0,
                "perimeter": 1680.0
            },
            {
                "id": "road-corridor-2",
                "primitiveType": "POLYGON",
                "candidateType": "ROAD_CANDIDATE",
                "isClosed": True,
                "boundingBox": [480.0, 100.0, 520.0, 700.0],  # Vertical 600 ft long, 40 ft wide
                "area": 24000.0,
                "perimeter": 1280.0
            },
            {
                "id": "plot-candidate-1",
                "primitiveType": "POLYGON",
                "candidateType": "PLOT_CANDIDATE",
                "isClosed": True,
                "boundingBox": [150.0, 150.0, 350.0, 350.0],
                "area": 40000.0,
                "perimeter": 800.0
            }
        ]
    }

    sample_graph = {
        "edges": [
            {
                "sourceId": "road-corridor-1",
                "targetId": "road-corridor-2",
                "relationshipType": "INTERSECTS",
                "distance": 0.0
            }
        ]
    }

    res_prim = road_detection_engine_instance.detect_road_network(sample_primitives, sample_graph)
    print(f"[*] Artifact Type          : {res_prim['artifactType']}")
    print(f"[*] Total Roads Detected   : {res_prim['totalRoadsCount']}")
    print(f"[*] Total Road Length      : {res_prim['totalRoadLength']} ft")
    print(f"[*] Total Intersections    : {res_prim['totalIntersectionsCount']} at {res_prim['intersections']}")
    for r in res_prim["roads"]:
        print(f"    - {r['roadId']}: width={r['width']}ft, length={r['length']}ft, centerline={r['centerline']}, conns={r['connectedRoads']}")

    assert res_prim["totalRoadsCount"] == 2, "Expected 2 road corridors"
    assert res_prim["totalIntersectionsCount"] >= 1, "Expected at least 1 intersection"
    assert res_prim["roads"][0]["width"] == 40.0, "Expected road width 40.0"
    print("--> Universal Primitives verification: PASSED [OK]")

    # 2. DEMO: Semantic Segmentation Masks (Roads, Green Spaces, Obstacles)
    print("\n--- 2. Testing Semantic Segmentation Detection ---")
    sample_seg = {
        "semanticRegions": [
            {
                "className": "ROAD",
                "polygon": [[0.0, 100.0], [500.0, 100.0], [500.0, 130.0], [0.0, 130.0], [0.0, 100.0]]
            },
            {
                "className": "GREEN_SPACE",
                "polygon": [[50.0, 200.0], [200.0, 200.0], [200.0, 350.0], [50.0, 350.0], [50.0, 200.0]]
            },
            {
                "className": "OBSTACLE",
                "polygon": [[300.0, 200.0], [400.0, 200.0], [400.0, 300.0], [300.0, 300.0], [300.0, 200.0]]
            }
        ]
    }

    res_seg = road_detection_engine_instance.detect_roads(segmentation_masks_dict=sample_seg)
    print(f"[*] Roads Detected         : {res_seg['totalRoadsCount']}")
    print(f"[*] Green Spaces Detected  : {res_seg['greenSpacesCount']}")
    print(f"[*] Obstacles Detected     : {res_seg['obstaclesCount']}")
    for g in res_seg["greenSpaces"]:
        print(f"    - {g['zoneId']}: {g['name']}, area={g['areaSqft']} sqft")
    for o in res_seg["obstacles"]:
        print(f"    - {o['id']}: {o['name']}, area={o['areaSqft']} sqft")

    assert res_seg["totalRoadsCount"] == 1, "Expected 1 road from segmentation"
    assert res_seg["greenSpacesCount"] == 1, "Expected 1 green space"
    assert res_seg["obstaclesCount"] == 1, "Expected 1 obstacle"
    print("--> Semantic Segmentation verification: PASSED [OK]")

    # 3. DEMO: Empty Layout Safety
    print("\n--- 3. Testing Empty Layout Safety Guarantee ---")
    res_empty = road_detection_engine_instance.detect_road_network({}, {})
    assert res_empty["totalRoadsCount"] == 0
    assert res_empty["totalIntersectionsCount"] == 0
    print("--> Empty input resilience verification: PASSED [OK]")

    print("\n" + "=" * 70)
    print("  ALL ROAD DETECTION ENGINE TESTS & EXECUTIONS PASSED SUCCESSFULLY!")
    print("=" * 70)
