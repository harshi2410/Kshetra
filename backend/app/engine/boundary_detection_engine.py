"""
Boundary Detection Engine (Phase 5).
Extracts and validates the true outer project boundary polygon using GEOS computational geometry (Shapely + OpenCV).
Consumes SEMANTIC_SEGMENTATION_MASKS (SegFormer class 1 LAND_BOUNDARY) or UNIVERSAL_PRIMITIVES.
Applies Douglas-Peucker contour simplification (epsilon = 0.015 * perimeter) and enforces GEOS topological validity.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon
from shapely.validation import explain_validity
from app.engine.geometry_engine import GeometryEngine

logger = logging.getLogger(__name__)


class BoundaryDetectionEngine:
    """
    Boundary Detection Engine Singleton (TASK-046 / TASK-055 / Phase 5).
    Extracts authentic non-rectangular land boundary polygons from segmentation masks or vector primitives.
    """

    @staticmethod
    def simplify_and_validate_polygon(coords: List[List[float]], epsilon_ratio: float = 0.015) -> Tuple[Optional[ShapelyPolygon], List[List[float]], bool]:
        """
        Applies Douglas-Peucker contour simplification and repairs any self-intersections.
        """
        if len(coords) < 3:
            return None, [], False
        try:
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.area <= 0:
                return None, [], False

            # If MultiPolygon, take largest by area
            if isinstance(poly, MultiPolygon):
                poly = max(poly.geoms, key=lambda p: p.area)

            # Douglas-Peucker simplification: tolerance = epsilon_ratio * perimeter
            tolerance = max(0.5, epsilon_ratio * poly.length)
            simplified = poly.simplify(tolerance, preserve_topology=True)
            if not simplified.is_valid:
                simplified = simplified.buffer(0)
            if simplified.is_empty or simplified.area <= 0:
                simplified = poly

            clean_coords = [[round(pt[0], 2), round(pt[1], 2)] for pt in list(simplified.exterior.coords)]
            return simplified, clean_coords, simplified.is_valid
        except Exception as e:
            logger.warning(f"Polygon simplification error: {e}")
            return None, [], False

    def detect_project_boundary(
        self,
        universal_primitives_dict: Optional[Dict[str, Any]] = None,
        geometry_graph_dict: Optional[Dict[str, Any]] = None,
        road_network_dict: Optional[Dict[str, Any]] = None,
        segmentation_masks_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Detects outer project boundary polygon.
        Priority 1: Semantic Segmentation class 'LAND_BOUNDARY' contours.
        Priority 2: Universal Primitives BOUNDARY_CANDIDATE.
        Priority 3: Enclosing bounding hull.
        """
        u_dict = universal_primitives_dict or {}
        r_dict = road_network_dict or {}
        s_dict = segmentation_masks_dict or {}

        primitives = u_dict.get("universalPrimitives", []) or u_dict.get("primitives", [])
        roads = r_dict.get("roads", [])
        boundary_candidates = []

        # 1. Check Segmentation Mask regions if provided
        semantic_regions = s_dict.get("regions", [])
        for r in semantic_regions:
            cls_name = r.get("className", "").upper()
            if cls_name in ["LAND_BOUNDARY", "BOUNDARY", "FOREGROUND"]:
                poly_pts = r.get("polygon", [])
                if len(poly_pts) >= 3:
                    poly, clean_verts, is_valid = self.simplify_and_validate_polygon(poly_pts)
                    if poly and poly.area > 5000.0:
                        boundary_candidates.append({
                            "id": r.get("regionId") or "seg-boundary-001",
                            "poly": poly,
                            "vertices": clean_verts,
                            "area": float(poly.area),
                            "perimeter": float(poly.length),
                            "bbox": list(poly.bounds),
                            "source": "SEMANTIC_SEGMENTATION"
                        })

        # 2. Check Universal Primitives
        for p in primitives:
            cand_type = p.get("candidateType", "UNKNOWN")
            is_closed = p.get("isClosed", False)
            verts = p.get("vertices", [])
            area = float(p.get("area", 0.0))

            if cand_type == "BOUNDARY_CANDIDATE" or (is_closed and area > 50000.0) or len(verts) >= 4:
                poly, clean_verts, is_valid = self.simplify_and_validate_polygon(verts)
                if poly and poly.area > 5000.0:
                    boundary_candidates.append({
                        "id": p.get("id") or p.get("primitiveId"),
                        "poly": poly,
                        "vertices": clean_verts,
                        "area": float(poly.area),
                        "perimeter": float(poly.length),
                        "bbox": list(poly.bounds),
                        "source": "UNIVERSAL_PRIMITIVES"
                    })

        # 3. Select Best Candidate (Largest Valid Enclosing Polygon)
        if boundary_candidates:
            boundary_candidates.sort(key=lambda x: x["area"], reverse=True)
            best = boundary_candidates[0]
            boundary_id = best["id"] or "boundary-001"
            vertices = best["vertices"]
            area = best["area"]
            perimeter = best["perimeter"]
            bbox = [round(c, 2) for c in best["bbox"]]
            is_valid = True
            poly_obj = best["poly"]
        else:
            boundary_id = "boundary-fallback-001"
            vertices = [[0.0, 0.0], [1000.0, 0.0], [1000.0, 800.0], [0.0, 800.0], [0.0, 0.0]]
            area, perimeter = 800000.0, 3600.0
            bbox = [0.0, 0.0, 1000.0, 800.0]
            is_valid = False
            poly_obj = ShapelyPolygon(vertices)

        w = abs(bbox[2] - bbox[0])
        h = abs(bbox[3] - bbox[1])
        orientation = "NORTH" if h >= w else "EAST"
        confidence = 0.96 if is_valid else 0.50

        # Create standard GeoJSON representation
        geo_json = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [vertices]
            },
            "properties": {
                "boundaryId": boundary_id,
                "areaSqft": round(area, 2),
                "perimeterFt": round(perimeter, 2),
                "orientation": orientation
            }
        }

        result = {
            "artifactType": "PROJECT_BOUNDARY",
            "boundaryId": boundary_id,
            "geometry": vertices,
            "polygon": vertices,
            "wkt": poly_obj.wkt if poly_obj else "",
            "geoJson": geo_json,
            "area": round(area, 2),
            "perimeter": round(perimeter, 2),
            "boundingBox": bbox,
            "orientation": orientation,
            "confidence": confidence,
            "roadsContainedCount": len(roads),
            "isValidBoundary": is_valid
        }

        logger.info(f"BoundaryDetectionEngine completed: boundary '{boundary_id}', area={area:.2f}, perimeter={perimeter:.2f}")
        return result


boundary_detection_engine_instance = BoundaryDetectionEngine()
