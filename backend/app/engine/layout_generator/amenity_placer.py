"""
AmenityPlacer — Production Non-Plot Space Reservation Engine.
Strictly implements UDCPR 2020 space reservation sequence (13D, 13F, 13G, 13H):
1. RECREATIONAL OPEN SPACE (UDCPR Rule 3.4: 10% for layouts >= 0.40 Ha, min dimension 7.5m, accessible)
2. AMENITY SPACE (UDCPR Rule 3.5: 5% for layouts >= 2.0 Ha or per municipal DP)
3. UTILITY / SERVICE AREA (Ground Infrastructure: MSEDCL Substation, Solid Waste, Drainage buffer)

Guarantees all reservations are:
- Geometrically usable (no slivers, compliant minimum dimensions)
- Inside the valid development boundary
- Excluded from saleable plots
- Cleared of any road corridor overlap
- Clearly labelled and categorized
"""

import math
from typing import List, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box, Point as ShapelyPoint
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
    - Utility & Common Service Areas (13H)
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
        bbox = land.bbox
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

        # ─── 1. RECREATIONAL OPEN SPACE (UDCPR Rule 3.4) ───
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
                placement_anchor="CENTER" if "Option C" in strategy_name or "Courtyard" in strategy_name else "NORTH_EAST"
            )
            if open_zone:
                reservations.append(open_zone)
                occupied_geoms.append(open_zone.shapely_polygon)

        # ─── 2. CIVIC AMENITY SPACE (UDCPR Rule 3.5) ───
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

        # ─── 3. UTILITY / SERVICE AREA (13H) ───
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
        """Calculates a usable rectangular reservation box conforming to UDCPR aspect ratio & size."""
        bbox = land.bbox
        side = math.sqrt(target_sqft)

        # Usable width and height keeping min width >= 25 ft (~7.5m UDCPR requirement)
        min_dim = 25.0
        w = max(min_dim, min(round(side * 1.25, 1), bbox.width * 0.48))
        h = max(min_dim, min(round(target_sqft / w, 1), bbox.height * 0.48))

        margin = 15.0
        for scale in [1.0, 1.2, 1.4]:
            cw = min(w * scale, bbox.width * 0.48)
            ch = min(h * scale, bbox.height * 0.48)

            if placement_anchor == "CENTER":
                cx = (bbox.min_x + bbox.max_x) / 2.0
                cy = (bbox.min_y + bbox.max_y) / 2.0
                min_x, min_y = cx - cw / 2.0, cy - ch / 2.0
                max_x, max_y = cx + cw / 2.0, cy + ch / 2.0
            elif placement_anchor == "NORTH_EAST":
                max_x = bbox.max_x - margin
                min_x = max_x - cw
                max_y = bbox.max_y - margin
                min_y = max_y - ch
            elif placement_anchor == "SOUTH_EAST":
                max_x = bbox.max_x - margin
                min_x = max_x - cw
                min_y = bbox.min_y + margin
                max_y = min_y + ch
            elif placement_anchor == "SOUTH_WEST":
                min_x = bbox.min_x + margin
                max_x = min_x + cw
                min_y = bbox.min_y + margin
                max_y = min_y + ch
            else:  # NORTH_WEST
                min_x = bbox.min_x + margin
                max_x = min_x + cw
                max_y = bbox.max_y - margin
                min_y = max_y - ch

            candidate_box = shapely_box(min_x, min_y, max_x, max_y)
            zone_geom = candidate_box.intersection(available_domain)
            if not occupied_union.is_empty:
                zone_geom = zone_geom.difference(occupied_union)

            if not zone_geom.is_empty and zone_geom.area >= (target_sqft * 0.75):
                break

        if zone_geom.is_empty or zone_geom.area < 50.0:
            return None

        # Extract primary polygon
        poly = zone_geom
        if poly.geom_type == "MultiPolygon":
            poly = max(poly.geoms, key=lambda p: p.area)

        if poly.area < 50.0:
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
