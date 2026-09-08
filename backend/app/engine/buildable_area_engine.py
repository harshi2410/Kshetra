"""
Buildable Area Engine (Phase 8).
Computes the exact usable land domain using GEOS computational geometry (Shapely):
Buildable Area = Land Boundary - (Setbacks ∪ Roads ∪ Green Spaces ∪ Water/Obstacles)

Decomposes the buildable region into individual polygon blocks suitable for layout subdivision,
and verifies strict geometric invariants (no overlap with constraints, valid GEOS topology).
"""

import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from shapely.geometry import (
    Polygon as ShapelyPolygon,
    MultiPolygon as ShapelyMultiPolygon,
    Point as ShapelyPoint,
    LineString as ShapelyLineString,
    box as shapely_box
)
from shapely.ops import unary_union
from shapely.validation import explain_validity

logger = logging.getLogger(__name__)


class BuildableBlock:
    """Represents a discrete contiguous polygon block of buildable land."""

    def __init__(self, block_id: str, polygon: ShapelyPolygon, block_index: int = 0):
        self.block_id = block_id
        self.polygon = polygon
        self.block_index = block_index

    @property
    def area_sqft(self) -> float:
        return float(self.polygon.area)

    @property
    def perimeter_ft(self) -> float:
        return float(self.polygon.length)

    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        return self.polygon.bounds

    @property
    def centroid(self) -> Tuple[float, float]:
        c = self.polygon.centroid
        return (float(c.x), float(c.y))

    @property
    def vertices(self) -> List[List[float]]:
        if self.polygon.is_empty:
            return []
        coords = list(self.polygon.exterior.coords)
        return [[round(pt[0], 2), round(pt[1], 2)] for pt in coords]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "blockId": self.block_id,
            "blockIndex": self.block_index,
            "areaSqft": round(self.area_sqft, 2),
            "perimeterFt": round(self.perimeter_ft, 2),
            "centroid": [round(self.centroid[0], 2), round(self.centroid[1], 2)],
            "boundingBox": [round(c, 2) for c in self.bounds],
            "vertices": self.vertices,
        }


