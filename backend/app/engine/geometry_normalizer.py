import math
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.engine.normalizer_helpers import CoordinateNormalizer, BoundingBoxCalculator, DuplicateRemover

logger = logging.getLogger(__name__)

class GeometryNormalizer:
    """
    Geometry Normalizer Engine Singleton (TASK-041)
    Normalizes coordinates, cleans duplicate vertices, computes rich bounding boxes,
    removes duplicate paths, and classifies candidate drawing primitives.
    """

    def normalize_primitives(self, vector_extraction_payload: Dict[str, Any]) -> Dict[str, Any]:
        raw_primitives = vector_extraction_payload.get("primitives", []) or vector_extraction_payload.get("paths", [])
        page_width = float(vector_extraction_payload.get("pageWidth") or 1200.0)
        page_height = float(vector_extraction_payload.get("pageHeight") or 800.0)

        cleaned_primitives = []
        counts = {"line": 0, "polyline": 0, "polygon": 0, "rectangle": 0, "circle": 0}

        for idx, prim in enumerate(raw_primitives):
            pts = prim.get("points") or prim.get("vertices") or []
            clean_pts = CoordinateNormalizer.clean_points(pts)
            if not clean_pts:
                continue

            bbox = BoundingBoxCalculator.calc_rich_bbox(clean_pts)
            p_type = prim.get("primitiveType") or self._classify_primitive(clean_pts, prim.get("isClosed", False))
            
            c_key = p_type.lower()
            if c_key in counts:
                counts[c_key] += 1
            else:
                counts["polygon"] += 1

            cleaned_primitives.append({
                "primitiveId": prim.get("primitiveId") or f"norm-{idx+1:04d}",
                "primitiveType": p_type,
                "points": clean_pts,
                "vertices": [[p["x"], p["y"]] for p in clean_pts],
                "boundingBox": [bbox["minX"], bbox["minY"], bbox["maxX"], bbox["maxY"]],
                "richBoundingBox": bbox,
                "area": bbox["area"],
                "perimeter": round(float(prim.get("perimeter") or 0.0), 2),
                "isClosed": bool(prim.get("isClosed", False)),
                "layerName": prim.get("layerName") or "0",
                "strokeColor": prim.get("strokeColor") or "#000000",
                "fillColor": prim.get("fillColor") or "none",
                "strokeWidth": float(prim.get("strokeWidth") or 1.0)
            })

        deduped_primitives, dup_count = DuplicateRemover.remove_duplicates(cleaned_primitives)

        result = {
            "artifactType": "NORMALIZED_GEOMETRY_MODEL",
            "pageWidth": page_width,
            "pageHeight": page_height,
            "totalPrimitivesCount": len(deduped_primitives),
            "duplicatesRemovedCount": dup_count,
            "primitiveCounts": counts,
            "primitives": deduped_primitives
        }

        logger.info(f"GeometryNormalizer completed: {len(deduped_primitives)} normalized primitives, {dup_count} duplicates removed")
        return result

    def _classify_primitive(self, points: List[Dict[str, float]], is_closed: bool) -> str:
        n = len(points)
        if n <= 2:
            return "LINE"
        if is_closed:
            return "RECTANGLE" if n == 5 or n == 4 else "POLYGON"
        return "POLYLINE"

geometry_normalizer_instance = GeometryNormalizer()
