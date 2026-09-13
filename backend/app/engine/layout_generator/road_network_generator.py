"""
RoadNetworkGenerator — Boundary-First Multi-Strategy Road Infrastructure Engine (Sections 28, 29, 30, 36).
Strict Geometric Invariant:
ROAD ∩ LAND_BOUNDARY = ROAD.
Every generated road corridor is strictly contained inside the authentic land polygon.
Zero road corridors may extend outside the outer land boundary.

Generates 3 genuinely distinct feasible planning topologies adhering to Maharashtra UDCPR 2020:
1. OPTION 1 — Maximum Practical Plot Efficiency (Orthogonal grid spine & feeders)
2. OPTION 2 — Best Accessibility / Circulation (Interior arterial circulation loop following the polygon's boundary contour)
3. OPTION 3 — Best Overall Development Quality (Central courtyard framing open space & lateral wings)
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from shapely.geometry import (
    Polygon as ShapelyPolygon, box as shapely_box, LineString, MultiPolygon, Point as ShapelyPoint
)
from shapely.ops import unary_union
from .land_parser import ParsedLand, Point, BoundingBox, EntryPoint


class RoadSegment:
    def __init__(
        self,
        road_id: str,
        name: str,
        road_type: str,  # MAIN | FEEDER | ARTERIAL | PERIMETER | CUL_DE_SAC
        width_ft: float,
        start: Point,
        end: Point,
        polygon: List[Point],
    ):
        self.road_id = road_id
        self.name = name
        self.road_type = road_type
        self.width_ft = float(width_ft)
        self.width_m = float(width_ft * 0.3048)
        self.start = start
        self.end = end
        self.polygon = polygon

    @property
    def length_ft(self) -> float:
        return math.hypot(self.end.x - self.start.x, self.end.y - self.start.y)

    @property
    def length_m(self) -> float:
        return self.length_ft * 0.3048

    @property
    def area_sqft(self) -> float:
        if len(self.polygon) >= 3:
            coords = [(p.x, p.y) for p in self.polygon]
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            return float(poly.area)
        return self.length_ft * self.width_ft

    @property
    def area_sqm(self) -> float:
        return self.area_sqft * 0.092903

    def to_dict(self) -> Dict[str, Any]:
        return {
            "roadId": self.road_id,
            "name": self.name,
            "type": self.road_type,
            "widthFt": round(self.width_ft, 1),
            "widthM": round(self.width_m, 1),
            "lengthFt": round(self.length_ft, 1),
            "lengthM": round(self.length_m, 1),
            "areaSqft": round(self.area_sqft, 1),
            "areaSqm": round(self.area_sqm, 1),
            "start": self.start.to_dict(),
            "end": self.end.to_dict(),
            "polygon": [p.to_dict() for p in self.polygon],
        }


class RoadNetwork:
    def __init__(self, roads: List[RoadSegment]):
        self.roads = roads

    @property
    def total_road_area_sqft(self) -> float:
        if not self.roads:
            return 0.0
        polys = []
        for r in self.roads:
            if len(r.polygon) >= 3:
                coords = [(p.x, p.y) for p in r.polygon]
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                poly = ShapelyPolygon(coords)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_valid and not poly.is_empty:
                    polys.append(poly)
        if not polys:
            return 0.0
        u = unary_union(polys)
        return float(u.area)

    @property
    def total_road_area_sqm(self) -> float:
        return self.total_road_area_sqft * 0.092903

    @property
    def shapely_union(self) -> ShapelyPolygon:
        polys = []
        for r in self.roads:
            if len(r.polygon) >= 3:
                coords = [(p.x, p.y) for p in r.polygon]
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                poly = ShapelyPolygon(coords)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_valid and not poly.is_empty:
                    polys.append(poly)
        if not polys:
            return ShapelyPolygon()
        return unary_union(polys)


class RoadNetworkGenerator:
    """Generates boundary-clipped planning road networks respecting UDCPR standards."""

    @staticmethod
    def _create_corridor(p1: Point, p2: Point, width: float) -> List[Point]:
        """Creates a rectangular buffer corridor along line segment p1 -> p2."""
        dx = p2.x - p1.x
        dy = p2.y - p1.y
        length = math.hypot(dx, dy)
        if length == 0:
            return [p1, p1, p1, p1]
        nx = -dy / length * (width / 2.0)
        ny = dx / length * (width / 2.0)
        return [
            Point(p1.x + nx, p1.y + ny),
            Point(p2.x + nx, p2.y + ny),
            Point(p2.x - nx, p2.y - ny),
            Point(p1.x - nx, p1.y - ny),
        ]

    @classmethod
    def _clip_corridor_to_land(
        cls,
        corridor_pts: List[Point],
        land_poly: ShapelyPolygon,
        road_id: str,
        name: str,
        road_type: str,
        width_ft: float,
        nominal_start: Point,
        nominal_end: Point,
        min_area: float = 200.0,
    ) -> List[RoadSegment]:
        """
        Geometrically clips candidate corridor to the exact land polygon boundary.
        Guarantees ROAD ∩ LAND_BOUNDARY = ROAD (Section 30).
        Discards fragments outside the boundary or smaller than min_area.
        """
        if len(corridor_pts) < 3:
            return []

        c_coords = [(p.x, p.y) for p in corridor_pts]
        if c_coords[0] != c_coords[-1]:
            c_coords.append(c_coords[0])
        c_poly = ShapelyPolygon(c_coords)
        if not c_poly.is_valid:
            c_poly = c_poly.buffer(0)

        # Compute strict geometric intersection with authentic land polygon
        intersection = c_poly.intersection(land_poly)
        if intersection.is_empty:
            return []

        polys = []
        if isinstance(intersection, ShapelyPolygon):
            polys = [intersection]
        elif isinstance(intersection, MultiPolygon):
            polys = [p for p in intersection.geoms if p.area >= min_area]

        segments = []
        for idx, p in enumerate(polys):
            if p.area < min_area:
                continue
            if not p.is_valid:
                p = p.buffer(0)
            if p.is_empty or p.area < min_area:
                continue

            coords = list(p.exterior.coords)
            seg_pts = [Point(c[0], c[1]) for c in coords[:-1]]
            if len(seg_pts) < 3:
                continue

            b_minx, b_miny, b_maxx, b_maxy = p.bounds
            st = Point((b_minx + b_maxx) / 2.0, b_miny) if idx == 0 else Point(b_minx, b_miny)
            en = Point((b_minx + b_maxx) / 2.0, b_maxy) if idx == 0 else Point(b_maxx, b_maxy)

            seg_id = road_id if len(polys) == 1 else f"{road_id}-{idx+1}"
            segments.append(RoadSegment(
                road_id=seg_id,
                name=name,
                road_type=road_type,
                width_ft=width_ft,
                start=st,
                end=en,
                polygon=seg_pts,
            ))

        return segments

    @classmethod
    def generate_orthogonal_grid(
        cls,
        land: ParsedLand,
        main_road_width: float = 39.37,   # 12.0m UDCPR
        feeder_road_width: float = 29.53, # 9.0m UDCPR
        block_depth_ft: float = 85.0,
    ) -> RoadNetwork:
        """
        OPTION 1 — Maximum Practical Plot Efficiency (Orthogonal Grid Spine & Cross Streets).
        - Central primary avenue aligned with main entry.
        - Efficient cross street feeders maximizing linear frontage.
        - Every corridor is strictly clipped to the authentic land polygon.
        """
        bbox = land.bbox
        land_poly = land.shapely_polygon
        roads: List[RoadSegment] = []

        entry = land.entry_points[0] if land.entry_points else None
        spine_x = entry.x if entry else (bbox.min_x + bbox.width * 0.5)

        # 1. Main Spine Avenue (12.0 M / 39.4 FT)
        spine_start = Point(spine_x, bbox.min_y - 10.0)
        spine_end = Point(spine_x, bbox.max_y + 10.0)
        spine_corridor = cls._create_corridor(spine_start, spine_end, main_road_width)
        clipped_spine = cls._clip_corridor_to_land(
            corridor_pts=spine_corridor,
            land_poly=land_poly,
            road_id="road-grid-main-01",
            name=f"Main Access Avenue ({main_road_width * 0.3048:.1f}M)",
            road_type="MAIN",
            width_ft=main_road_width,
            nominal_start=spine_start,
            nominal_end=spine_end,
        )
        roads.extend(clipped_spine)

        # 2. Horizontal Cross Feeders (9.0 M / 29.5 FT)
        num_feeders = max(1, int(bbox.height / block_depth_ft) - 1)
        for i in range(1, num_feeders + 1):
            y = bbox.min_y + (i * (bbox.height / (num_feeders + 1)))
            p_left = Point(bbox.min_x - 10.0, y)
            p_right = Point(bbox.max_x + 10.0, y)
            feeder_corridor = cls._create_corridor(p_left, p_right, feeder_road_width)
            clipped_feeder = cls._clip_corridor_to_land(
                corridor_pts=feeder_corridor,
                land_poly=land_poly,
                road_id=f"road-grid-feeder-{i:02d}",
                name=f"Internal Cross Street {i:02d} ({feeder_road_width * 0.3048:.1f}M)",
                road_type="FEEDER",
                width_ft=feeder_road_width,
                nominal_start=p_left,
                nominal_end=p_right,
            )
            roads.extend(clipped_feeder)

        return RoadNetwork(roads)

    @classmethod
    def generate_arterial_loop(
        cls,
        land: ParsedLand,
        main_road_width: float = 39.37,   # 12.0m UDCPR
        feeder_road_width: float = 29.53, # 9.0m UDCPR
    ) -> RoadNetwork:
        """
        OPTION 2 — Best Accessibility / Circulation Network.
        - Continuous vehicular flow, eliminating dead-ends and providing superior circulation.
        - Adapts dynamically to the shape of the land by offsetting the authentic polygon boundary.
        - Strictly clipped inside the land polygon with zero outer spill.
        """
        bbox = land.bbox
        land_poly = land.shapely_polygon
        roads: List[RoadSegment] = []

        spine_x = bbox.min_x + bbox.width * 0.5
        entry = land.entry_points[0] if land.entry_points else Point(spine_x, bbox.min_y)

        # 1. Entrance Boulevard from entry boundary to parcel center
        mid_y = bbox.min_y + bbox.height * 0.40
        b_start = Point(entry.x, bbox.min_y - 10.0)
        b_end = Point(entry.x, mid_y)
        b_corridor = cls._create_corridor(b_start, b_end, main_road_width)
        clipped_b = cls._clip_corridor_to_land(
            corridor_pts=b_corridor,
            land_poly=land_poly,
            road_id="road-loop-arterial-01",
            name=f"Central Arterial Boulevard ({main_road_width * 0.3048:.1f}M)",
            road_type="ARTERIAL",
            width_ft=main_road_width,
            nominal_start=b_start,
            nominal_end=b_end,
        )
        roads.extend(clipped_b)

        # 2. Circulation Loop that follows the interior contours of the polygon
        # Buffer inward from the authentic polygon to form an adaptive loop ring
        inset_distance = max(40.0, min(bbox.width, bbox.height) * 0.22)
        inner_buffered = land_poly.buffer(-inset_distance)

        if inner_buffered and not inner_buffered.is_empty:
            # Use inner polygon boundary to create adaptive loop corridors
            inner_ring_poly = inner_buffered if isinstance(inner_buffered, ShapelyPolygon) else max(inner_buffered.geoms, key=lambda g: g.area)
            ring_coords = list(inner_ring_poly.exterior.coords)
            
            for idx in range(len(ring_coords) - 1):
                p1 = Point(ring_coords[idx][0], ring_coords[idx][1])
                p2 = Point(ring_coords[idx + 1][0], ring_coords[idx + 1][1])
                if math.hypot(p2.x - p1.x, p2.y - p1.y) < 20.0:
                    continue
                corridor = cls._create_corridor(p1, p2, feeder_road_width)
                clipped = cls._clip_corridor_to_land(
                    corridor_pts=corridor,
                    land_poly=land_poly,
                    road_id=f"road-loop-seg-{idx+1:02d}",
                    name=f"Circulation Ring Segment {idx+1:02d} ({feeder_road_width * 0.3048:.1f}M)",
                    road_type="FEEDER",
                    width_ft=feeder_road_width,
                    nominal_start=p1,
                    nominal_end=p2,
                )
                roads.extend(clipped)
        else:
            # Fallback for narrow parcels: Dual loop branches
            margin_x = bbox.width * 0.22
            top_y = bbox.max_y - bbox.height * 0.18
            pt_center_top = Point(spine_x, top_y)
            pt_west_mid = Point(bbox.min_x + margin_x, mid_y)
            pt_west_top = Point(bbox.min_x + margin_x, top_y)
            pt_east_mid = Point(bbox.max_x - margin_x, mid_y)
            pt_east_top = Point(bbox.max_x - margin_x, top_y)

            branch_defs = [
                ("w-branch", b_end, pt_west_mid),
                ("w-north", pt_west_mid, pt_west_top),
                ("w-return", pt_west_top, pt_center_top),
                ("e-branch", b_end, pt_east_mid),
                ("e-north", pt_east_mid, pt_east_top),
                ("e-return", pt_east_top, pt_center_top),
            ]
            for bid, p1, p2 in branch_defs:
                c = cls._create_corridor(p1, p2, feeder_road_width)
                clipped = cls._clip_corridor_to_land(
                    corridor_pts=c,
                    land_poly=land_poly,
                    road_id=f"road-loop-{bid}",
                    name=f"Circulation Loop {bid} ({feeder_road_width * 0.3048:.1f}M)",
                    road_type="FEEDER",
                    width_ft=feeder_road_width,
                    nominal_start=p1,
                    nominal_end=p2,
                )
                roads.extend(clipped)

        return RoadNetwork(roads)

    @classmethod
    def generate_central_courtyard(
        cls,
        land: ParsedLand,
        main_road_width: float = 39.37,   # 12.0m UDCPR
        feeder_road_width: float = 29.53, # 9.0m UDCPR
        inset_ft: float = 50.0,
    ) -> RoadNetwork:
        """
        OPTION 3 — Best Overall Development Quality (Central Open Space & Courtyard).
        - Concentric ring road framing the central communal open space and civic amenity zone.
        - High-quality balanced distribution with landscaped avenues.
        - Strictly clipped to the authentic land polygon.
        """
        bbox = land.bbox
        land_poly = land.shapely_polygon
        roads: List[RoadSegment] = []

        entry = land.entry_points[0] if land.entry_points else None
        spine_x = entry.x if entry else (bbox.min_x + bbox.width * 0.5)

        # Locate central courtyard anchor inside the land polygon
        centroid = land_poly.centroid
        cx = centroid.x if land_poly.contains(centroid) else (bbox.min_x + bbox.width * 0.5)
        cy = centroid.y if land_poly.contains(centroid) else (bbox.min_y + bbox.height * 0.5)

        ring_half_w = min(bbox.width * 0.25, 75.0)
        ring_half_h = min(bbox.height * 0.25, 60.0)

        x1 = cx - ring_half_w
        x2 = cx + ring_half_w
        y1 = cy - ring_half_h
        y2 = cy + ring_half_h

        ring_corners = [
            Point(x1, y1),
            Point(x2, y1),
            Point(x2, y2),
            Point(x1, y2),
        ]
        ring_names = ["South Garden Way", "East Promenade", "North Garden Way", "West Promenade"]

        for i in range(4):
            p_start = ring_corners[i]
            p_end = ring_corners[(i + 1) % 4]
            poly = cls._create_corridor(p_start, p_end, feeder_road_width)
            clipped = cls._clip_corridor_to_land(
                corridor_pts=poly,
                land_poly=land_poly,
                road_id=f"road-ring-{i+1:02d}",
                name=f"{ring_names[i]} ({feeder_road_width * 0.3048:.1f}M)",
                road_type="PERIMETER",
                width_ft=feeder_road_width,
                nominal_start=p_start,
                nominal_end=p_end,
            )
            roads.extend(clipped)

        # Grand Entrance Avenue connecting entry to the courtyard
        entry_start = Point(spine_x, bbox.min_y - 10.0)
        entry_end = Point(cx, y1)
        entry_corridor = cls._create_corridor(entry_start, entry_end, main_road_width)
        clipped_entry = cls._clip_corridor_to_land(
            corridor_pts=entry_corridor,
            land_poly=land_poly,
            road_id="road-courtyard-entry",
            name=f"Grand Entrance Avenue ({main_road_width * 0.3048:.1f}M)",
            road_type="MAIN",
            width_ft=main_road_width,
            nominal_start=entry_start,
            nominal_end=entry_end,
        )
        roads.extend(clipped_entry)

        # Lateral wing feeders to reach corners of irregular parcel
        wing_y = cy
        left_feeder = cls._create_corridor(Point(bbox.min_x - 10.0, wing_y), Point(x1, wing_y), feeder_road_width)
        roads.extend(cls._clip_corridor_to_land(
            corridor_pts=left_feeder,
            land_poly=land_poly,
            road_id="road-courtyard-wing-west",
            name=f"West Wing Connector ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            nominal_start=Point(bbox.min_x, wing_y),
            nominal_end=Point(x1, wing_y),
        ))

        right_feeder = cls._create_corridor(Point(x2, wing_y), Point(bbox.max_x + 10.0, wing_y), feeder_road_width)
        roads.extend(cls._clip_corridor_to_land(
            corridor_pts=right_feeder,
            land_poly=land_poly,
            road_id="road-courtyard-wing-east",
            name=f"East Wing Connector ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            nominal_start=Point(x2, wing_y),
            nominal_end=Point(bbox.max_x, wing_y),
        ))

        return RoadNetwork(roads)
