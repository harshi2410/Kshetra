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
    def _simplify_plot_polygon(poly: ShapelyPolygon, tolerance: float = 0.5) -> ShapelyPolygon:
        """Simplifies polygon to remove collinear/micro-step vertices while preserving topology."""
        if not poly or poly.is_empty or not poly.is_valid:
            return poly
        try:
            simp = poly.simplify(tolerance, preserve_topology=True)
            if simp.is_valid and not simp.is_empty and simp.area > 20.0:
                coords = [(round(pt[0], 1), round(pt[1], 1)) for pt in simp.exterior.coords]
                if len(coords) >= 4:
                    snap_poly = ShapelyPolygon(coords)
                    if snap_poly.is_valid and snap_poly.area > 20.0:
                        return snap_poly
                return simp
        except Exception:
            pass
        return poly

    @classmethod
    def subdivide(
        cls,
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
            min_block_area_sqft=min_plot_sqft * 0.55
        )

        roads_geom = road_network.shapely_union
        amenity_shapely_list = []
        for a in amenities:
            if hasattr(a, "shapely_polygon"):
                amenity_shapely_list.append(a.shapely_polygon)
            elif isinstance(a, dict):
                pts = a.get("polygon") or a.get("geometry") or []
                coords = [(pt["x"] if isinstance(pt, dict) else pt.x, pt["y"] if isinstance(pt, dict) else pt.y) for pt in pts]
                if len(coords) >= 3:
                    amenity_shapely_list.append(ShapelyPolygon(coords))
            elif hasattr(a, "polygon"):
                pts = a.polygon
                coords = [(pt["x"] if isinstance(pt, dict) else pt.x, pt["y"] if isinstance(pt, dict) else pt.y) for pt in pts]
                if len(coords) >= 3:
                    amenity_shapely_list.append(ShapelyPolygon(coords))
        amenities_geom = unary_union(amenity_shapely_list) if amenity_shapely_list else ShapelyPolygon()

        blocks = buildable_res.blocks
        if not blocks:
            obstacles = unary_union([roads_geom, amenities_geom]) if not roads_geom.is_empty else amenities_geom
            usable_fallback = land_poly.difference(obstacles) if not obstacles.is_empty else land_poly
            if usable_fallback.is_empty:
                return []
            blocks_geoms = [usable_fallback] if isinstance(usable_fallback, ShapelyPolygon) else list(usable_fallback.geoms)
        else:
            blocks_geoms = [b.polygon for b in blocks]

        plots: List[GeneratedPlot] = []
        plot_seq = 1

        # Target dimensions (approx 3:4 to 2:3 aspect ratio)
        target_w = max(min_plot_width_ft, min(max_plot_width_ft, math.sqrt(target_plot_sqft * 0.65)))
        target_d = max(min_plot_depth_ft, target_plot_sqft / target_w)

        for b_idx, block in enumerate(blocks_geoms):
            if block.is_empty or block.area < (min_plot_sqft * 0.55):
                continue

            if not block.is_valid:
                block = block.buffer(0)
            if block.is_empty or block.area < (min_plot_sqft * 0.55):
                continue

            b_minx, b_miny, b_maxx, b_maxy = block.bounds
            block_w = b_maxx - b_minx
            block_h = b_maxy - b_miny

            # Determine row count based on standard plot depths (e.g. 40-50ft single row, 80-100ft double row)
            if block_h <= (target_d * 1.55):
                rows = 1
            else:
                rows = max(1, int(round(block_h / target_d)))

            row_height = block_h / rows

            for r in range(rows):
                r_miny = b_miny + (r * row_height)
                r_maxy = r_miny + row_height
                row_strip_box = shapely_box(b_minx - 10.0, r_miny, b_maxx + 10.0, r_maxy)
                row_geom = block.intersection(row_strip_box)

                if row_geom.is_empty or row_geom.area < (min_plot_sqft * 0.50):
                    continue

                # Handle MultiPolygon row strips
                sub_strips = [row_geom] if isinstance(row_geom, ShapelyPolygon) else list(row_geom.geoms)

                for strip in sub_strips:
                    if strip.is_empty or strip.area < (min_plot_sqft * 0.50):
                        continue
                    if not strip.is_valid:
                        strip = strip.buffer(0)

                    s_minx, s_miny, s_maxx, s_maxy = strip.bounds
                    strip_w = s_maxx - s_minx
                    if strip_w <= 0:
                        continue

                    # Determine column count along strip
                    cols = max(1, int(round(strip_w / target_w)))
                    col_width = strip_w / cols

                    row_raw_plots = []
                    for c in range(cols):
                        c_minx = s_minx + (c * col_width)
                        c_maxx = c_minx + col_width

                        c_box = shapely_box(c_minx, s_miny - 2.0, c_maxx, s_maxy + 2.0)
                        raw_plot = strip.intersection(c_box)

                        if raw_plot.is_empty:
                            continue

                        if isinstance(raw_plot, MultiPolygon):
                            raw_plot = max(raw_plot.geoms, key=lambda p: p.area)

                        if not raw_plot.is_valid:
                            raw_plot = raw_plot.buffer(0)

                        if not raw_plot.is_empty and raw_plot.area > 20.0:
                            raw_plot = cls._simplify_plot_polygon(raw_plot, tolerance=0.4)
                            row_raw_plots.append(raw_plot)

                    # ─── Sliver Merging & Regularization ───
                    merged_row_plots = []
                    for p_geom in row_raw_plots:
                        if not merged_row_plots:
                            merged_row_plots.append(p_geom)
                            continue

                        if p_geom.area < (min_plot_sqft * 0.70):
                            # Merge small residual sliver into previous adjacent plot
                            prev = merged_row_plots[-1]
                            try:
                                combined = prev.union(p_geom)
                                if combined.is_valid and isinstance(combined, ShapelyPolygon):
                                    merged_row_plots[-1] = cls._simplify_plot_polygon(combined, tolerance=0.5)
                                elif isinstance(combined, MultiPolygon):
                                    merged_row_plots[-1] = cls._simplify_plot_polygon(max(combined.geoms, key=lambda g: g.area), tolerance=0.5)
                                else:
                                    merged_row_plots.append(p_geom)
                            except Exception:
                                merged_row_plots.append(p_geom)
                        else:
                            merged_row_plots.append(p_geom)

                    # If the very first plot was too small, merge first into second
                    if len(merged_row_plots) >= 2 and merged_row_plots[0].area < (min_plot_sqft * 0.70):
                        try:
                            combined = merged_row_plots[1].union(merged_row_plots[0])
                            if combined.is_valid and isinstance(combined, ShapelyPolygon):
                                merged_row_plots[1] = cls._simplify_plot_polygon(combined, tolerance=0.5)
                                merged_row_plots.pop(0)
                        except Exception:
                            pass

                    # ─── Construct Final Clean GeneratedPlot Objects ───
                    for c_idx, final_geom in enumerate(merged_row_plots):
                        if final_geom.is_empty or final_geom.area < (min_plot_sqft * 0.50):
                            continue

                        # First simplify polygon geometry to remove jagged micro-steps
                        final_geom = cls._simplify_plot_polygon(final_geom, tolerance=0.4)
                        if not final_geom.is_valid:
                            final_geom = final_geom.buffer(0)

                        # Strict containment inside master land polygon
                        final_geom = final_geom.intersection(land_poly)
                        if final_geom.is_empty or final_geom.area < (min_plot_sqft * 0.50):
                            continue

                        # Exact topological subtraction of roads and amenities (guarantees zero overlap)
                        if not roads_geom.is_empty:
                            final_geom = final_geom.difference(roads_geom)
                        if not amenities_geom.is_empty:
                            final_geom = final_geom.difference(amenities_geom)

                        if isinstance(final_geom, MultiPolygon):
                            final_geom = max(final_geom.geoms, key=lambda g: g.area)

                        if final_geom.is_empty or final_geom.area < (min_plot_sqft * 0.50):
                            continue

                        pb_minx, pb_miny, pb_maxx, pb_maxy = final_geom.bounds
                        p_width = max(1.0, pb_maxx - pb_minx)
                        p_depth = max(1.0, pb_maxy - pb_miny)

                        # Filter out extreme slivers
                        aspect = p_width / p_depth
                        if aspect < 0.10 or aspect > 9.0:
                            continue

                        coords = list(final_geom.exterior.coords)
                        poly_points = [Point(round(pt[0], 2), round(pt[1], 2)) for pt in coords[:-1]]
                        if len(poly_points) < 3:
                            continue

                        # Interior centroid calculation for label positioning
                        c_pt = final_geom.representative_point()
                        cx = c_pt.x
                        cy = c_pt.y

                        facing = "NORTH" if r == 0 else "SOUTH"
                        if rows == 1:
                            facing = "EAST" if cx >= (b_minx + b_maxx) / 2.0 else "WEST"

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

                        is_corner = (c_idx == 0 or c_idx == len(merged_row_plots) - 1) and (r == 0 or r == rows - 1)
                        price = round(final_geom.area * base_rate_per_sqft, 2)

                        plot_obj = GeneratedPlot(
                            plot_id=f"plot-{plot_seq:03d}",
                            plot_number=f"P-{plot_seq:02d}",
                            polygon=poly_points,
                            area_sqft=final_geom.area,
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
