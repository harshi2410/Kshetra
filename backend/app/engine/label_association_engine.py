import math
import logging
from typing import Dict, Any, List, Optional
from shapely.geometry import Point, Polygon

logger = logging.getLogger(__name__)


class LabelAssociationEngine:
    """
    Label Association Engine Singleton (TASK-049 / TASK-055)
    Spatially connects sanitized OCR text elements and structured engineering metadata
    to layout geometry entities (PLOTS, ROADS, BOUNDARY).
    Produces LABELED_LAYOUT artifact with exact Shapely point-in-polygon checks and
    attribute propagation.
    """

    def _build_shapely_polygon(self, geom_pts: List[Any]) -> Optional[Polygon]:
        if not geom_pts or len(geom_pts) < 3:
            return None
        try:
            pts = [(float(p[0]), float(p[1])) for p in geom_pts]
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
            return poly if poly.is_valid and not poly.is_empty else None
        except Exception:
            return None

    def associate_labels(
        self,
        plots_dict: Dict[str, Any],
        roads_dict: Dict[str, Any],
        boundary_dict: Dict[str, Any],
        ocr_text_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        plots = plots_dict.get("plots", [])
        roads = roads_dict.get("roads", [])
        boundary_id = boundary_dict.get("boundaryId", "boundary-001")
        text_elements = ocr_text_dict.get("textElements", [])

        ocr_assignments: List[Dict[str, Any]] = []
        assigned_ocr_ids = set()

        # Build plot representation and Shapely polygons
        labeled_plots: Dict[str, Dict[str, Any]] = {}
        plot_polygons: Dict[str, Optional[Polygon]] = {}

        for p in plots:
            pid = p["plotId"]
            geom = p.get("geometry", [])
            poly = self._build_shapely_polygon(geom)
            plot_polygons[pid] = poly

            labeled_plots[pid] = {
                "plotId": pid,
                "primitiveId": p.get("primitiveId"),
                "geometry": geom,
                "centroid": p.get("centroid", [0.0, 0.0]),
                "boundingBox": p.get("boundingBox", [0.0, 0.0, 0.0, 0.0]),
                "area": p.get("area", 0.0),
                "perimeter": p.get("perimeter", 0.0),
                "facing": p.get("orientation", "NORTH"),
                "plotNumber": None,
                "areaLabel": None,
                "dimensionLabels": [],
                "structuredDimensions": None,
                "nearestRoadId": None,
                "roadName": None,
                "confidence": p.get("confidence", 0.95)
            }

        labeled_roads: Dict[str, Dict[str, Any]] = {
            r["roadId"]: {
                "roadId": r["roadId"],
                "geometry": r.get("geometry", []),
                "centerline": r.get("centerline", []),
                "roadWidth": r.get("width", 30.0),
                "length": r.get("length", 0.0),
                "roadName": None,
                "roadType": "SECONDARY" if r.get("width", 30.0) <= 30.0 else "PRIMARY",
                "connectedRoads": r.get("connectedRoads", [])
            } for r in roads
        }

        boundary_labels = []

        # 1. Boundary & Global Text Labels
        for t in text_elements:
            txt_id = t["id"]
            clean_text = t.get("cleanedText", t.get("text", "")).strip()
            upper_text = clean_text.upper()
            classification = t.get("classification", "")

            if classification == "BOUNDARY_OR_GLOBAL" or any(k in upper_text for k in ["NORTH", "SURVEY", "S.NO", "SY.NO", "LAYOUT", "KEY PLAN"]):
                boundary_labels.append(clean_text)
                assigned_ocr_ids.add(txt_id)
                ocr_assignments.append({
                    "ocrElementId": txt_id,
                    "text": clean_text,
                    "assignedTo": boundary_id,
                    "assignmentType": "PROJECT_BOUNDARY",
                    "reason": "Boundary metadata classification",
                    "distance": 0.0
                })

        # 2. Road Labels
        for t in text_elements:
            txt_id = t["id"]
            if txt_id in assigned_ocr_ids:
                continue

            clean_text = t.get("cleanedText", t.get("text", "")).strip()
            upper_text = clean_text.upper()
            center = t.get("center", [0.0, 0.0])
            classification = t.get("classification", "")

            if classification == "ROAD_LABEL" or "ROAD" in upper_text or "STREET" in upper_text or "AVENUE" in upper_text or ("FT" in upper_text and "SQ" not in upper_text and "WIDE" in upper_text):
                best_road_id, min_dist = None, float("inf")
                for r in roads:
                    cline = r.get("centerline", [])
                    if cline:
                        rcx = (cline[0][0] + cline[-1][0]) / 2.0
                        rcy = (cline[0][1] + cline[-1][1]) / 2.0
                        dist = math.hypot(center[0] - rcx, center[1] - rcy)
                        if dist < min_dist:
                            min_dist, best_road_id = dist, r["roadId"]

                if best_road_id:
                    labeled_roads[best_road_id]["roadName"] = clean_text
                    struct_data = t.get("structuredData", {})
                    if struct_data.get("roadWidth"):
                        labeled_roads[best_road_id]["roadWidth"] = struct_data["roadWidth"]

                    assigned_ocr_ids.add(txt_id)
                    ocr_assignments.append({
                        "ocrElementId": txt_id,
                        "text": clean_text,
                        "assignedTo": best_road_id,
                        "assignmentType": "ROAD_NETWORK",
                        "reason": "Road keyword & centerline proximity",
                        "distance": round(min_dist, 2)
                    })

        # 3. Plot Labels & Dimensions (Exact Shapely containment with bbox / centroid distance fallback)
        for t in text_elements:
            txt_id = t["id"]
            if txt_id in assigned_ocr_ids:
                continue

            clean_text = t.get("cleanedText", t.get("text", "")).strip()
            upper_text = clean_text.upper()
            center = t.get("center", [0.0, 0.0])
            pt = Point(center[0], center[1])
            classification = t.get("classification", "")
            struct_data = t.get("structuredData", {})

            target_plot_id, assignment_type, min_dist = None, None, float("inf")

            # Check exact Shapely containment first
            for pid, poly in plot_polygons.items():
                if poly and poly.contains(pt):
                    target_plot_id, assignment_type, min_dist = pid, "POINT_IN_POLYGON", 0.0
                    break

            # Fallback to bounding box / centroid distance
            if not target_plot_id:
                for p in plots:
                    pid = p["plotId"]
                    bbox = p.get("boundingBox", [0.0, 0.0, 0.0, 0.0])
                    c = p.get("centroid", [0.0, 0.0])
                    is_inside_bbox = (bbox[0] <= center[0] <= bbox[2] and bbox[1] <= center[1] <= bbox[3])
                    dist = math.hypot(center[0] - c[0], center[1] - c[1])

                    if is_inside_bbox:
                        target_plot_id, assignment_type, min_dist = pid, "BBOX_INTERSECTION", dist
                        break
                    elif dist < min_dist and dist < 200.0:
                        min_dist, target_plot_id, assignment_type = dist, pid, "NEAREST_POLYGON"

            if target_plot_id:
                pref = labeled_plots[target_plot_id]
                if classification == "AREA" or "AREA" in upper_text or "SQ" in upper_text:
                    pref["areaLabel"] = clean_text
                elif classification == "DIMENSION" or "X" in upper_text or "*" in upper_text:
                    pref["dimensionLabels"].append(clean_text)
                    if struct_data and "width" in struct_data:
                        pref["structuredDimensions"] = struct_data
                elif classification == "PLOT_LABEL" or not pref["plotNumber"]:
                    pref["plotNumber"] = struct_data.get("formattedLabel", clean_text)

                assigned_ocr_ids.add(txt_id)
                ocr_assignments.append({
                    "ocrElementId": txt_id,
                    "text": clean_text,
                    "assignedTo": target_plot_id,
                    "assignmentType": assignment_type,
                    "reason": f"Spatially matched via {assignment_type}",
                    "distance": round(min_dist, 2)
                })

        # 4. Unassigned OCR Elements
        for t in text_elements:
            if t["id"] not in assigned_ocr_ids:
                clean_text = t.get("cleanedText", t.get("text", ""))
                ocr_assignments.append({
                    "ocrElementId": t["id"],
                    "text": clean_text,
                    "assignedTo": None,
                    "assignmentType": "UNASSIGNED",
                    "reason": "Outside spatial threshold",
                    "distance": -1.0
                })

        # Nearest Road Assignment for each plot
        for pid, pref in labeled_plots.items():
            c = pref["centroid"]
            min_rd_dist, best_rd_id, best_rd_name = float("inf"), None, None
            for r in roads:
                rid, cline = r["roadId"], r.get("centerline", [])
                if cline:
                    rcx = (cline[0][0] + cline[-1][0]) / 2.0
                    rcy = (cline[0][1] + cline[-1][1]) / 2.0
                    dist = math.hypot(c[0] - rcx, c[1] - rcy)
                    if dist < min_rd_dist:
                        min_rd_dist, best_rd_id = dist, rid
                        best_rd_name = labeled_roads[rid]["roadName"] or f"ROAD-{rid[-3:]}"
            pref["nearestRoadId"], pref["roadName"] = best_rd_id, best_rd_name

        result = {
            "artifactType": "LABELED_LAYOUT",
            "totalPlotsCount": len(labeled_plots),
            "totalRoadsCount": len(labeled_roads),
            "totalOcrAssignmentsCount": len(ocr_assignments),
            "boundaryLabels": boundary_labels,
            "plots": list(labeled_plots.values()),
            "roads": list(labeled_roads.values()),
            "ocrAssignments": ocr_assignments
        }

        logger.info(f"LabelAssociationEngine completed: {len(labeled_plots)} plots, {len(labeled_roads)} roads, {len(ocr_assignments)} OCR assignments")
        return result


label_association_engine_instance = LabelAssociationEngine()
