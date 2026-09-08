import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, mapping
from shapely.validation import make_valid
from shapely.ops import unary_union

logger = logging.getLogger(__name__)

class GeometryEngine:
    """
    Production Computational Geometry Engine (TASK-055)
    Powered by Shapely & GEOS C++ Engine.
    Handles polygon validation, self-intersection repair, topological relationships,
    shared boundary detection, exact area/perimeter calculations, and GeoJSON exports.
    """

    @staticmethod
    def to_shapely_polygon(vertices: List[List[float]]) -> Tuple[Optional[Polygon], List[List[float]], bool]:
        """
        Converts raw vertex arrays into a valid, self-intersection-repaired Shapely Polygon.
        """
        if not vertices or len(vertices) < 3:
            return None, [], False

        # Clean duplicate consecutive points
        clean_pts = []
        for p in vertices:
            if not clean_pts or (abs(p[0] - clean_pts[-1][0]) > 1e-5 or abs(p[1] - clean_pts[-1][1]) > 1e-5):
                clean_pts.append([float(p[0]), float(p[1])])

        if len(clean_pts) < 3:
            return None, [], False

        # Ensure explicit closure for Shapely constructor
        if clean_pts[0] != clean_pts[-1]:
            clean_pts.append(clean_pts[0])

        try:
            poly = Polygon(clean_pts)
            if not poly.is_valid:
                # GEOS self-intersection repair
                repaired = make_valid(poly)
                if isinstance(repaired, MultiPolygon):
                    # Pick largest polygon by area
                    poly = max(repaired.geoms, key=lambda g: g.area)
                elif isinstance(repaired, Polygon):
                    poly = repaired
                else:
                    poly = poly.buffer(0)

            if not isinstance(poly, Polygon) or poly.is_empty or poly.area <= 0:
                return None, [], False

            # Extract repaired exterior coordinates
            ext_coords = [[round(float(c[0]), 2), round(float(c[1]), 2)] for c in poly.exterior.coords]
            return poly, ext_coords, True
        except Exception as err:
            logger.debug(f"Shapely polygon conversion error: {err}")
            return None, [], False

    @staticmethod
    def analyze_polygon(vertices: List[List[float]]) -> Dict[str, Any]:
        """
        Computes exact GEOS area, perimeter, centroid, bounding box, and GeoJSON representation.
        """
        poly, clean_verts, is_valid = GeometryEngine.to_shapely_polygon(vertices)
        if not poly:
            return {
                "isValid": False,
                "area": 0.0,
                "perimeter": 0.0,
                "centroid": [0.0, 0.0],
                "boundingBox": [0.0, 0.0, 0.0, 0.0],
                "vertices": vertices,
                "wkt": "",
                "geoJson": None
            }

        minx, miny, maxx, maxy = poly.bounds
        cx, cy = poly.centroid.x, poly.centroid.y

        return {
            "isValid": is_valid,
            "area": round(float(poly.area), 2),
            "perimeter": round(float(poly.length), 2),
            "centroid": [round(float(cx), 2), round(float(cy), 2)],
            "boundingBox": [round(float(minx), 2), round(float(miny), 2), round(float(maxx), 2), round(float(maxy), 2)],
            "vertices": clean_verts,
            "wkt": poly.wkt,
            "geoJson": mapping(poly)
        }

    @staticmethod
    def compute_spatial_predicate(poly_a: Polygon, poly_b: Polygon) -> Dict[str, Any]:
        """
        Calculates exact GEOS topological relationships between two polygons.
        """
        if not poly_a or not poly_b or poly_a.is_empty or poly_b.is_empty:
            return {"relationship": "DISJOINT", "distance": 99999.0, "sharedLength": 0.0, "overlapArea": 0.0}

        dist = round(float(poly_a.distance(poly_b)), 2)

        if poly_a.contains(poly_b):
            rel = "CONTAINS"
        elif poly_b.contains(poly_a):
            rel = "INSIDE"
        elif poly_a.touches(poly_b):
            rel = "TOUCHES"
        elif poly_a.intersects(poly_b):
            inter = poly_a.intersection(poly_b)
            if inter.geom_type == "Polygon" and inter.area > 1.0:
                rel = "OVERLAPS"
            elif inter.geom_type in ["LineString", "MultiLineString"] or inter.length > 0.1:
                rel = "SHARED_EDGE"
            else:
                rel = "INTERSECTS"
        elif dist < 50.0:
            rel = "NEIGHBOR"
        else:
            rel = "DISJOINT"

        inter_geom = poly_a.intersection(poly_b) if poly_a.intersects(poly_b) else None
        shared_len = round(float(inter_geom.length), 2) if inter_geom else 0.0
        overlap_area = round(float(inter_geom.area), 2) if (inter_geom and inter_geom.geom_type == "Polygon") else 0.0

        return {
            "relationship": rel,
            "distance": dist,
            "sharedLength": shared_len,
            "overlapArea": overlap_area
        }

# Singleton Instance
geometry_engine_instance = GeometryEngine()
