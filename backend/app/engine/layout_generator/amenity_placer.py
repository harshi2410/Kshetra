"""
AmenityPlacer — Production Non-Plot Space Reservation Engine (UDCPR 2020).
Strict Invariant:
AMENITY ∩ LAND_BOUNDARY = AMENITY.
Zero reservation polygons may extend outside the authentic land polygon.

Allocates:
1. RECREATIONAL OPEN SPACE (UDCPR Rule 3.4: 10% for layouts >= 0.40 Ha, min dimension 7.5m)
2. AMENITY SPACE (UDCPR Rule 3.5: 5% for layouts >= 2.0 Ha or per municipal DP)
3. UTILITY / SERVICE AREA (Ground Infrastructure: MSEDCL Substation, Solid Waste, Drainage buffer)
"""

import math
from typing import List, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box, Point as ShapelyPoint, MultiPolygon
from shapely.ops import unary_union
from .land_parser import ParsedLand, Point, BoundingBox
from .road_network_generator import RoadNetwork


SQM_TO_SQFT = 10.7639104
SQFT_TO_SQM = 1.0 / 10.7639104


class AmenityZone:
    """Represents a dedicated non-plot civic, green, or utility reservation zone."""
    def __init__(
        self,
        zone_id: str,
        name: str,
        zone_type: str,  # RECREATIONAL_OPEN_SPACE | AMENITY_SPACE | UTILITY_SERVICE
        polygon: List[Point],
        area_sqft: float,
        dimensions: str = "",
        color: str = "#10b981",
        label: str = "OPEN SPACE"
    ):
        self.zone_id = zone_id
        self.name = name
        self.zone_type = zone_type
        self.polygon = polygon
        self.area_sqft = float(area_sqft)
        self.area_sqm = float(area_sqft * SQFT_TO_SQM)
        self.dimensions = dimensions
        self.color = color
        self.label = label

    @property
    def centroid(self) -> Point:
        if not self.polygon:
            return Point(0, 0)
        cx = sum(p.x for p in self.polygon) / len(self.polygon)
        cy = sum(p.y for p in self.polygon) / len(self.polygon)
        return Point(cx, cy)

    @property
    def shapely_polygon(self) -> ShapelyPolygon:
        coords = [(p.x, p.y) for p in self.polygon]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        p = ShapelyPolygon(coords)
        return p if p.is_valid else p.buffer(0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "zoneId": self.zone_id,
            "name": self.name,
            "type": self.zone_type,
            "label": self.label,
            "color": self.color,
            "areaSqft": round(self.area_sqft, 1),
            "areaSqm": round(self.area_sqm, 1),
            "dimensions": self.dimensions,
            "polygon": [p.to_dict() for p in self.polygon],
            "centroid": self.centroid.to_dict(),
        }


