"""
AmenityPlacer — Places dedicated parks, green open spaces, and clubhouses
strictly within the parcel boundary without overlapping road corridors.
"""

from typing import List, Dict, Any
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box
from shapely.ops import unary_union
from .land_parser import ParsedLand, Point, BoundingBox
from .road_network_generator import RoadNetwork


class AmenityZone:
    def __init__(
        self,
        zone_id: str,
        name: str,
        zone_type: str,  # "GARDEN" | "CLUBHOUSE" | "PARK"
        polygon: List[Point],
        area_sqft: float,
    ):
        self.zone_id = zone_id
        self.name = name
        self.zone_type = zone_type
        self.polygon = polygon
        self.area_sqft = float(area_sqft)

    @property
    def centroid(self) -> Point:
        if not self.polygon:
            return Point(0, 0)
        cx = sum(p.x for p in self.polygon) / len(self.polygon)
        cy = sum(p.y for p in self.polygon) / len(self.polygon)
        return Point(cx, cy)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "zoneId": self.zone_id,
            "name": self.name,
            "type": self.zone_type,
            "areaSqft": round(self.area_sqft, 2),
            "polygon": [p.to_dict() for p in self.polygon],
            "centroid": self.centroid.to_dict(),
        }


class AmenityPlacer:
    """Places open spaces and recreational amenities respecting target garden percentages."""

    @staticmethod
    def place_amenities(
        land: ParsedLand,
        road_network: RoadNetwork,
        garden_percentage: float = 10.0,
        strategy_name: str = "Grid",
    ) -> List[AmenityZone]:
        bbox = land.bbox
        total_area = land.total_area_sqft
        target_amenity_area = total_area * (garden_percentage / 100.0)

        if target_amenity_area <= 0:
            return []

        amenities: List[AmenityZone] = []
        roads_geom = road_network.shapely_union
        land_geom = land.shapely_polygon

        # Calculate a realistic park rectangle size
        side = (target_amenity_area ** 0.5)
        w = round(min(side * 1.2, bbox.width * 0.35), 1)
        h = round(min(target_amenity_area / max(1.0, w), bbox.height * 0.35), 1)

        # Strategy-dependent placement
        if "Perimeter" in strategy_name or "Loop" in strategy_name:
            # Central grand communal park
            cx = (bbox.min_x + bbox.max_x) / 2.0
            cy = (bbox.min_y + bbox.max_y) / 2.0
            min_x, min_y = cx - w / 2.0, cy - h / 2.0
            max_x, max_y = cx + w / 2.0, cy + h / 2.0
            park_name = "Central Grand Park & Clubhouse"
        else:
            # North-East peaceful green garden
            max_x = bbox.max_x - 15.0
            min_x = max_x - w
            max_y = bbox.max_y - 15.0
            min_y = max_y - h
            park_name = "Community Green Park"

        candidate_box = shapely_box(min_x, min_y, max_x, max_y)

        # Subtract roads to ensure zero road overlap
        if not roads_geom.is_empty:
            usable_park = candidate_box.difference(roads_geom)
            usable_park = usable_park.intersection(land_geom)
        else:
            usable_park = candidate_box.intersection(land_geom)

        if not usable_park.is_empty and usable_park.area > 100.0:
            if usable_park.geom_type == "Polygon":
                coords = list(usable_park.exterior.coords)
                points = [Point(c[0], c[1]) for c in coords[:-1]]
                amenities.append(AmenityZone(
                    zone_id="amenity-zone-01",
                    name=park_name,
                    zone_type="PARK",
                    polygon=points,
                    area_sqft=usable_park.area
                ))
            elif usable_park.geom_type == "MultiPolygon":
                # Take largest piece
                largest = max(usable_park.geoms, key=lambda p: p.area)
                coords = list(largest.exterior.coords)
                points = [Point(c[0], c[1]) for c in coords[:-1]]
                amenities.append(AmenityZone(
                    zone_id="amenity-zone-01",
                    name=park_name,
                    zone_type="PARK",
                    polygon=points,
                    area_sqft=largest.area
                ))

        return amenities
