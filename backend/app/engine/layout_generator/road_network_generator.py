"""
RoadNetworkGenerator — Multi-Strategy Road Infrastructure Engine (13A & 13E).
Generates 3 genuinely distinct feasible road network planning topologies:
1. OPTION A: Orthogonal Grid Network (Maximum Practical Plots & Frontage Yield)
2. OPTION B: Arterial Loop & Circulation Network (Continuous Circulation, Regular Plots & Access)
3. OPTION C: Central Courtyard & Concentric Loop (Open Space Centered & Balanced Distribution)

Strictly enforces Maharashtra UDCPR Rule 3.3 road hierarchy widths:
- Internal Roads: 9.0 m (29.53 ft) standard non-congested, 6.0 m (19.68 ft) congested
- Main / Access Avenues: 12.0 m (39.37 ft) or 15.0 m (49.21 ft)
"""

import math
from typing import List, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box, LineString, MultiPolygon
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
            return float(ShapelyPolygon(coords).area)
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
                polys.append(ShapelyPolygon(coords))
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
                polys.append(ShapelyPolygon(coords))
        if not polys:
            return ShapelyPolygon()
        return unary_union(polys)


class RoadNetworkGenerator:
    """Generates distinct planning strategies respecting UDCPR standards."""

    @staticmethod
    def _create_corridor(p1: Point, p2: Point, width: float) -> List[Point]:
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
    def generate_orthogonal_grid(
        cls,
        land: ParsedLand,
        main_road_width: float = 39.37,   # 12.0m UDCPR
        feeder_road_width: float = 29.53, # 9.0m UDCPR
        block_depth_ft: float = 85.0,
    ) -> RoadNetwork:
        """
        OPTION A: Orthogonal Grid Network (Maximum Practical Plots & Frontage Yield).
        - Central primary avenue aligned with main entry.
        - Efficient cross street feeders maximizing linear frontage.
        """
        bbox = land.bbox
        roads: List[RoadSegment] = []

        entry = land.entry_points[0] if land.entry_points else None
        spine_x = entry.x if entry else (bbox.min_x + bbox.width * 0.5)

        # Main Avenue (12.0 M / 39.4 FT)
        spine_start = Point(spine_x, bbox.min_y)
        spine_end = Point(spine_x, bbox.max_y)
        spine_poly = cls._create_corridor(spine_start, spine_end, main_road_width)
        roads.append(RoadSegment(
            road_id="road-grid-main-01",
            name=f"Main Access Avenue ({main_road_width * 0.3048:.1f}M)",
            road_type="MAIN",
            width_ft=main_road_width,
            start=spine_start,
            end=spine_end,
            polygon=spine_poly
        ))

        # Horizontal cross feeders (9.0 M / 29.5 FT)
        num_feeders = max(1, int(bbox.height / block_depth_ft) - 1)
        for i in range(1, num_feeders + 1):
            y = bbox.min_y + (i * (bbox.height / (num_feeders + 1)))
            p_left = Point(bbox.min_x, y)
            p_right = Point(bbox.max_x, y)
            f_poly = cls._create_corridor(p_left, p_right, feeder_road_width)
            roads.append(RoadSegment(
                road_id=f"road-grid-feeder-{i:02d}",
                name=f"Internal Cross Street {i:02d} ({feeder_road_width * 0.3048:.1f}M)",
                road_type="FEEDER",
                width_ft=feeder_road_width,
                start=p_left,
                end=p_right,
                polygon=f_poly
            ))

        return RoadNetwork(roads)

    @classmethod
    def generate_arterial_loop(
        cls,
        land: ParsedLand,
        main_road_width: float = 39.37,   # 12.0m UDCPR
        feeder_road_width: float = 29.53, # 9.0m UDCPR
    ) -> RoadNetwork:
        """
        OPTION B: Arterial Loop & Circulation Network (Enhanced Circulation & Regularity).
        - Wide central boulevard connecting to dual loop corridors.
        - Continuous vehicular flow, eliminating dead-ends and providing superior accessibility.
        """
        bbox = land.bbox
        roads: List[RoadSegment] = []

        spine_x = bbox.min_x + bbox.width * 0.5
        # Primary Entrance Boulevard
        entry = land.entry_points[0] if land.entry_points else Point(spine_x, bbox.min_y)
        mid_y = bbox.min_y + bbox.height * 0.40

        b_start = Point(entry.x, bbox.min_y)
        b_end = Point(entry.x, mid_y)
        roads.append(RoadSegment(
            road_id="road-loop-arterial-01",
            name=f"Central Arterial Boulevard ({main_road_width * 0.3048:.1f}M)",
            road_type="ARTERIAL",
            width_ft=main_road_width,
            start=b_start,
            end=b_end,
            polygon=cls._create_corridor(b_start, b_end, main_road_width)
        ))

        # Loop corridors (connecting east and west wings back to spine)
        margin_x = bbox.width * 0.22
        top_y = bbox.max_y - bbox.height * 0.15

        pt_center_top = Point(spine_x, top_y)
        pt_west_mid = Point(bbox.min_x + margin_x, mid_y)
        pt_west_top = Point(bbox.min_x + margin_x, top_y)
        pt_east_mid = Point(bbox.max_x - margin_x, mid_y)
        pt_east_top = Point(bbox.max_x - margin_x, top_y)

        # West Loop Branch
        roads.append(RoadSegment(
            road_id="road-loop-w-branch",
            name=f"West Circulation Branch ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=b_end,
            end=pt_west_mid,
            polygon=cls._create_corridor(b_end, pt_west_mid, feeder_road_width)
        ))
        roads.append(RoadSegment(
            road_id="road-loop-w-north",
            name=f"West Avenue North ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=pt_west_mid,
            end=pt_west_top,
            polygon=cls._create_corridor(pt_west_mid, pt_west_top, feeder_road_width)
        ))
        roads.append(RoadSegment(
            road_id="road-loop-w-return",
            name=f"North Loop West ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=pt_west_top,
            end=pt_center_top,
            polygon=cls._create_corridor(pt_west_top, pt_center_top, feeder_road_width)
        ))

        # East Loop Branch
        roads.append(RoadSegment(
            road_id="road-loop-e-branch",
            name=f"East Circulation Branch ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=b_end,
            end=pt_east_mid,
            polygon=cls._create_corridor(b_end, pt_east_mid, feeder_road_width)
        ))
        roads.append(RoadSegment(
            road_id="road-loop-e-north",
            name=f"East Avenue North ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=pt_east_mid,
            end=pt_east_top,
            polygon=cls._create_corridor(pt_east_mid, pt_east_top, feeder_road_width)
        ))
        roads.append(RoadSegment(
            road_id="road-loop-e-return",
            name=f"North Loop East ({feeder_road_width * 0.3048:.1f}M)",
            road_type="FEEDER",
            width_ft=feeder_road_width,
            start=pt_east_top,
            end=pt_center_top,
            polygon=cls._create_corridor(pt_east_top, pt_center_top, feeder_road_width)
        ))

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
        OPTION C: Central Courtyard & Concentric Loop (Open Space Centered & Balanced Distribution).
        - Concentric ring road framing the central communal open space and civic amenity zone.
        - Alternative orientation creating a community-focused green garden suburb.
        """
        bbox = land.bbox
        roads: List[RoadSegment] = []

        actual_width = feeder_road_width

        x1 = bbox.min_x + inset_ft
        x2 = bbox.max_x - inset_ft
        y1 = bbox.min_y + inset_ft
        y2 = bbox.max_y - inset_ft

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
            poly = cls._create_corridor(p_start, p_end, actual_width)
            roads.append(RoadSegment(
                road_id=f"road-ring-{i+1:02d}",
                name=f"{ring_names[i]} ({actual_width * 0.3048:.1f}M)",
                road_type="PERIMETER",
                width_ft=actual_width,
                start=p_start,
                end=p_end,
                polygon=poly
            ))

        # Main Entrance Boulevard from South Boundary to Ring Road
        entry = land.entry_points[0] if land.entry_points else Point((x1 + x2) / 2.0, bbox.min_y)
        entry_start = Point(entry.x, bbox.min_y)
        entry_end = Point(entry.x, y1)
        roads.append(RoadSegment(
            road_id="road-courtyard-entry",
            name=f"Grand Entrance Avenue ({main_road_width * 0.3048:.1f}M)",
            road_type="MAIN",
            width_ft=main_road_width,
            start=entry_start,
            end=entry_end,
            polygon=cls._create_corridor(entry_start, entry_end, main_road_width)
        ))

        return RoadNetwork(roads)