class BuildableAreaResult:
    """Encapsulates the computed buildable area geometry, blocks, and area statistics."""

    def __init__(
        self,
        gross_boundary_polygon: ShapelyPolygon,
        buildable_geometry: Union[ShapelyPolygon, ShapelyMultiPolygon],
        blocks: List[BuildableBlock],
        setback_ft: float,
        road_corridors_geometry: Optional[Union[ShapelyPolygon, ShapelyMultiPolygon]] = None,
        green_spaces_geometry: Optional[Union[ShapelyPolygon, ShapelyMultiPolygon]] = None,
        obstacles_geometry: Optional[Union[ShapelyPolygon, ShapelyMultiPolygon]] = None,
    ):
        self.gross_boundary_polygon = gross_boundary_polygon
        self.buildable_geometry = buildable_geometry
        self.blocks = blocks
        self.setback_ft = setback_ft
        self.road_corridors_geometry = road_corridors_geometry
        self.green_spaces_geometry = green_spaces_geometry
        self.obstacles_geometry = obstacles_geometry

    @property
    def gross_area_sqft(self) -> float:
        return float(self.gross_boundary_polygon.area) if self.gross_boundary_polygon else 0.0

    @property
    def net_buildable_area_sqft(self) -> float:
        return float(self.buildable_geometry.area) if (self.buildable_geometry and not self.buildable_geometry.is_empty) else 0.0

    @property
    def road_area_sqft(self) -> float:
        return float(self.road_corridors_geometry.area) if (self.road_corridors_geometry and not self.road_corridors_geometry.is_empty) else 0.0

    @property
    def green_space_area_sqft(self) -> float:
        return float(self.green_spaces_geometry.area) if (self.green_spaces_geometry and not self.green_spaces_geometry.is_empty) else 0.0

    @property
    def obstacle_area_sqft(self) -> float:
        return float(self.obstacles_geometry.area) if (self.obstacles_geometry and not self.obstacles_geometry.is_empty) else 0.0

    @property
    def setback_area_sqft(self) -> float:
        gross = self.gross_area_sqft
        if gross <= 0 or self.setback_ft <= 0:
            return 0.0
        try:
            buffered_inside = self.gross_boundary_polygon.buffer(-self.setback_ft)
            inside_area = buffered_inside.area if (buffered_inside and not buffered_inside.is_empty) else 0.0
            return max(0.0, gross - inside_area)
        except Exception:
            return 0.0

    @property
    def buildable_percentage(self) -> float:
        gross = self.gross_area_sqft
        return round((self.net_buildable_area_sqft / gross) * 100.0, 2) if gross > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "artifactType": "BUILDABLE_AREA",
            "grossLandAreaSqft": round(self.gross_area_sqft, 2),
            "netBuildableAreaSqft": round(self.net_buildable_area_sqft, 2),
            "buildablePercentage": self.buildable_percentage,
            "setbackFt": self.setback_ft,
            "setbackAreaSqft": round(self.setback_area_sqft, 2),
            "roadAreaSqft": round(self.road_area_sqft, 2),
            "greenSpaceAreaSqft": round(self.green_space_area_sqft, 2),
            "obstacleAreaSqft": round(self.obstacle_area_sqft, 2),
            "totalBlocksCount": len(self.blocks),
            "blocks": [b.to_dict() for b in self.blocks],
            "isValidGeometry": bool(self.buildable_geometry and self.buildable_geometry.is_valid and not self.buildable_geometry.is_empty),
            "geoJson": self.to_geojson(),
        }

    def to_geojson(self) -> Dict[str, Any]:
        """Generates standard GeoJSON FeatureCollection of buildable blocks and exclusion zones."""
        features = []

        # Gross Boundary
        if self.gross_boundary_polygon and not self.gross_boundary_polygon.is_empty:
            features.append({
                "type": "Feature",
                "id": "gross-boundary",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [list(self.gross_boundary_polygon.exterior.coords)]
                },
                "properties": {
                    "entityType": "GROSS_BOUNDARY",
                    "areaSqft": round(self.gross_area_sqft, 2),
                    "stroke": "#3b82f6"
                }
            })

        # Buildable Blocks
        for block in self.blocks:
            coords = [list(block.polygon.exterior.coords)]
            for interior in block.polygon.interiors:
                coords.append(list(interior.coords))
            features.append({
                "type": "Feature",
                "id": block.block_id,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coords
                },
                "properties": {
                    "entityType": "BUILDABLE_BLOCK",
                    "blockIndex": block.block_index,
                    "areaSqft": round(block.area_sqft, 2),
                    "fill": "rgba(16, 185, 129, 0.2)",
                    "stroke": "#10b981"
                }
            })

        # Road Corridors
        if self.road_corridors_geometry and not self.road_corridors_geometry.is_empty:
            road_polys = [self.road_corridors_geometry] if isinstance(self.road_corridors_geometry, ShapelyPolygon) else list(self.road_corridors_geometry.geoms)
            for idx, rp in enumerate(road_polys):
                features.append({
                    "type": "Feature",
                    "id": f"road-corridor-{idx+1}",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [list(rp.exterior.coords)]
                    },
                    "properties": {
                        "entityType": "ROAD_CORRIDOR",
                        "areaSqft": round(rp.area, 2),
                        "fill": "rgba(51, 65, 85, 0.8)",
                        "stroke": "#64748b"
                    }
                })

        # Green Spaces
        if self.green_spaces_geometry and not self.green_spaces_geometry.is_empty:
            green_polys = [self.green_spaces_geometry] if isinstance(self.green_spaces_geometry, ShapelyPolygon) else list(self.green_spaces_geometry.geoms)
            for idx, gp in enumerate(green_polys):
                features.append({
                    "type": "Feature",
                    "id": f"green-space-{idx+1}",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [list(gp.exterior.coords)]
                    },
                    "properties": {
                        "entityType": "GREEN_SPACE",
                        "areaSqft": round(gp.area, 2),
                        "fill": "rgba(16, 185, 129, 0.4)",
                        "stroke": "#059669"
                    }
                })

        return {
            "type": "FeatureCollection",
            "features": features
        }


