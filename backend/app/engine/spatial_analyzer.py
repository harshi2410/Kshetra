import math
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

class SpatialAnalyzer:
    """
    Engine singleton responsible for spatial analysis and GeoJSON FeatureCollection generation.
    Computes exact polygon areas via Shoelace algorithm, centroids, facing directions, and 
    converts Canonical Layout Model (CLM) IR into standard GeoJSON layout features.
    """

    @staticmethod
    def shoelace_area(vertices: List[Dict[str, float]]) -> float:
        """
        Computes exact area of a 2D polygon using the Shoelace formula (Gauss's area formula).
        """
        n = len(vertices)
        if n < 3:
            return 0.0

        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            x_i = float(vertices[i].get("x", 0.0))
            y_i = float(vertices[i].get("y", 0.0))
            x_j = float(vertices[j].get("x", 0.0))
            y_j = float(vertices[j].get("y", 0.0))
            area += (x_i * y_j) - (x_j * y_i)

        return round(abs(area) / 2.0, 2)

    @staticmethod
    def compute_centroid(vertices: List[Dict[str, float]]) -> Dict[str, float]:
        """
        Computes arithmetic centroid (center of mass) of polygon vertices.
        """
        if not vertices:
            return {"x": 0.0, "y": 0.0}

        sum_x = sum(float(v.get("x", 0.0)) for v in vertices)
        sum_y = sum(float(v.get("y", 0.0)) for v in vertices)
        n = len(vertices)
        return {
            "x": round(sum_x / n, 2),
            "y": round(sum_y / n, 2)
        }

    @staticmethod
    def determine_facing(centroid: Dict[str, float], page_center: Dict[str, float]) -> str:
        """
        Determines cardinal facing direction (NORTH, EAST, SOUTH, WEST) based on centroid position relative to page center.
        """
        dx = centroid["x"] - page_center["x"]
        dy = centroid["y"] - page_center["y"]

        angle_deg = math.degrees(math.atan2(dy, dx))
        if -45 <= angle_deg < 45:
            return "EAST"
        elif 45 <= angle_deg < 135:
            return "NORTH"
        elif -135 <= angle_deg < -45:
            return "SOUTH"
        else:
            return "WEST"

    def analyze_spatial_layout(self, clm_data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Reads CLM IR payload, performs spatial calculations (Shoelace area, centroids, facing direction),
        and generates a standard GeoJSON FeatureCollection.

        Returns:
            Tuple[geojson_dict, statistics_dict]
        """
        boundaries = clm_data.get("boundaries", [])
        closed_polygons = clm_data.get("closedPolygons", [])
        roads = clm_data.get("roads", [])
        paths = clm_data.get("paths", [])

        # Calculate page center for facing direction calculation
        all_xs = []
        all_ys = []
        for poly in (boundaries + closed_polygons):
            for v in poly.get("vertices", []):
                all_xs.append(float(v.get("x", 0.0)))
                all_ys.append(float(v.get("y", 0.0)))

        min_x = min(all_xs) if all_xs else 0.0
        max_x = max(all_xs) if all_xs else 612.0
        min_y = min(all_ys) if all_ys else 0.0
        max_y = max(all_ys) if all_ys else 792.0

        page_center = {
            "x": (min_x + max_x) / 2.0,
            "y": (min_y + max_y) / 2.0
        }

        features: List[Dict[str, Any]] = []

        total_analyzed_plots = 0
        total_plot_area = 0.0

        # 1. Process Boundaries
        for b_idx, b in enumerate(boundaries):
            vertices = b.get("vertices", [])
            raw_coords = [[float(v["x"]), float(v["y"])] for v in vertices]
            if raw_coords and raw_coords[0] != raw_coords[-1]:
                raw_coords.append(raw_coords[0])  # Close linear ring

            area = self.shoelace_area(vertices)
            centroid = self.compute_centroid(vertices)

            features.append({
                "type": "Feature",
                "id": b.get("id", f"bound-{b_idx}"),
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [raw_coords]
                },
                "properties": {
                    "entityType": "BOUNDARY",
                    "labelHint": b.get("labelHint", "Project Boundary"),
                    "calculatedAreaSqFt": area,
                    "centroid": centroid
                }
            })

        # 2. Process Closed Polygons (Plots, Amenities, Unclassified)
        for p_idx, p in enumerate(closed_polygons):
            vertices = p.get("vertices", [])
            raw_coords = [[float(v["x"]), float(v["y"])] for v in vertices]
            if raw_coords and raw_coords[0] != raw_coords[-1]:
                raw_coords.append(raw_coords[0])

            area = self.shoelace_area(vertices)
            centroid = self.compute_centroid(vertices)
            facing = self.determine_facing(centroid, page_center)
            entity_type = p.get("entityType", "PLOT")

            if entity_type == "PLOT":
                total_analyzed_plots += 1
                total_plot_area += area

            features.append({
                "type": "Feature",
                "id": p.get("id", f"plot-{p_idx}"),
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [raw_coords]
                },
                "properties": {
                    "entityType": entity_type,
                    "labelHint": p.get("labelHint", f"Plot-{p_idx+1}"),
                    "calculatedAreaSqFt": area,
                    "centroid": centroid,
                    "facing": facing,
                    "status": "AVAILABLE"
                }
            })

        # 3. Process Roads
        for r_idx, r in enumerate(roads):
            polyline = r.get("polyline", [])
            coords = [[float(v["x"]), float(v["y"])] for v in polyline]

            features.append({
                "type": "Feature",
                "id": r.get("id", f"road-{r_idx}"),
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "properties": {
                    "entityType": "ROAD",
                    "roadName": r.get("roadName", f"Road {r_idx+1}"),
                    "widthMeters": r.get("widthMeters", 9.0)
                }
            })

        geojson_payload = {
            "type": "FeatureCollection",
            "version": "1.0.0",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "features": features
        }

        statistics = {
            "totalFeatures": len(features),
            "analyzedPlotsCount": total_analyzed_plots,
            "totalPlotAreaSqFt": round(total_plot_area, 2),
            "roadCorridorsCount": len(roads),
            "boundariesCount": len(boundaries)
        }

        logger.info(f"Spatial Analyzer completed: {total_analyzed_plots} plots analyzed, total area {total_plot_area:.2f} sqft")
        return geojson_payload, statistics

# Engine singleton instance
spatial_analyzer_instance = SpatialAnalyzer()
