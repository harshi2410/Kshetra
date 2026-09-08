import logging
from typing import Dict, Any, List
from app.engine.geometry_engine import geometry_engine_instance

logger = logging.getLogger(__name__)

class UniversalPrimitiveDetector:
    """
    Universal Primitive Detection Engine Singleton (TASK-043 / TASK-055)
    Validates and processes raw primitives using GEOS computational geometry
    and categorizes primitives into BOUNDARY_CANDIDATE, ROAD_CANDIDATE, PLOT_CANDIDATE, etc.
    """

    def detect_universal_primitives(
        self,
        primitives_dict: Dict[str, Any],
        source_pipeline: str = "RASTER"
    ) -> Dict[str, Any]:
        """
        Processes primitive dictionary using GEOS polygon validation and outputs
        UNIVERSAL_PRIMITIVES artifact metadata.
        """
        raw_list = primitives_dict.get("primitives", []) or primitives_dict.get("paths", [])

        canvas_w = float(primitives_dict.get("canvasWidth") or primitives_dict.get("pageWidth") or 1200.0)
        canvas_h = float(primitives_dict.get("canvasHeight") or primitives_dict.get("pageHeight") or 800.0)
        total_canvas_area = canvas_w * canvas_h

        universal_primitives: List[Dict[str, Any]] = []
        counts = {"boundary": 0, "road": 0, "plot": 0, "text": 0, "open": 0, "unknown": 0}

        for idx, item in enumerate(raw_list):
            prim_id = item.get("primitiveId") or item.get("id") or f"uprim-{idx+1:04d}"
            raw_verts = item.get("vertices") or []
            if not raw_verts and item.get("boundingBox"):
                bbox_raw = item.get("boundingBox")
                if len(bbox_raw) == 4:
                    raw_verts = [
                        [float(bbox_raw[0]), float(bbox_raw[1])],
                        [float(bbox_raw[2]), float(bbox_raw[1])],
                        [float(bbox_raw[2]), float(bbox_raw[3])],
                        [float(bbox_raw[0]), float(bbox_raw[3])],
                        [float(bbox_raw[0]), float(bbox_raw[1])]
                    ]

            is_closed = bool(item.get("isClosed", False))
            confidence = float(item.get("confidence", 0.90))

            # GEOS Computational Geometry Analysis
            geo_info = geometry_engine_instance.analyze_polygon(raw_verts) if (is_closed and raw_verts) else {}
            area = geo_info.get("area") if (geo_info and geo_info.get("area", 0.0) > 0) else float(item.get("area", 0.0))
            perimeter = geo_info.get("perimeter") if (geo_info and geo_info.get("perimeter", 0.0) > 0) else float(item.get("perimeter", 0.0))
            bbox = geo_info.get("boundingBox", item.get("boundingBox", [0.0, 0.0, 100.0, 100.0]))
            clean_verts = geo_info.get("vertices") or raw_verts

            w = abs(bbox[2] - bbox[0])
            h = abs(bbox[3] - bbox[1])
            aspect_ratio = round(w / h, 3) if h > 0 else 1.0

            candidate_type = self._classify_candidate_type(
                is_closed=is_closed,
                area=area,
                aspect_ratio=aspect_ratio,
                w=w,
                h=h,
                total_canvas_area=total_canvas_area
            )

            c_key = candidate_type.replace("_CANDIDATE", "").lower()
            if c_key in counts:
                counts[c_key] += 1
            elif candidate_type == "TEXT_REGION":
                counts["text"] += 1
            elif candidate_type == "OPEN_REGION":
                counts["open"] += 1
            else:
                counts["unknown"] += 1

            universal_primitives.append({
                "id": prim_id,
                "primitiveType": "POLYGON" if is_closed else "LINE",
                "vertices": clean_verts,
                "boundingBox": bbox,
                "perimeter": perimeter,
                "area": area,
                "aspectRatio": aspect_ratio,
                "isClosed": is_closed,
                "isValidGeometry": geo_info.get("isValid", is_closed),
                "wkt": geo_info.get("wkt", ""),
                "geoJson": geo_info.get("geoJson"),
                "confidence": confidence,
                "sourcePipeline": source_pipeline,
                "candidateType": candidate_type
            })

        result = {
            "artifactType": "UNIVERSAL_PRIMITIVES",
            "totalCount": len(universal_primitives),
            "sourcePipeline": source_pipeline,
            "boundaryCandidatesCount": counts["boundary"],
            "roadCandidatesCount": counts["road"],
            "plotCandidatesCount": counts["plot"],
            "textRegionsCount": counts["text"],
            "openRegionsCount": counts["open"],
            "unknownCount": counts["unknown"],
            "universalPrimitives": universal_primitives
        }

        logger.info(f"UniversalPrimitiveDetector GEOS completed: {len(universal_primitives)} items processed")
        return result

    def _classify_candidate_type(
        self,
        is_closed: bool,
        area: float,
        aspect_ratio: float,
        w: float,
        h: float,
        total_canvas_area: float
    ) -> str:
        if not is_closed:
            return "OPEN_REGION"
        area_ratio = area / total_canvas_area if total_canvas_area > 0 else 0.0

        if area_ratio >= 0.30 or (w > 0.7 * (total_canvas_area ** 0.5) and h > 0.7 * (total_canvas_area ** 0.5)):
            return "BOUNDARY_CANDIDATE"
        if (aspect_ratio > 5.0 or aspect_ratio < 0.2) and (w > 100 or h > 100):
            return "ROAD_CANDIDATE"
        if area_ratio < 0.001 or (w < 40 and h < 40):
            return "TEXT_REGION"
        if 0.001 <= area_ratio < 0.30 and 0.15 <= aspect_ratio <= 6.0:
            return "PLOT_CANDIDATE"

        return "UNKNOWN"

universal_primitive_detector_instance = UniversalPrimitiveDetector()