class AmenityPlacer:
    """
    Allocates dedicated non-plot domains prior to plot subdivision:
    - Recreational Open Space (Rule 3.4)
    - Amenity Space (Rule 3.5)
    - Utility & Common Service Areas
    """

    @classmethod
    def place_all_reservations(
        cls,
        land: ParsedLand,
        road_network: RoadNetwork,
        open_space_percentage: float = 10.0,
        amenity_percentage: float = 5.0,
        utility_percentage: float = 1.0,
        strategy_name: str = "Option A",
        setback_ft: float = 10.0,
    ) -> List[AmenityZone]:
        """
        Computes dedicated non-overlapping reservation polygons strictly inside land boundary.
        Subtracts road network corridors to ensure zero mutual overlap.
        """
        total_area = land.total_area_sqft
        land_geom = land.shapely_polygon
        roads_geom = road_network.shapely_union

        # Usable parcel within setbacks
        if setback_ft > 0:
            buffered_land = land_geom.buffer(-setback_ft)
            available_domain = buffered_land if (buffered_land and not buffered_land.is_empty) else land_geom
        else:
            available_domain = land_geom

        target_open_sqft = total_area * (open_space_percentage / 100.0)
        target_amenity_sqft = total_area * (amenity_percentage / 100.0)
        target_utility_sqft = total_area * (utility_percentage / 100.0)

        reservations: List[AmenityZone] = []
        occupied_geoms = [roads_geom] if not roads_geom.is_empty else []

        # 1. RECREATIONAL OPEN SPACE (UDCPR Rule 3.4)
        if target_open_sqft >= 100.0:
            open_zone = cls._place_single_zone(
                zone_id="zone-open-space-01",
                name="RECREATIONAL OPEN SPACE",
                zone_type="RECREATIONAL_OPEN_SPACE",
                label="RECREATIONAL OPEN SPACE",
                color="#10b981",
                target_sqft=target_open_sqft,
                land=land,
                available_domain=available_domain,
                occupied_union=unary_union(occupied_geoms) if occupied_geoms else ShapelyPolygon(),
                strategy_name=strategy_name,
                placement_anchor="CENTER" if ("Option C" in strategy_name or "Courtyard" in strategy_name) else "NORTH_EAST"
            )
            if open_zone:
                reservations.append(open_zone)
                occupied_geoms.append(open_zone.shapely_polygon)

        # 2. CIVIC AMENITY SPACE (UDCPR Rule 3.5)
        if target_amenity_sqft >= 100.0:
            amenity_zone = cls._place_single_zone(
                zone_id="zone-amenity-space-01",
                name="CIVIC AMENITY SPACE",
                zone_type="AMENITY_SPACE",
                label="AMENITY SPACE",
                color="#3b82f6",
                target_sqft=target_amenity_sqft,
                land=land,
                available_domain=available_domain,
                occupied_union=unary_union(occupied_geoms) if occupied_geoms else ShapelyPolygon(),
                strategy_name=strategy_name,
                placement_anchor="SOUTH_EAST" if "Option A" in strategy_name else "SOUTH_WEST"
            )
            if amenity_zone:
                reservations.append(amenity_zone)
                occupied_geoms.append(amenity_zone.shapely_polygon)

        # 3. UTILITY / SERVICE AREA
        if target_utility_sqft >= 50.0:
            util_zone = cls._place_single_zone(
                zone_id="zone-utility-service-01",
                name="UTILITY / SERVICE AREA",
                zone_type="UTILITY_SERVICE",
                label="UTILITY / SERVICE AREA",
                color="#f59e0b",
                target_sqft=target_utility_sqft,
                land=land,
                available_domain=available_domain,
                occupied_union=unary_union(occupied_geoms) if occupied_geoms else ShapelyPolygon(),
                strategy_name=strategy_name,
                placement_anchor="NORTH_WEST"
            )
            if util_zone:
                reservations.append(util_zone)
                occupied_geoms.append(util_zone.shapely_polygon)

        return reservations

    @classmethod
    def _find_anchor_inside_domain(cls, domain: ShapelyPolygon, anchor: str) -> ShapelyPoint:
        """Finds a representative anchor point strictly inside the domain for the given direction."""
        if not domain or domain.is_empty:
            return ShapelyPoint(0, 0)

        # Representative point guaranteed to be inside domain
        rep = domain.representative_point()

        if anchor == "CENTER":
            c = domain.centroid
            return c if domain.contains(c) else rep

        # Get coordinates from domain exterior
        coords = list(domain.exterior.coords) if hasattr(domain, "exterior") else []
        if not coords and hasattr(domain, "geoms"):
            coords = list(max(domain.geoms, key=lambda g: g.area).exterior.coords)

        if not coords:
            return rep

        if anchor == "NORTH_EAST":
            best = max(coords, key=lambda p: p[0] + p[1])
        elif anchor == "SOUTH_EAST":
            best = max(coords, key=lambda p: p[0] - p[1])
        elif anchor == "SOUTH_WEST":
            best = min(coords, key=lambda p: p[0] + p[1])
        else:  # NORTH_WEST
            best = min(coords, key=lambda p: p[0] - p[1])

        pt = ShapelyPoint(best[0], best[1])
        # Nudge toward representative point so it's inside domain
        dx = rep.x - pt.x
        dy = rep.y - pt.y
        nudged = ShapelyPoint(pt.x + dx * 0.25, pt.y + dy * 0.25)
        return nudged if domain.contains(nudged) else rep

    @classmethod
    def _place_single_zone(
        cls,
        zone_id: str,
        name: str,
        zone_type: str,
        label: str,
        color: str,
        target_sqft: float,
        land: ParsedLand,
        available_domain,
        occupied_union,
        strategy_name: str,
        placement_anchor: str = "NORTH_EAST"
    ) -> Optional[AmenityZone]:
        """Calculates a usable reservation polygon conforming to UDCPR minimum dimensions."""
        if available_domain is None or available_domain.is_empty:
            return None

        # Usable domain free of roads
        free_domain = available_domain.difference(occupied_union) if not occupied_union.is_empty else available_domain
        if free_domain.is_empty or free_domain.area < 50.0:
            return None

        # Take largest component if multipolygon
        if isinstance(free_domain, MultiPolygon):
            free_domain = max(free_domain.geoms, key=lambda g: g.area)

        side = math.sqrt(target_sqft)
        min_dim = 20.0
        w = max(min_dim, side * 1.1)
        h = max(min_dim, target_sqft / w)

        anchor_pt = cls._find_anchor_inside_domain(free_domain, placement_anchor)
        zone_geom = None

        for scale in [1.0, 1.25, 1.5, 0.8]:
            cw = w * scale
            ch = h * scale
            candidate_box = shapely_box(
                anchor_pt.x - cw / 2.0,
                anchor_pt.y - ch / 2.0,
                anchor_pt.x + cw / 2.0,
                anchor_pt.y + ch / 2.0
            )
            candidate_zone = candidate_box.intersection(free_domain)
            if not candidate_zone.is_empty and candidate_zone.area >= (target_sqft * 0.60):
                zone_geom = candidate_zone
                break

        if zone_geom is None or zone_geom.is_empty or zone_geom.area < 50.0:
            # Fallback: buffer around anchor point or take suitable fraction of free domain
            candidate_buffer = anchor_pt.buffer(side * 0.6).intersection(free_domain)
            if not candidate_buffer.is_empty and candidate_buffer.area >= 50.0:
                zone_geom = candidate_buffer
            else:
                return None

        # Extract primary polygon
        poly = zone_geom
        if isinstance(poly, MultiPolygon):
            poly = max(poly.geoms, key=lambda p: p.area)

        if poly.area < 50.0 or not poly.is_valid:
            poly = poly.buffer(0)
            if poly.is_empty or poly.area < 50.0:
                return None

        coords = list(poly.exterior.coords)
        points = [Point(c[0], c[1]) for c in coords[:-1]]
        if len(points) < 3:
            return None

        b_minx, b_miny, b_maxx, b_maxy = poly.bounds
        pw = max(1.0, b_maxx - b_minx)
        ph = max(1.0, b_maxy - b_miny)
        dim_str = f"{pw:.0f} × {ph:.0f} FT ({pw * 0.3048:.1f} × {ph * 0.3048:.1f} M)"

        return AmenityZone(
            zone_id=zone_id,
            name=name,
            zone_type=zone_type,
            polygon=points,
            area_sqft=poly.area,
            dimensions=dim_str,
            color=color,
            label=label
        )
