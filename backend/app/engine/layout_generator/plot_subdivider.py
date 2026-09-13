"""
PlotSubdivider — Production Computational Geometry Plot Subdivision Engine (Sections 30, 45, 46).
Strict Invariants:
1. PLOT ∩ LAND_BOUNDARY = PLOT (Zero plot overlap with boundary exterior)
2. PLOT ∩ ROAD = ∅ (Zero road overlap)
3. PLOT ∩ GREEN_SPACE = ∅ (Zero open space overlap)
4. PLOT_i ∩ PLOT_j = ∅ (Zero plot-to-plot overlap)
5. Practical, buildable, edge-aware geometry (Slivers and impossible shapes rejected)
"""

import math
import uuid
import logging
from typing import List, Optional, Dict, Any, Union
from shapely.geometry import (
    Polygon as ShapelyPolygon, MultiPolygon, box as shapely_box,
    Point as ShapelyPoint, LineString
)
from shapely.ops import unary_union
from .land_parser import ParsedLand, Point, BoundingBox
from .road_network_generator import RoadNetwork, RoadSegment
from .amenity_placer import AmenityZone
from app.engine.buildable_area_engine import buildable_area_engine_instance, BuildableAreaResult

logger = logging.getLogger(__name__)

SQFT_TO_SQM = 0.09290304
FT_TO_M = 0.3048


class GeneratedPlot:
    """An individual residential or commercial plot parcel."""
    def __init__(
        self,
        plot_id: str,
        plot_number: str,
        polygon: List[Point],
        area_sqft: float,
        width_ft: float,
        depth_ft: float,
        facing: str = "NORTH",
        road_name: str = "Main Road",
        is_corner: bool = False,
        status: str = "AVAILABLE",
        estimated_price: float = 0.0,
    ):
        self.plot_id = plot_id
        self.plot_number = plot_number
        self.polygon = polygon
        self.area_sqft = float(area_sqft)
        self.area_sqm = float(area_sqft * SQFT_TO_SQM)
        self.width_ft = float(width_ft)
        self.depth_ft = float(depth_ft)
        self.width_m = float(width_ft * FT_TO_M)
        self.depth_m = float(depth_ft * FT_TO_M)
        self.facing = facing
        self.road_name = road_name
        self.is_corner = is_corner
        self.status = status
        self.estimated_price = float(estimated_price)

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
        poly = ShapelyPolygon(coords)
        return poly if poly.is_valid else poly.buffer(0)

    @property
    def dimensions_display(self) -> str:
        return f"{self.width_ft:.0f}×{self.depth_ft:.0f} FT ({self.width_m:.1f}×{self.depth_m:.1f} M)"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plotId": self.plot_id,
            "plotNumber": self.plot_number,
            "polygon": [p.to_dict() for p in self.polygon],
            "areaSqft": round(self.area_sqft, 1),
            "areaSqm": round(self.area_sqm, 1),
            "dimensions": f"{self.width_ft:.0f} × {self.depth_ft:.0f} FT",
            "dimensionsMetric": f"{self.width_m:.1f} × {self.depth_m:.1f} M",
            "dimensionsDisplay": self.dimensions_display,
            "widthFt": round(self.width_ft, 1),
            "depthFt": round(self.depth_ft, 1),
            "widthM": round(self.width_m, 1),
            "depthM": round(self.depth_m, 1),
            "facing": self.facing,
            "roadName": self.road_name,
            "isCorner": self.is_corner,
            "status": self.status,
            "estimatedPrice": round(self.estimated_price, 2),
        }


