"""
Road & Feature Detection Engine (Phase 5).
Extracts road corridors, centerlines, widths, intersection nodes, green spaces,
and natural obstacles using GEOS computational geometry (Shapely + OpenCV).
Consumes SEMANTIC_SEGMENTATION_MASKS (SegFormer class 2 ROAD, class 4 VEGETATION, class 5 WATER)
or UNIVERSAL_PRIMITIVES and GEOMETRY_RELATIONSHIP_GRAPH.
"""

import logging
from typing import Dict, Any, List, Set, Optional, Tuple
from shapely.geometry import Polygon as ShapelyPolygon, LineString, Point as ShapelyPoint, MultiPolygon
from shapely.ops import unary_union
from app.engine.geometry_engine import GeometryEngine

logger = logging.getLogger(__name__)


class RoadDetectionEngine:
    """
    Road & Feature Detection Engine Singleton (TASK-045 / TASK-055 / Phase 5).
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
        semantic_regions = s_dict.get("regions", [])

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

                elif cls_name in ["VEGETATION", "OPEN_SPACE", "GREEN_SPACE"]:
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

                elif cls_name in ["WATER", "OBSTACLE", "EXCLUSION"]:
                    oid = f"obstacle-{len(obstacles)+1:03d}"
                    clean_verts = [[round(pt[0], 2), round(pt[1], 2)] for pt in list(poly.exterior.coords)]
                    obstacles.append({
                        "id": oid,
                        "name": f"Exclusion Zone {len(obstacles)+1}",
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

                geo_info = GeometryEngine.analyze_polygon(raw_verts)
                bbox = geo_info["boundingBox"]
                vertices = geo_info["vertices"] if geo_info["isValid"] else raw_verts

                w = abs(bbox[2] - bbox[0])
                h = abs(bbox[3] - bbox[1])

                if w >= h:
                    road_width = round(min(h, 60.0), 2)
                    road_length = round(w, 2)
                    centerline = [[bbox[0], (bbox[1] + bbox[3]) / 2.0], [bbox[2], (bbox[1] + bbox[3]) / 2.0]]
                else:
                    road_width = round(min(w, 60.0), 2)
                    road_length = round(h, 2)
                    centerline = [[(bbox[0] + bbox[2]) / 2.0, bbox[1]], [(bbox[0] + bbox[2]) / 2.0, bbox[3]]]

                total_length += road_length
                connected_list = sorted(list(adjacency.get(r_id, set())))

                intersection_nodes = []
                for c_id in connected_list:
                    for target_p in road_primitives:
                        if (target_p.get("id") or target_p.get("primitiveId")) == c_id:
                            tb = target_p.get("boundingBox", [0.0, 0.0, 0.0, 0.0])
                            ix = (max(bbox[0], tb[0]) + min(bbox[2], tb[2])) / 2.0
                            iy = (max(bbox[1], tb[1]) + min(bbox[3], tb[3])) / 2.0
                            intersection_nodes.append([round(ix, 2), round(iy, 2)])
                            intersections.append([round(ix, 2), round(iy, 2)])

                roads.append({
                    "roadId": r_id,
                    "roadName": f"Main Road {r_idx+1}",
                    "geometry": vertices,
                    "polygon": vertices,
                    "wkt": geo_info.get("wkt", ""),
                    "geoJson": geo_info.get("geoJson"),
                    "centerline": centerline,
                    "width": max(20.0, road_width),
                    "roadWidth": max(20.0, road_width),
                    "length": road_length,
                    "connectedRoads": connected_list,
                    "intersectionNodes": intersection_nodes,
                    "confidence": 0.92,
                    "source": "UNIVERSAL_PRIMITIVES"
                })

        result = {
            "artifactType": "ROAD_NETWORK",
            "totalRoadsCount": len(roads),
            "totalIntersectionsCount": len(intersections),
            "totalRoadLength": round(total_length, 2),
            "roads": roads,
            "intersections": intersections,
            "greenSpaces": green_spaces,
            "obstacles": obstacles
        }

        logger.info(f"RoadDetectionEngine completed: {len(roads)} roads, {len(green_spaces)} green spaces, length={total_length:.2f}")
        return result

    # Alias for pipeline backward-compatibility
    detect_road_network = detect_roads


road_detection_engine_instance = RoadDetectionEngine()
