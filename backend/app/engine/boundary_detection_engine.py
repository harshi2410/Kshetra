"""
Boundary Detection & Perception Engine.
Supports 3 Major Input Types (Section 27):
1. INPUT TYPE A: Satellite / Aerial Image (color boundary markings, contrast parcel edges)
2. INPUT TYPE B: 2D White/Blank Page Drawing (pen/pencil/printed drawings; white page itself is NOT boundary)
3. INPUT TYPE C: CAD / Technical Drawing (primary land boundary identified, filtering notes/dimensions)

Preserves authentic boundary silhouette (trapezoidal, L-shaped, concave, slanted, irregular polygon).
Never converts irregular land into rectangular bounding boxes (Section 26, 31).
"""

import math
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import cv2
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon, Point as ShapelyPoint, MultiPoint
from shapely.validation import explain_validity
from shapely.ops import unary_union

logger = logging.getLogger(__name__)


class BoundaryDetectionEngine:
    """
    Unified Boundary Perception & Extraction Engine.
    Detects, validates, cleans, and vectorizes land boundaries while strictly preserving
    the exact geometric shape across all three input types.
    """

    # Color ranges for satellite marker lines in HSV
    SATELLITE_COLOR_RANGES = {
        "BLUE": [
            (np.array([85, 40, 40]), np.array([140, 255, 255]))
        ],
        "RED": [
            (np.array([0, 70, 50]), np.array([10, 255, 255])),
            (np.array([170, 70, 50]), np.array([180, 255, 255]))
        ],
        "YELLOW_ORANGE": [
            (np.array([11, 80, 80]), np.array([35, 255, 255]))
        ],
        "CYAN_MAGENTA": [
            (np.array([140, 50, 50]), np.array([170, 255, 255])),
            (np.array([75, 50, 50]), np.array([90, 255, 255]))
        ]
    }

    @staticmethod
    def classify_input_type(img_bgr: np.ndarray) -> str:
        """
        Classifies input into:
        - SATELLITE_AERIAL (Input Type A): photographic satellite/aerial view
        - WHITE_PAGE_DRAWING (Input Type B): hand-drawn/printed line drawing on white paper
        - CAD_TECHNICAL (Input Type C): technical CAD drawing/blueprint (dark or colored background, vector-like lines)
        """
        if img_bgr is None or img_bgr.size == 0:
            return "UNKNOWN"

        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

        mean_val = float(np.mean(gray))
        mean_sat = float(np.mean(hsv[:, :, 1]))
        std_sat = float(np.std(hsv[:, :, 1]))

        # High-brightness, low-saturation page background indicates White/Blank Page drawing
        white_pixels = np.count_nonzero(gray > 210)
        white_ratio = white_pixels / float(h * w)

        if white_ratio > 0.65 and mean_sat < 35.0:
            return "WHITE_PAGE_DRAWING"

        # Dark background (CAD blueprint or dark mode)
        dark_pixels = np.count_nonzero(gray < 60)
        if (dark_pixels / float(h * w)) > 0.45:
            return "CAD_TECHNICAL"

        # Check for natural satellite vegetation / earth tones
        green_mask = cv2.inRange(hsv, np.array([32, 35, 35]), np.array([88, 255, 255]))
        green_ratio = float(np.count_nonzero(green_mask)) / float(h * w)

        if (mean_sat > 25.0 and std_sat > 18.0) or (green_ratio > 0.12):
            return "SATELLITE_AERIAL"

        return "WHITE_PAGE_DRAWING" if white_ratio > 0.40 else "CAD_TECHNICAL"

    @classmethod
    def simplify_and_validate_polygon(
        cls,
        coords: List[List[float]],
        epsilon_ratio: float = 0.012
    ) -> Tuple[Optional[ShapelyPolygon], List[List[float]], bool]:
        """
        Applies controlled Douglas-Peucker contour simplification and repairs self-intersections.
        Preserves authentic corners, slants, and concavity without flattening into a rectangle (Section 33).
        """
        if len(coords) < 3:
            return None, [], False
        try:
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.area <= 0:
                return None, [], False

            if isinstance(poly, MultiPolygon):
                poly = max(poly.geoms, key=lambda p: p.area)

            # Controlled tolerance preserving silhouette
            tolerance = max(0.5, min(8.0, epsilon_ratio * poly.length))
            simplified = poly.simplify(tolerance, preserve_topology=True)
            if not simplified.is_valid:
                simplified = simplified.buffer(0)
            if simplified.is_empty or simplified.area <= 0:
                simplified = poly

            clean_coords = [[round(float(pt[0]), 2), round(float(pt[1]), 2)] for pt in list(simplified.exterior.coords)]
            if clean_coords and clean_coords[0] != clean_coords[-1]:
                clean_coords.append(clean_coords[0])

            return simplified, clean_coords, simplified.is_valid
        except Exception as e:
            logger.warning(f"Polygon simplification error: {e}")
            return None, [], False

    @classmethod
    def classify_shape_characteristics(cls, poly: ShapelyPolygon) -> Dict[str, Any]:
        """
        Analyzes geometric shape characteristics:
        - concavity_ratio
        - aspect_ratio
        - shape_type (RECTANGULAR, TRAPEZOIDAL, L_SHAPED, CONCAVE, SLANTED, IRREGULAR)
        """
        if not poly or poly.is_empty:
            return {
                "shapeType": "UNKNOWN",
                "concavityRatio": 1.0,
                "isConcave": False,
                "aspectRatio": 1.0,
                "vertexCount": 0
            }

        coords = list(poly.exterior.coords)
        if coords and coords[0] == coords[-1]:
            coords = coords[:-1]
        v_count = len(coords)

        hull = poly.convex_hull
        hull_area = float(hull.area) if hull else float(poly.area)
        concavity_ratio = float(poly.area / hull_area) if hull_area > 0 else 1.0
        is_concave = concavity_ratio < 0.88

        min_x, min_y, max_x, max_y = poly.bounds
        w = max(1.0, max_x - min_x)
        h = max(1.0, max_y - min_y)
        aspect_ratio = round(w / h, 2)

        # Classify shape type
        if is_concave:
            if v_count in [6, 7, 8] and concavity_ratio < 0.82:
                shape_type = "L_SHAPED"
            else:
                shape_type = "CONCAVE"
        elif v_count == 4:
            # Check if rectangular vs trapezoidal or slanted
            box_area = w * h
            fill = poly.area / box_area
            if fill > 0.95:
                shape_type = "RECTANGULAR"
            elif fill > 0.70:
                shape_type = "TRAPEZOIDAL"
            else:
                shape_type = "SLANTED"
        elif v_count == 5:
            shape_type = "TRAPEZOIDAL"
        elif v_count > 5:
            shape_type = "IRREGULAR"
        else:
            shape_type = "IRREGULAR"

        return {
            "shapeType": shape_type,
            "concavityRatio": round(concavity_ratio, 3),
            "isConcave": is_concave,
            "aspectRatio": aspect_ratio,
            "vertexCount": v_count,
            "area": round(float(poly.area), 2),
            "perimeter": round(float(poly.length), 2),
        }

    # ─── EXTRACTION METHODS FOR THE THREE INPUT TYPES ───────────────────────

    @classmethod
    def extract_from_satellite_image(
        cls,
        img_bgr: np.ndarray,
        min_area_ratio: float = 0.04
    ) -> Tuple[Optional[List[List[float]]], float, str, Dict[str, Any]]:
        """
        Input Type A: Satellite / Aerial Image.
        Detects colored boundary markers or parcel contrast contours.
        Returns (vertices, confidence, message, metadata).
        """
        h, w = img_bgr.shape[:2]
        total_img_area = float(h * w)
        min_area_px = total_img_area * min_area_ratio
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

        candidate_polygons = []

        # 1. Search for colored marker strokes (Blue, Red, Yellow, Cyan)
        for color_name, ranges in cls.SATELLITE_COLOR_RANGES.items():
            combined_mask = np.zeros((h, w), dtype=np.uint8)
            for (low, high) in ranges:
                mask = cv2.inRange(hsv, low, high)
                combined_mask = cv2.bitwise_or(combined_mask, mask)

            if np.count_nonzero(combined_mask) < 200:
                continue

            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            closed = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
            contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < min_area_px:
                    continue
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
                pts = approx.reshape(-1, 2).tolist()
                if len(pts) >= 3:
                    poly, clean_v, is_valid = cls.simplify_and_validate_polygon(pts)
                    if is_valid and poly.area >= min_area_px:
                        candidate_polygons.append({
                            "source": f"SATELLITE_MARKER_{color_name}",
                            "poly": poly,
                            "vertices": clean_v,
                            "area": float(poly.area),
                            "confidence": 0.94 if color_name in ["BLUE", "RED"] else 0.88
                        })

        # 2. Fallback: Contrast parcel edge detection
        if not candidate_polygons:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blur, 40, 120)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            dilated = cv2.dilate(edges, kernel, iterations=2)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if min_area_px <= area <= (total_img_area * 0.92):
                    peri = cv2.arcLength(cnt, True)
                    approx = cv2.approxPolyDP(cnt, 0.018 * peri, True)
                    pts = approx.reshape(-1, 2).tolist()
                    if len(pts) >= 3:
                        poly, clean_v, is_valid = cls.simplify_and_validate_polygon(pts)
                        if is_valid and poly.area >= min_area_px:
                            candidate_polygons.append({
                                "source": "SATELLITE_CONTRAST_EDGE",
                                "poly": poly,
                                "vertices": clean_v,
                                "area": float(poly.area),
                                "confidence": 0.82
                            })

        if candidate_polygons:
            # Select best candidate: largest area within reasonable parcel fill
            candidate_polygons.sort(key=lambda c: (c["confidence"], c["area"]), reverse=True)
            best = candidate_polygons[0]
            shape_meta = cls.classify_shape_characteristics(best["poly"])
            msg = f"Extracted authentic {shape_meta['shapeType']} land boundary from {best['source']}."
            return best["vertices"], best["confidence"], msg, shape_meta

        return None, 0.25, "Low confidence: No clear marked land boundary found in satellite image.", {}

    @classmethod
    def extract_from_white_page_drawing(
        cls,
        img_bgr: np.ndarray,
        min_area_ratio: float = 0.05
    ) -> Tuple[Optional[List[List[float]]], float, str, Dict[str, Any]]:
        """
        Input Type B: 2D White/Blank Page Drawing.
        Detects hand-drawn or printed boundary line drawing on white paper.
        CRITICAL: The white page itself is NOT the land boundary!
        Distinguishes boundary geometry from text, dimensions, labels, arrows, north arrows, page borders.
        """
        h, w = img_bgr.shape[:2]
        total_img_area = float(h * w)
        min_area_px = total_img_area * min_area_ratio

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive thresholding to isolate ink/pencil strokes from white page
        thresh = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 15, 6
        )

        # Morphological closing to bridge small gaps in hand-drawn lines
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_close, iterations=2)

        # Find external contours and hole-filling contours
        contours, hierarchy = cv2.findContours(closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        candidate_polygons = []

        for i, cnt in enumerate(contours):
            area = cv2.contourArea(cnt)
            if area < min_area_px:
                continue

            # Bounding box check: eliminate the page border itself
            bx, by, bw, bh = cv2.boundingRect(cnt)
            # If contour covers > 94% of page dimensions and starts near (0, 0), it's the page border!
            if bw > (w * 0.94) and bh > (h * 0.94):
                continue

            peri = cv2.arcLength(cnt, True)
            # Douglas-Peucker with gentle factor (0.012) to capture corners and slopes
            approx = cv2.approxPolyDP(cnt, 0.012 * peri, True)
            pts = approx.reshape(-1, 2).tolist()

            if 3 <= len(pts) <= 24:
                poly, clean_v, is_valid = cls.simplify_and_validate_polygon(pts)
                if is_valid and poly.area >= min_area_px:
                    candidate_polygons.append({
                        "source": "WHITE_PAGE_STROKE_CONTOUR",
                        "poly": poly,
                        "vertices": clean_v,
                        "area": float(poly.area),
                        "perimeter": float(poly.length),
                        "vertexCount": len(pts),
                        "confidence": 0.92
                    })

        if not candidate_polygons:
            # Fallback: Invert threshold to check for enclosed white interior within drawn perimeter
            inv_thresh = cv2.bitwise_not(thresh)
            cnts_inv, _ = cv2.findContours(inv_thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in cnts_inv:
                area = cv2.contourArea(cnt)
                bx, by, bw, bh = cv2.boundingRect(cnt)
                if min_area_px <= area <= (total_img_area * 0.88):
                    if bw < (w * 0.92) or bh < (h * 0.92):
                        peri = cv2.arcLength(cnt, True)
                        approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
                        pts = approx.reshape(-1, 2).tolist()
                        if 3 <= len(pts) <= 24:
                            poly, clean_v, is_valid = cls.simplify_and_validate_polygon(pts)
                            if is_valid and poly.area >= min_area_px:
                                candidate_polygons.append({
                                    "source": "WHITE_PAGE_INNER_ENCLOSURE",
                                    "poly": poly,
                                    "vertices": clean_v,
                                    "area": float(poly.area),
                                    "perimeter": float(poly.length),
                                    "vertexCount": len(pts),
                                    "confidence": 0.85
                                })

        if candidate_polygons:
            # Select best candidate: prioritize largest non-page-border enclosed polygon
            candidate_polygons.sort(key=lambda c: c["area"], reverse=True)
            best = candidate_polygons[0]
            shape_meta = cls.classify_shape_characteristics(best["poly"])
            msg = f"Detected {shape_meta['shapeType']} land boundary from 2D drawing (white page excluded)."
            return best["vertices"], best["confidence"], msg, shape_meta

        return None, 0.30, "No closed 2D boundary drawing detected on white page. Please check lines or use manual edit.", {}

    @classmethod
    def extract_from_cad_technical_drawing(
        cls,
        img_bgr: np.ndarray,
        min_area_ratio: float = 0.05
    ) -> Tuple[Optional[List[List[float]]], float, str, Dict[str, Any]]:
        """
        Input Type C: CAD / Technical / Handmade Plan.
        Identifies primary outer land boundary, ignoring internal dimension lines, notes, hatching.
        """
        h, w = img_bgr.shape[:2]
        total_img_area = float(h * w)
        min_area_px = total_img_area * min_area_ratio

        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        # Canny edge on CAD drawing
        edges = cv2.Canny(blur, 50, 150)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated = cv2.dilate(edges, kernel, iterations=2)
        closed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidate_polygons = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area_px:
                continue

            bx, by, bw, bh = cv2.boundingRect(cnt)
            # Filter out drawing border
            if bw > (w * 0.96) and bh > (h * 0.96):
                continue

            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
            pts = approx.reshape(-1, 2).tolist()

            if 3 <= len(pts) <= 24:
                poly, clean_v, is_valid = cls.simplify_and_validate_polygon(pts)
                if is_valid and poly.area >= min_area_px:
                    candidate_polygons.append({
                        "source": "CAD_OUTER_CONTOUR",
                        "poly": poly,
                        "vertices": clean_v,
                        "area": float(poly.area),
                        "confidence": 0.90
                    })

        if candidate_polygons:
            candidate_polygons.sort(key=lambda c: c["area"], reverse=True)
            best = candidate_polygons[0]
            shape_meta = cls.classify_shape_characteristics(best["poly"])
            msg = f"Extracted authentic {shape_meta['shapeType']} CAD outer land boundary."
            return best["vertices"], best["confidence"], msg, shape_meta

        return None, 0.35, "Could not isolate outer CAD boundary polygon. Manual verification recommended.", {}

    @classmethod
    def detect_from_image(
        cls,
        img_bgr: np.ndarray,
        epsilon_ratio: float = 0.012,
        min_area_ratio: float = 0.04,
        detection_mode: str = "AUTO"
    ) -> Dict[str, Any]:
        """
        Master detector routing based on classified input category (Section 27).
        Allows tuning epsilon_ratio, min_area_ratio, and detection_mode.
        """
        if img_bgr is None or img_bgr.size == 0:
            return {
                "isValid": False,
                "inputCategory": "UNKNOWN",
                "statusMessage": "Invalid or unreadable image input",
                "polygon": [],
                "confidence": 0.0
            }

        if detection_mode and detection_mode.upper() in ["SATELLITE_AERIAL", "WHITE_PAGE_DRAWING", "CAD_TECHNICAL"]:
            input_type = detection_mode.upper()
        else:
            input_type = cls.classify_input_type(img_bgr)
        logger.info(f"Classified document input type: {input_type}")

        if input_type == "SATELLITE_AERIAL":
            verts, conf, msg, meta = cls.extract_from_satellite_image(img_bgr, min_area_ratio=min_area_ratio)
        elif input_type == "WHITE_PAGE_DRAWING":
            verts, conf, msg, meta = cls.extract_from_white_page_drawing(img_bgr, min_area_ratio=min_area_ratio)
        else:  # CAD_TECHNICAL
            verts, conf, msg, meta = cls.extract_from_cad_technical_drawing(img_bgr, min_area_ratio=min_area_ratio)

        # If primary category failed, try white page fallback
        if not verts and input_type != "WHITE_PAGE_DRAWING":
            verts, conf, msg, meta = cls.extract_from_white_page_drawing(img_bgr, min_area_ratio=min_area_ratio)

        # Simplify with custom epsilon if provided
        if verts and len(verts) >= 3 and epsilon_ratio != 0.012:
            poly_simp, clean_simp, is_valid_simp = cls.simplify_and_validate_polygon(verts, epsilon_ratio=epsilon_ratio)
            if is_valid_simp and clean_simp:
                verts = clean_simp

        is_valid = bool(verts and len(verts) >= 3 and conf >= 0.50)

        return {
            "isValid": is_valid,
            "inputCategory": input_type,
            "polygon": verts or [],
            "geometry": verts or [],
            "confidence": round(conf, 2),
            "statusMessage": msg,
            "shapeType": meta.get("shapeType", "UNKNOWN"),
            "concavityRatio": meta.get("concavityRatio", 1.0),
            "isConcave": meta.get("isConcave", False),
            "aspectRatio": meta.get("aspectRatio", 1.0),
            "vertexCount": meta.get("vertexCount", len(verts) if verts else 0),
            "area": meta.get("area", 0.0),
            "perimeter": meta.get("perimeter", 0.0),
        }

    @classmethod
    def detect_from_file(
        cls,
        file_path: str,
        epsilon_ratio: float = 0.012,
        min_area_ratio: float = 0.04,
        detection_mode: str = "AUTO"
    ) -> Dict[str, Any]:
        """Reads image or CAD file from disk and extracts the land boundary polygon."""
        try:
            img = cv2.imread(file_path)
            if img is not None:
                return cls.detect_from_image(
                    img,
                    epsilon_ratio=epsilon_ratio,
                    min_area_ratio=min_area_ratio,
                    detection_mode=detection_mode
                )
            return {
                "isValid": False,
                "inputCategory": "FILE_READ_ERROR",
                "statusMessage": f"Could not decode image at {file_path}",
                "polygon": [],
                "confidence": 0.0
            }
        except Exception as e:
            logger.error(f"Error detecting boundary from file {file_path}: {e}")
            return {
                "isValid": False,
                "inputCategory": "ERROR",
                "statusMessage": str(e),
                "polygon": [],
                "confidence": 0.0
            }

    def detect_project_boundary(
        self,
        universal_primitives_dict: Optional[Dict[str, Any]] = None,
        geometry_graph_dict: Optional[Dict[str, Any]] = None,
        road_network_dict: Optional[Dict[str, Any]] = None,
        segmentation_masks_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Maintains backward compatibility with pipeline stages while enforcing authentic polygon geometry.
        """
        u_dict = universal_primitives_dict or {}
        r_dict = road_network_dict or {}
        s_dict = segmentation_masks_dict or {}

        primitives = u_dict.get("universalPrimitives", []) or u_dict.get("primitives", [])
        roads = r_dict.get("roads", [])
        boundary_candidates = []

        # 1. Semantic Segmentation Masks
        semantic_regions = s_dict.get("semanticRegions", []) or s_dict.get("regions", [])
        for r in semantic_regions:
            cls_name = r.get("className", "").upper()
            if cls_name in ["LAND_BOUNDARY", "BOUNDARY", "FOREGROUND", "PLOT_BOUNDARY"]:
                poly_pts = r.get("polygon", [])
                if len(poly_pts) >= 3:
                    poly, clean_verts, is_valid = self.simplify_and_validate_polygon(poly_pts)
                    if poly and poly.area > 2000.0:
                        boundary_candidates.append({
                            "id": r.get("regionId") or "seg-boundary-001",
                            "poly": poly,
                            "vertices": clean_verts,
                            "area": float(poly.area),
                            "perimeter": float(poly.length),
                            "bbox": list(poly.bounds),
                            "source": "SEMANTIC_SEGMENTATION"
                        })

        # 2. Universal Primitives
        for p in primitives:
            cand_type = p.get("candidateType", "UNKNOWN")
            is_closed = p.get("isClosed", False)
            verts = p.get("vertices", [])
            area = float(p.get("area", 0.0))

            if cand_type == "BOUNDARY_CANDIDATE" or (is_closed and area > 10000.0) or (len(verts) >= 4 and area > 2000.0):
                poly, clean_verts, is_valid = self.simplify_and_validate_polygon(verts)
                if poly and poly.area > 2000.0:
                    boundary_candidates.append({
                        "id": p.get("id") or p.get("primitiveId"),
                        "poly": poly,
                        "vertices": clean_verts,
                        "area": float(poly.area),
                        "perimeter": float(poly.length),
                        "bbox": list(poly.bounds),
                        "source": "UNIVERSAL_PRIMITIVES"
                    })

        # 3. Convex/Concave Hull fallback
        if not boundary_candidates and primitives:
            all_pts = []
            for p in primitives:
                for v in p.get("vertices", []):
                    if len(v) >= 2:
                        all_pts.append((float(v[0]), float(v[1])))
            if len(all_pts) >= 4:
                try:
                    mp = MultiPoint(all_pts)
                    hull = mp.convex_hull
                    if isinstance(hull, ShapelyPolygon) and hull.area > 2000.0:
                        poly, clean_verts, is_valid = self.simplify_and_validate_polygon(list(hull.exterior.coords))
                        if poly and is_valid:
                            boundary_candidates.append({
                                "id": "hull-boundary-001",
                                "poly": poly,
                                "vertices": clean_verts,
                                "area": float(poly.area),
                                "perimeter": float(poly.length),
                                "bbox": list(poly.bounds),
                                "source": "CONVEX_HULL_RECONSTRUCTION"
                            })
                except Exception as hull_err:
                    logger.warning(f"Boundary hull extraction note: {hull_err}")

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
            confidence = 0.95
            status_msg = "Land boundary extracted and topologically validated"
        else:
            boundary_id = "boundary-unresolved"
            vertices = []
            area = 0.0
            perimeter = 0.0
            bbox = [0.0, 0.0, 0.0, 0.0]
            is_valid = False
            poly_obj = None
            confidence = 0.0
            status_msg = "No valid land boundary polygon detected in input"

        w = abs(bbox[2] - bbox[0]) if bbox else 0.0
        h = abs(bbox[3] - bbox[1]) if bbox else 0.0
        orientation = "NORTH" if h >= w else "EAST"

        shape_meta = self.classify_shape_characteristics(poly_obj) if poly_obj else {}

        geo_json = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [vertices] if vertices else []
            },
            "properties": {
                "boundaryId": boundary_id,
                "areaSqft": round(area, 2),
                "perimeterFt": round(perimeter, 2),
                "orientation": orientation,
                "shapeType": shape_meta.get("shapeType", "UNKNOWN"),
                "isValid": is_valid,
                "statusMessage": status_msg
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
            "shapeType": shape_meta.get("shapeType", "UNKNOWN"),
            "concavityRatio": shape_meta.get("concavityRatio", 1.0),
            "confidence": confidence,
            "roadsContainedCount": len(roads),
            "isValidBoundary": is_valid,
            "statusMessage": status_msg
        }

        logger.info(f"BoundaryDetectionEngine: '{boundary_id}', valid={is_valid}, area={area:.2f}, shape={shape_meta.get('shapeType')}")
        return result


boundary_detection_engine_instance = BoundaryDetectionEngine()
