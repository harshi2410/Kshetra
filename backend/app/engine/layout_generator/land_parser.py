"""
LandParser — Parses land dimensions, polygons, and entry connections into normalized geometric objects.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box, Point as ShapelyPoint


class Point:
    def __init__(self, x: float, y: float):
        self.x = float(x)
        self.y = float(y)

    def to_dict(self) -> Dict[str, float]:
        return {"x": round(self.x, 2), "y": round(self.y, 2)}


class BoundingBox:
    def __init__(self, min_x: float, min_y: float, max_x: float, max_y: float):
        self.min_x = float(min_x)
        self.min_y = float(min_y)
        self.max_x = float(max_x)
        self.max_y = float(max_y)

    @property
    def width(self) -> float:
        return max(0.0, self.max_x - self.min_x)

    @property
    def height(self) -> float:
        return max(0.0, self.max_y - self.min_y)

    @property
    def area(self) -> float:
        return self.width * self.height

    def to_dict(self) -> Dict[str, float]:
        return {
            "minX": round(self.min_x, 2),
            "minY": round(self.min_y, 2),
            "maxX": round(self.max_x, 2),
            "maxY": round(self.max_y, 2),
            "width": round(self.width, 2),
            "height": round(self.height, 2),
        }


class EntryPoint:
    def __init__(self, edge: str, offset_percent: float = 50.0, width_ft: float = 30.0, x: float = 0.0, y: float = 0.0):
        self.edge = edge.upper()
        self.offset_percent = float(offset_percent)
        self.width_ft = float(width_ft)
        self.x = float(x)
        self.y = float(y)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "edge": self.edge,
            "offsetPercent": round(self.offset_percent, 1),
            "widthFt": round(self.width_ft, 1),
            "x": round(self.x, 2),
            "y": round(self.y, 2),
        }


class ParsedLand:
    def __init__(
        self,
        length_ft: float,
        breadth_ft: float,
        boundary_polygon: List[Point],
        entry_points: List[EntryPoint],
        setback_ft: float = 10.0
    ):
        self.length_ft = float(length_ft)
        self.breadth_ft = float(breadth_ft)
        self.boundary_polygon = boundary_polygon
        self.entry_points = entry_points
        self.setback_ft = float(setback_ft)

    @property
    def total_area_sqft(self) -> float:
        if len(self.boundary_polygon) >= 3:
            coords = [(p.x, p.y) for p in self.boundary_polygon]
            poly = ShapelyPolygon(coords)
            return float(poly.area)
        return self.length_ft * self.breadth_ft

    @property
    def bbox(self) -> BoundingBox:
        if not self.boundary_polygon:
            return BoundingBox(0, 0, self.length_ft, self.breadth_ft)
        xs = [p.x for p in self.boundary_polygon]
        ys = [p.y for p in self.boundary_polygon]
        return BoundingBox(min(xs), min(ys), max(xs), max(ys))

    @property
    def shapely_polygon(self) -> ShapelyPolygon:
        coords = [(p.x, p.y) for p in self.boundary_polygon]
        if len(coords) < 3:
            return shapely_box(0, 0, self.length_ft, self.breadth_ft)
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        p = ShapelyPolygon(coords)
        if not p.is_valid:
            p = p.buffer(0)
        return p


class LandParser:
    """Parses rectangular dimensions or arbitrary polygon vertices into ParsedLand."""

    @staticmethod
    def parse(
        length_ft: float = 300.0,
        breadth_ft: float = 200.0,
        polygon_vertices: Optional[List[List[float]]] = None,
        entry_edges: Optional[List[Dict[str, Any]]] = None,
        setback_ft: float = 10.0
    ) -> ParsedLand:
        length = max(50.0, float(length_ft or 300.0))
        breadth = max(50.0, float(breadth_ft or 200.0))

        if polygon_vertices and len(polygon_vertices) >= 3:
            points = [Point(v[0], v[1]) for v in polygon_vertices]
        else:
            points = [
                Point(0, 0),
                Point(length, 0),
                Point(length, breadth),
                Point(0, breadth),
            ]

        # Calculate bounding box
        xs = [p.x for p in points]
        ys = [p.y for p in points]
        min_x, min_y, max_x, max_y = min(xs), min(ys), max(xs), max(ys)
        w, h = max_x - min_x, max_y - min_y

        entries: List[EntryPoint] = []
        if entry_edges:
            for ed in entry_edges:
                edge_name = str(ed.get("edge", "SOUTH")).upper()
                offset_pct = float(ed.get("offsetPercent", 50.0))
                road_w = float(ed.get("widthFt", 30.0))

                # Calculate 2D point on edge
                if edge_name == "SOUTH":
                    ex = min_x + (w * (offset_pct / 100.0))
                    ey = min_y
                elif edge_name == "NORTH":
                    ex = min_x + (w * (offset_pct / 100.0))
                    ey = max_y
                elif edge_name == "WEST":
                    ex = min_x
                    ey = min_y + (h * (offset_pct / 100.0))
                else: # EAST
                    ex = max_x
                    ey = min_y + (h * (offset_pct / 100.0))

                entries.append(EntryPoint(edge_name, offset_pct, road_w, ex, ey))
        else:
            # Default south entry
            entries.append(EntryPoint("SOUTH", 50.0, 30.0, min_x + w * 0.5, min_y))

        return ParsedLand(
            length_ft=w,
            breadth_ft=h,
            boundary_polygon=points,
            entry_points=entries,
            setback_ft=setback_ft
        )
