import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

class CoordinateNormalizer:
    """Rounds coordinates to 2 decimal places and strips consecutive duplicate vertices."""

    @staticmethod
    def normalize_point(pt: Dict[str, float]) -> Dict[str, float]:
        return {"x": round(float(pt.get("x", 0.0)), 2), "y": round(float(pt.get("y", 0.0)), 2)}

    @staticmethod
    def clean_points(points: List[Dict[str, float]]) -> List[Dict[str, float]]:
        if not points: return []
        cleaned = [CoordinateNormalizer.normalize_point(points[0])]
        for pt in points[1:]:
            norm_pt = CoordinateNormalizer.normalize_point(pt)
            if norm_pt["x"] != cleaned[-1]["x"] or norm_pt["y"] != cleaned[-1]["y"]:
                cleaned.append(norm_pt)
        return cleaned

class BoundingBoxCalculator:
    """Computes minX, minY, maxX, maxY, width, height, area, and center."""

    @staticmethod
    def calc_rich_bbox(points: List[Dict[str, float]]) -> Dict[str, Any]:
        if not points:
            return {"minX": 0.0, "minY": 0.0, "maxX": 0.0, "maxY": 0.0, "width": 0.0, "height": 0.0, "area": 0.0, "center": {"x": 0.0, "y": 0.0}}
        xs = [p["x"] for p in points]
        ys = [p["y"] for p in points]
        min_x, max_x = round(min(xs), 2), round(max(xs), 2)
        min_y, max_y = round(min(ys), 2), round(max(ys), 2)
        w, h = round(max_x - min_x, 2), round(max_y - min_y, 2)
        return {
            "minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y,
            "width": w, "height": h, "area": round(w * h, 2),
            "center": {"x": round(min_x + w / 2.0, 2), "y": round(min_y + h / 2.0, 2)}
        }

class DuplicateRemover:
    """Identifies and removes duplicate or reversed line/polygon primitives."""

    @staticmethod
    def canonical_key(points: List[Dict[str, float]]) -> str:
        if not points: return ""
        pts_str = [f"({p['x']:.2f},{p['y']:.2f})" for p in points]
        s1, s2 = "-".join(pts_str), "-".join(reversed(pts_str))
        return s1 if s1 <= s2 else s2

    @staticmethod
    def remove_duplicates(primitives: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
        seen_keys, deduped, duplicate_count = set(), [], 0
        for prim in primitives:
            pts = prim.get("points") or prim.get("vertices") or []
            key = DuplicateRemover.canonical_key(pts)
            if key in seen_keys:
                duplicate_count += 1
            else:
                seen_keys.add(key)
                deduped.append(prim)
        return deduped, duplicate_count
