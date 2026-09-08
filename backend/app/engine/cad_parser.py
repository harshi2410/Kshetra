"""
CADParser — Production DXF / CAD Entity Extraction Engine.
Extracts vector geometries, polylines, hatches, and text annotations
directly from DXF blueprints using ezdxf.
"""

import math
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import ezdxf
    HAS_EZDXF = True
except ImportError:
    HAS_EZDXF = False


class CADParser:
    """
    Parses CAD DXF files and extracts normalized geometric primitives,
    layer semantics, boundaries, and annotations for LandOS.
    """

    def __init__(self):
        self.supported = HAS_EZDXF

    def parse_dxf(self, file_path_str: str) -> Dict[str, Any]:
        """
        Parses a .dxf file and extracts 2D vector primitives and text annotations.
        Normalizes all coordinates to a positive bounding space starting at (0, 0).
        """
        if not HAS_EZDXF:
            raise RuntimeError("ezdxf library is not installed in Python environment")

        path = Path(file_path_str)
        if not path.exists():
            raise FileNotFoundError(f"CAD file not found at path: {file_path_str}")

        try:
            doc = ezdxf.readfile(str(path))
            msp = doc.modelspace()
        except Exception as e:
            logger.error(f"Failed to read DXF file {file_path_str}: {e}")
            raise ValueError(f"Invalid or corrupted DXF file: {str(e)}")

        raw_primitives: List[Dict[str, Any]] = []
        raw_text_elements: List[Dict[str, Any]] = []
        layers_set = set()

        all_points: List[Tuple[float, float]] = []

        # 1. Process LINES
        for idx, line in enumerate(msp.query("LINE")):
            layer = line.dxf.layer
            layers_set.add(layer)
            start = (float(line.dxf.start.x), float(line.dxf.start.y))
            end = (float(line.dxf.end.x), float(line.dxf.end.y))
            all_points.extend([start, end])
            length = math.hypot(end[0] - start[0], end[1] - start[1])

            raw_primitives.append({
                "primitiveId": f"dxf-line-{idx:04d}",
                "type": "LINE",
                "layer": layer,
                "vertices": [list(start), list(end)],
                "isClosed": False,
                "length": round(length, 2),
                "area": 0.0,
            })

        # 2. Process LWPOLYLINE & POLYLINE
        for idx, poly in enumerate(msp.query("LWPOLYLINE POLYLINE")):
            layer = poly.dxf.layer
            layers_set.add(layer)
            is_closed = poly.is_closed if hasattr(poly, "is_closed") else bool(poly.dxf.flags & 1)

            pts: List[Tuple[float, float]] = []
            if poly.dxftype() == "LWPOLYLINE":
                pts = [(float(p[0]), float(p[1])) for p in poly.get_points("xy")]
            else:
                pts = [(float(v.dxf.location.x), float(v.dxf.location.y)) for v in poly.vertices]

            if len(pts) < 2:
                continue

            all_points.extend(pts)

            # Compute polyline length and polygon area if closed
            total_len = 0.0
            for i in range(len(pts) - 1):
                total_len += math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1])
            if is_closed and len(pts) >= 3:
                total_len += math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])

            area = 0.0
            if is_closed and len(pts) >= 3:
                # Shoelace formula
                for i in range(len(pts)):
                    j = (i + 1) % len(pts)
                    area += pts[i][0] * pts[j][1]
                    area -= pts[j][0] * pts[i][1]
                area = abs(area) / 2.0

            raw_primitives.append({
                "primitiveId": f"dxf-poly-{idx:04d}",
                "type": "POLYGON" if (is_closed and len(pts) >= 3) else "POLYLINE",
                "layer": layer,
                "vertices": [list(p) for p in pts],
                "isClosed": is_closed,
                "length": round(total_len, 2),
                "area": round(area, 2),
            })

        # 3. Process CIRCLES and ARCS
        for idx, circle in enumerate(msp.query("CIRCLE")):
            layer = circle.dxf.layer
            layers_set.add(layer)
            cx, cy = float(circle.dxf.center.x), float(circle.dxf.center.y)
            r = float(circle.dxf.radius)
            # 16-point polygon approximation
            pts = [
                (cx + r * math.cos(2 * math.pi * i / 16), cy + r * math.sin(2 * math.pi * i / 16))
                for i in range(16)
            ]
            all_points.extend(pts)
            raw_primitives.append({
                "primitiveId": f"dxf-circ-{idx:04d}",
                "type": "POLYGON",
                "layer": layer,
                "vertices": [list(p) for p in pts],
                "isClosed": True,
                "length": round(2 * math.pi * r, 2),
                "area": round(math.pi * r * r, 2),
            })

        # 4. Process TEXT and MTEXT annotations
        for idx, text_ent in enumerate(msp.query("TEXT MTEXT")):
            layer = text_ent.dxf.layer
            layers_set.add(layer)
            content = ""
            pos = (0.0, 0.0)
            height = 10.0

            if text_ent.dxftype() == "TEXT":
                content = text_ent.dxf.text
                pos = (float(text_ent.dxf.insert.x), float(text_ent.dxf.insert.y))
                height = float(text_ent.dxf.height) if hasattr(text_ent.dxf, "height") else 10.0
            elif text_ent.dxftype() == "MTEXT":
                content = text_ent.text
                pos = (float(text_ent.dxf.insert.x), float(text_ent.dxf.insert.y))
                height = float(text_ent.dxf.char_height) if hasattr(text_ent.dxf, "char_height") else 10.0

            clean_text = content.strip()
            if clean_text:
                all_points.append(pos)
                raw_text_elements.append({
                    "id": f"dxf-txt-{idx:04d}",
                    "text": clean_text,
                    "position": list(pos),
                    "layer": layer,
                    "height": height,
                    "confidence": 1.0,
                    "source": "CAD_DXF"
                })

        # 5. Coordinate space normalization
        if not all_points:
            min_x, min_y, max_x, max_y = 0.0, 0.0, 1000.0, 800.0
        else:
            xs = [p[0] for p in all_points]
            ys = [p[1] for p in all_points]
            min_x, min_y = min(xs), min(ys)
            max_x, max_y = max(xs), max(ys)

        width = max(1.0, max_x - min_x)
        height = max(1.0, max_y - min_y)

        # Shift all coordinates so min_x, min_y is at (50, 50) padding
        pad = 50.0
        scale = 1.0
        # Optional scale normalization if drawing is in mm (e.g. dimensions > 10,000)
        if max(width, height) > 50000.0:
            scale = 0.001  # convert mm to meters

        normalized_primitives: List[Dict[str, Any]] = []
        for prim in raw_primitives:
            norm_verts = [
                [
                    round((v[0] - min_x) * scale + pad, 2),
                    round((v[1] - min_y) * scale + pad, 2)
                ]
                for v in prim["vertices"]
            ]
            prim["vertices"] = norm_verts
            prim["area"] = round(prim["area"] * (scale ** 2), 2)
            prim["length"] = round(prim["length"] * scale, 2)
            normalized_primitives.append(prim)

        normalized_text: List[Dict[str, Any]] = []
        for t in raw_text_elements:
            orig_pos = t["position"]
            norm_pos = [
                round((orig_pos[0] - min_x) * scale + pad, 2),
                round((orig_pos[1] - min_y) * scale + pad, 2)
            ]
            t["position"] = norm_pos
            t["center"] = norm_pos
            t["boundingBox"] = [
                norm_pos[0] - 10,
                norm_pos[1] - 10,
                norm_pos[0] + 50,
                norm_pos[1] + 10
            ]
            normalized_text.append(t)

        bbox_norm = [pad, pad, round(width * scale + pad, 2), round(height * scale + pad, 2)]

        return {
            "artifactType": "CAD_DXF_PARSED",
            "fileName": path.name,
            "layers": sorted(list(layers_set)),
            "primitivesCount": len(normalized_primitives),
            "textElementsCount": len(normalized_text),
            "boundingBox": bbox_norm,
            "width": round(width * scale, 2),
            "height": round(height * scale, 2),
            "primitives": normalized_primitives,
            "textElements": normalized_text,
            "sourceUnit": "METRIC" if scale < 1.0 else "UNITLESS"
        }


cad_parser_instance = CADParser()