class PlotSubdivider:
    """Subdivides residual land blocks into clean, road-facing, edge-aware plots."""

    @staticmethod
    def subdivide(
        land: ParsedLand,
        road_network: RoadNetwork,
        amenities: List[AmenityZone],
        target_plot_sqft: float = 1200.0,
        min_plot_sqft: float = 800.0,
        min_plot_width_ft: float = 20.0,
        max_plot_width_ft: float = 45.0,
        min_plot_depth_ft: float = 30.0,
        base_rate_per_sqft: float = 2500.0,
        setback_ft: float = 5.0,
    ) -> List[GeneratedPlot]:
        """
        Subdivides usable space between roads into legal plots.
        Guarantees strict containment inside usable land boundary via BuildableAreaEngine and Shapely.
        Enforces Section 30 (Geometric Clipping) and Section 46 (Edge-Aware Plot Generation).
        """
        road_polys = [r.polygon for r in road_network.roads]
        amenity_polys = [a.polygon for a in amenities]
        land_poly = land.shapely_polygon

        buildable_res: BuildableAreaResult = buildable_area_engine_instance.compute_buildable_area(
            boundary_vertices=land.boundary_polygon,
            setback_ft=setback_ft,
            road_polygons=road_polys,
            green_spaces=amenity_polys,
            min_block_area_sqft=min_plot_sqft * 0.70
        )

        blocks = buildable_res.blocks
        if not blocks:
            roads_geom = road_network.shapely_union
            amenities_geom = unary_union([
                ShapelyPolygon([(p.x, p.y) for p in a.polygon]) for a in amenities if len(a.polygon) >= 3
            ]) if amenities else ShapelyPolygon()
            obstacles = unary_union([roads_geom, amenities_geom]) if not roads_geom.is_empty else amenities_geom
            usable_fallback = land_poly.difference(obstacles) if not obstacles.is_empty else land_poly
            if usable_fallback.is_empty:
                return []
            blocks_geoms = [usable_fallback] if isinstance(usable_fallback, ShapelyPolygon) else list(usable_fallback.geoms)
        else:
            blocks_geoms = [b.polygon for b in blocks]

        plots: List[GeneratedPlot] = []
        plot_seq = 1

        # Standard target dimensions
        target_w = max(min_plot_width_ft, min(max_plot_width_ft, math.sqrt(target_plot_sqft * 0.75)))
        target_d = max(min_plot_depth_ft, target_plot_sqft / target_w)

        for block in blocks_geoms:
            if block.is_empty or block.area < min_plot_sqft * 0.70:
                continue

            min_x, min_y, max_x, max_y = block.bounds
            block_w = max_x - min_x
            block_h = max_y - min_y

            cols = max(1, int(round(block_w / target_w)))
            rows = max(1, int(round(block_h / target_d)))

            step_x = block_w / cols
            step_y = block_h / rows

            for r in range(rows):
                for c in range(cols):
                    px1 = min_x + (c * step_x)
                    py1 = min_y + (r * step_y)
                    px2 = px1 + step_x
                    py2 = py1 + step_y

                    cell_box = shapely_box(px1, py1, px2, py2)
                    # Intersect cell with block (which is already inside land polygon)
                    plot_geom = cell_box.intersection(block)

                    if plot_geom.is_empty or plot_geom.area < (min_plot_sqft * 0.70):
                        continue

                    # Strict clipping to authentic land polygon (Section 30)
                    plot_geom = plot_geom.intersection(land_poly)
                    if plot_geom.is_empty or plot_geom.area < (min_plot_sqft * 0.70):
                        continue

                    # Extract primary polygon
                    poly_to_use = None
                    if isinstance(plot_geom, ShapelyPolygon):
                        poly_to_use = plot_geom
                    elif isinstance(plot_geom, MultiPolygon):
                        poly_to_use = max(plot_geom.geoms, key=lambda p: p.area)

                    if not poly_to_use or poly_to_use.area < (min_plot_sqft * 0.70):
                        continue

                    if not poly_to_use.is_valid:
                        poly_to_use = poly_to_use.buffer(0)

                    pb_minx, pb_miny, pb_maxx, pb_maxy = poly_to_use.bounds
                    p_width = max(1.0, pb_maxx - pb_minx)
                    p_depth = max(1.0, pb_maxy - pb_miny)

                    # Practicality filter (Section 46): reject acute slivers
                    if p_width < (min_plot_width_ft * 0.60) or p_depth < (min_plot_depth_ft * 0.60):
                        continue
                    aspect = p_width / p_depth
                    if aspect < 0.18 or aspect > 5.5:
                        continue

                    coords = list(poly_to_use.exterior.coords)
                    poly_points = [Point(pt[0], pt[1]) for pt in coords[:-1]]
                    if len(poly_points) < 3:
                        continue

                    # Center & Facing logic
                    cx = (pb_minx + pb_maxx) / 2.0
                    cy = (pb_miny + pb_maxy) / 2.0
                    facing = "EAST" if cx >= (min_x + max_x) / 2.0 else "WEST"
                    if r == 0:
                        facing = "SOUTH"
                    elif r == rows - 1:
                        facing = "NORTH"

                    # Find nearest road name
                    nearest_road_name = "Internal Avenue"
                    if road_network.roads:
                        best_dist = float("inf")
                        for rd in road_network.roads:
                            rx = (rd.start.x + rd.end.x) / 2.0
                            ry = (rd.start.y + rd.end.y) / 2.0
                            d = math.hypot(cx - rx, cy - ry)
                            if d < best_dist:
                                best_dist = d
                                nearest_road_name = rd.name

                    is_corner = (c == 0 or c == cols - 1) and (r == 0 or r == rows - 1)
                    price = poly_to_use.area * base_rate_per_sqft

                    plot_obj = GeneratedPlot(
                        plot_id=f"plot-{plot_seq:03d}",
                        plot_number=f"P-{plot_seq:03d}",
                        polygon=poly_points,
                        area_sqft=poly_to_use.area,
                        width_ft=p_width,
                        depth_ft=p_depth,
                        facing=facing,
                        road_name=nearest_road_name,
                        is_corner=is_corner,
                        status="AVAILABLE",
                        estimated_price=price,
                    )
                    plots.append(plot_obj)
                    plot_seq += 1

        return plots