class BuildableAreaEngine:
    """
    Buildable Area Calculation Engine Singleton.
    Computes exact topological subtraction:
    Buildable Area = Boundary - Setback - Roads - Green Spaces - Obstacles
    """

    @staticmethod
    def _to_shapely_polygon(verts: Union[List[List[float]], List[Dict[str, float]], ShapelyPolygon]) -> Optional[ShapelyPolygon]:
        """Converts heterogeneous vertex representations to a valid Shapely Polygon."""
        if isinstance(verts, ShapelyPolygon):
            poly = verts
        elif isinstance(verts, list):
            if len(verts) < 3:
                return None
            coords = []
            for v in verts:
                if hasattr(v, "x") and hasattr(v, "y"):
                    coords.append((float(v.x), float(v.y)))
                elif isinstance(v, (list, tuple)) and len(v) >= 2:
                    coords.append((float(v[0]), float(v[1])))
                elif isinstance(v, dict) and "x" in v and "y" in v:
                    coords.append((float(v["x"]), float(v["y"])))
            if len(coords) < 3:
                return None
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            poly = ShapelyPolygon(coords)
        else:
            return None

        if not poly.is_valid:
            poly = poly.buffer(0)
        return poly if (poly.is_valid and not poly.is_empty and poly.area > 0.01) else None

    @classmethod
    def compute_buildable_area(
        cls,
        boundary_vertices: Union[List[List[float]], List[Dict[str, float]], ShapelyPolygon],
        setback_ft: float = 10.0,
        road_polygons: Optional[List[Any]] = None,
        green_spaces: Optional[List[Any]] = None,
        obstacles: Optional[List[Any]] = None,
        min_block_area_sqft: float = 300.0,
    ) -> BuildableAreaResult:
        """
        Executes strict GEOS difference:
        Buildable Area = (Boundary.buffer(-setback_ft)) - (Roads ∪ GreenSpaces ∪ Obstacles)
        """
        boundary_poly = cls._to_shapely_polygon(boundary_vertices)
        if not boundary_poly:
            raise ValueError("Invalid boundary polygon provided to BuildableAreaEngine")

        # 1. Apply Setback Buffer
        if setback_ft > 0:
            setback_buffered = boundary_poly.buffer(-setback_ft)
            if not setback_buffered.is_valid:
                setback_buffered = setback_buffered.buffer(0)
            if setback_buffered.is_empty or setback_buffered.area <= 0:
                # If setback completely collapses polygon (very small parcel), fallback to boundary without setback
                logger.warning(f"Setback {setback_ft}ft collapsed boundary. Using 0 setback.")
                setback_buffered = boundary_poly
        else:
            setback_buffered = boundary_poly

        # 2. Collect and Union Road Corridors
        road_shapely_list = []
        if road_polygons:
            for r in road_polygons:
                if isinstance(r, dict):
                    r_geom = r.get("geometry") or r.get("polygon") or r.get("vertices")
                    rp = cls._to_shapely_polygon(r_geom)
                else:
                    rp = cls._to_shapely_polygon(r)
                if rp:
                    road_shapely_list.append(rp)
        road_union = unary_union(road_shapely_list) if road_shapely_list else None
        if road_union and not road_union.is_valid:
            road_union = road_union.buffer(0)

        # 3. Collect and Union Green / Open Spaces
        green_shapely_list = []
        if green_spaces:
            for g in green_spaces:
                if isinstance(g, dict):
                    g_geom = g.get("geometry") or g.get("polygon") or g.get("vertices")
                    gp = cls._to_shapely_polygon(g_geom)
                else:
                    gp = cls._to_shapely_polygon(g)
                if gp:
                    green_shapely_list.append(gp)
        green_union = unary_union(green_shapely_list) if green_shapely_list else None
        if green_union and not green_union.is_valid:
            green_union = green_union.buffer(0)

        # 4. Collect and Union Obstacles / Water bodies
        obstacle_shapely_list = []
        if obstacles:
            for obs in obstacles:
                if isinstance(obs, dict):
                    obs_geom = obs.get("geometry") or obs.get("polygon") or obs.get("vertices")
                    op = cls._to_shapely_polygon(obs_geom)
                else:
                    op = cls._to_shapely_polygon(obs)
                if op:
                    obstacle_shapely_list.append(op)
        obstacle_union = unary_union(obstacle_shapely_list) if obstacle_shapely_list else None
        if obstacle_union and not obstacle_union.is_valid:
            obstacle_union = obstacle_union.buffer(0)

        # 5. Union all constraints
        exclusion_list = [g for g in [road_union, green_union, obstacle_union] if g is not None and not g.is_empty]
        if exclusion_list:
            total_exclusions = unary_union(exclusion_list)
            if not total_exclusions.is_valid:
                total_exclusions = total_exclusions.buffer(0)
            buildable_geom = setback_buffered.difference(total_exclusions)
        else:
            buildable_geom = setback_buffered

        if not buildable_geom.is_valid:
            buildable_geom = buildable_geom.buffer(0)

        # 6. Extract discrete subdividable blocks
        blocks: List[BuildableBlock] = []
        if buildable_geom and not buildable_geom.is_empty:
            if isinstance(buildable_geom, ShapelyPolygon):
                if buildable_geom.area >= min_block_area_sqft:
                    blocks.append(BuildableBlock(block_id="block-001", polygon=buildable_geom, block_index=1))
            elif isinstance(buildable_geom, ShapelyMultiPolygon):
                idx = 1
                for poly in sorted(buildable_geom.geoms, key=lambda p: p.area, reverse=True):
                    if poly.area >= min_block_area_sqft:
                        blocks.append(BuildableBlock(block_id=f"block-{idx:03d}", polygon=poly, block_index=idx))
                        idx += 1

        logger.info(
            f"BuildableAreaEngine computed: gross={boundary_poly.area:.1f} sqft, "
            f"net_buildable={buildable_geom.area if buildable_geom else 0:.1f} sqft, "
            f"blocks={len(blocks)}"
        )

        return BuildableAreaResult(
            gross_boundary_polygon=boundary_poly,
            buildable_geometry=buildable_geom,
            blocks=blocks,
            setback_ft=setback_ft,
            road_corridors_geometry=road_union,
            green_spaces_geometry=green_union,
            obstacles_geometry=obstacle_union,
        )


buildable_area_engine_instance = BuildableAreaEngine()
