"""
RoadNetworkGenerator — Generates multi-strategy road corridors and network topologies.
Strategies supported:
1. Orthogonal Grid (Grid Layout)
2. Arterial Spine (Spine & Feeder Branches)
3. Perimeter Loop (Ring Road & Central Access)
4. Adaptive Partitioning (Voronoi/Irregular Boundary Adaptive)
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
        road_type: str,  # MAIN | FEEDER | CUL_DE_SAC | PERIMETER
        width_ft: float,
        start: Point,
        end: Point,
        polygon: List[Point],
    ):
        self.road_id = road_id
        self.name = name
        self.road_type = road_type
        self.width_ft = float(width_ft)
        self.start = start
        self.end = end
        self.polygon = polygon

    @property
    def length_ft(self) -> float:
        return math.hypot(self.end.x - self.start.x, self.end.y - self.start.y)

    @property
    def area_sqft(self) -> float:
        if len(self.polygon) >= 3:
            coords = [(p.x, p.y) for p in self.polygon]
            return float(ShapelyPolygon(coords).area)
        return self.length_ft * self.width_ft

    def to_dict(self) -> Dict[str, Any]:
        return {
            "roadId": self.road_id,
            "name": self.name,
            "type": self.road_type,
            "widthFt": round(self.width_ft, 1),
            "lengthFt": round(self.length_ft, 1),
            "areaSqft": round(self.area_sqft, 1),
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
    def shapely_union(self):
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
    """Generates road layouts for different layout design strategies."""

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
        main_road_width: float = 30.0,
        feeder_road_width: float = 24.0,
        block_depth_ft: float = 90.0,
    ) -> RoadNetwork:
        """Strategy 1: Orthogonal Grid Layout."""
        bbox = land.bbox
        roads: List[RoadSegment] = []

        # Central vertical spine road aligned with main entry
        entry = land.entry_points[0] if land.entry_points else None
        spine_x = entry.x if entry else (bbox.min_x + bbox.width * 0.5)

        spine_start = Point(spine_x, bbox.min_y)
        spine_end = Point(spine_x, bbox.max_y)
        spine_poly = cls._create_corridor(spine_start, spine_end, main_road_width)
        roads.append(RoadSegment(
            road_id="road-spine-01",
            name="Main Avenue (30 FT)",
            road_type="MAIN",
            width_ft=main_road_width,
            start=spine_start,
            end=spine_end,
            polygon=spine_poly
        ))

        # Horizontal cross streets
        num_feeders = max(1, int(bbox.height / block_depth_ft) - 1)
        for i in range(1, num_feeders + 1):
            y = bbox.min_y + (i * (bbox.height / (num_feeders + 1)))
            p_left = Point(bbox.min_x, y)
            p_right = Point(bbox.max_x, y)
            f_poly = cls._create_corridor(p_left, p_right, feeder_road_width)
            roads.append(RoadSegment(
                road_id=f"road-feeder-{i:02d}",
                name=f"Cross Street {i} (24 FT)",
                road_type="FEEDER",
                width_ft=feeder_road_width,
                start=p_left,
                end=p_right,
                polygon=f_poly
            ))

        return RoadNetwork(roads)

    @classmethod
    def generate_arterial_spine(
        cls,
        land: ParsedLand,
        main_road_width: float = 36.0,
        feeder_road_width: float = 24.0,
        branch_spacing_ft: float = 100.0,
    ) -> RoadNetwork:
        """Strategy 2: Arterial Spine with Alternating Feeder Branches."""
        bbox = land.bbox
        roads: List[RoadSegment] = []

        spine_x = bbox.min_x + bbox.width * 0.5
        spine_start = Point(spine_x, bbox.min_y)
        spine_end = Point(spine_x, bbox.max_y)
        spine_poly = cls._create_corridor(spine_start, spine_end, main_road_width)
        roads.append(RoadSegment(
            road_id="road-arterial-01",
            name="Central Boulevard (36 FT)",
            road_type="MAIN",
            width_ft=main_road_width,
            start=spine_start,
            end=spine_end,
            polygon=spine_poly
        ))

        # East and West feeder wings
        num_wings = max(1, int(bbox.height / branch_spacing_ft))
        for i in range(1, num_wings + 1):
            y = bbox.min_y + (i * (bbox.height / (num_wings + 1)))
            # West branch
            pw_start = Point(spine_x, y)
            pw_end = Point(bbox.min_x + 20.0, y)
            roads.append(RoadSegment(
                road_id=f"road-wing-w-{i:02d}",
                name=f"West Crescent {i} (24 FT)",
                road_type="FEEDER",
                width_ft=feeder_road_width,
                start=pw_start,
                end=pw_end,
                polygon=cls._create_corridor(pw_start, pw_end, feeder_road_width)
            ))
            # East branch
            pe_start = Point(spine_x, y)
            pe_end = Point(bbox.max_x - 20.0, y)
            roads.append(RoadSegment(
                road_id=f"road-wing-e-{i:02d}",
                name=f"East Crescent {i} (24 FT)",
                road_type="FEEDER",
                width_ft=feeder_road_width,
                start=pe_start,
                end=pe_end,
                polygon=cls._create_corridor(pe_start, pe_end, feeder_road_width)
            ))

        return RoadNetwork(roads)

    @classmethod
    def generate_perimeter_loop(
        cls,
        land: ParsedLand,
        main_road_width: float = 30.0,
        road_width: Optional[float] = None,
        inset_ft: float = 45.0,
    ) -> RoadNetwork:
        """Strategy 3: Perimeter Loop Road preserving central communal green space."""
        actual_width = road_width or main_road_width
        bbox = land.bbox
        roads: List[RoadSegment] = []

        x1 = bbox.min_x + inset_ft
        x2 = bbox.max_x - inset_ft
        y1 = bbox.min_y + inset_ft
        y2 = bbox.max_y - inset_ft

        loop_corners = [
            Point(x1, y1),
            Point(x2, y1),
            Point(x2, y2),
            Point(x1, y2),
        ]

        names = ["South Ring", "East Ring", "North Ring", "West Ring"]
        for i in range(4):
            p_start = loop_corners[i]
            p_end = loop_corners[(i + 1) % 4]
            poly = cls._create_corridor(p_start, p_end, actual_width)
            roads.append(RoadSegment(
                road_id=f"road-ring-{i+1:02d}",
                name=f"{names[i]} ({actual_width:.0f} FT)",
                road_type="PERIMETER",
                width_ft=actual_width,
                start=p_start,
                end=p_end,
                polygon=poly
            ))

        # Entry connector road from outer boundary south edge to ring road
        entry = land.entry_points[0] if land.entry_points else Point((x1 + x2) / 2, bbox.min_y)
        entry_start = Point(entry.x, bbox.min_y)
        entry_end = Point(entry.x, y1)
        roads.append(RoadSegment(
            road_id="road-entry-conn",
            name=f"Grand Entrance Gate Road ({actual_width:.0f} FT)",
            road_type="MAIN",
            width_ft=actual_width,
            start=entry_start,
            end=entry_end,
            polygon=cls._create_corridor(entry_start, entry_end, actual_width)
        ))

        return RoadNetwork(roads)

    @classmethod
    def generate_cluster_courtyard(
        cls,
        land: ParsedLand,
        main_road_width: float = 30.0,
        feeder_road_width: float = 24.0,
    ) -> RoadNetwork:
        """Strategy 4: Cluster Courtyard / Staggered Cul-de-Sac Layout."""
        bbox = land.bbox
        roads: List[RoadSegment] = []

        spine_x = bbox.min_x + bbox.width * 0.5
        spine_start = Point(spine_x, bbox.min_y)
        spine_end = Point(spine_x, bbox.max_y - 25.0)
        spine_poly = cls._create_corridor(spine_start, spine_end, main_road_width)
        roads.append(RoadSegment(
            road_id="road-cluster-spine",
            name="Boulevard Promenade (30 FT)",
            road_type="MAIN",
            width_ft=main_road_width,
            start=spine_start,
            end=spine_end,
            polygon=spine_poly
        ))

        # Staggered court heads (cul-de-sacs)
        num_courts = max(1, int(bbox.height / 120.0))
        for i in range(1, num_courts + 1):
            y = bbox.min_y + (i * (bbox.height / (num_courts + 1)))
            # Stagger left and right courts
            if i % 2 == 1:
                c_start = Point(spine_x, y)
                c_end = Point(bbox.min_x + 30.0, y)
                roads.append(RoadSegment(
                    road_id=f"road-court-w-{i:02d}",
                    name=f"Courtyard West {i} (24 FT)",
                    road_type="CUL_DE_SAC",
                    width_ft=feeder_road_width,
                    start=c_start,
                    end=c_end,
                    polygon=cls._create_corridor(c_start, c_end, feeder_road_width)
                ))
            else:
                c_start = Point(spine_x, y)
                c_end = Point(bbox.max_x - 30.0, y)
                roads.append(RoadSegment(
                    road_id=f"road-court-e-{i:02d}",
                    name=f"Courtyard East {i} (24 FT)",
                    road_type="CUL_DE_SAC",
                    width_ft=feeder_road_width,
                    start=c_start,
                    end=c_end,
                    polygon=cls._create_corridor(c_start, c_end, feeder_road_width)
                ))

        return RoadNetwork(roads)

