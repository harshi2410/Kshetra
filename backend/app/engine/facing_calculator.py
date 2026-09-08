import math
from typing import Dict, Any, List, Optional
from shapely.geometry import Polygon, LineString, Point
from app.engine.geometry_engine import geometry_engine_instance

class FacingCalculator:
    """
    Calculates the True North facing direction of a plot by finding the outward normal
    of its road-facing edge and applying the geographic rotation.
    """
    
    DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

    def calculate_plot_facing(
        self,
        plot: Dict[str, Any],
        roads: List[Dict[str, Any]],
        geographic_rotation: float = 0.0
    ) -> str:
        """
        Determines the facing direction of a plot based on the nearest road.
        """
        try:
            poly_data = plot.get("polygon") or plot.get("geometry")
            if not poly_data or len(poly_data) < 3:
                return "UNKNOWN"
            
            p_shape, _, is_valid = geometry_engine_instance.to_shapely_polygon(poly_data)
            if not p_shape or not is_valid:
                return "UNKNOWN"

            # 1. Find nearest road centerline
            min_dist = float('inf')
            nearest_road_line = None
            
            for road in roads:
                cline_pts = road.get("centerline", [])
                if len(cline_pts) >= 2:
                    r_line = LineString(cline_pts)
                    dist = p_shape.distance(r_line)
                    if dist < min_dist:
                        min_dist = dist
                        nearest_road_line = r_line
            
            if not nearest_road_line or min_dist > 500:
                return "UNKNOWN"

            # 2. Identify road-accessible plot edges
            coords = list(p_shape.exterior.coords)
            edges = []
            for i in range(len(coords) - 1):
                edges.append((coords[i], coords[i+1]))
            
            # Find the edge that is closest to the nearest road
            best_edge = None
            best_edge_dist = float('inf')
            
            for edge in edges:
                edge_line = LineString(edge)
                mid_pt = Point((edge[0][0] + edge[1][0]) / 2.0, (edge[0][1] + edge[1][1]) / 2.0)
                # Primary sort by distance to edge. If edges touch the same point, 
                # their distance to the road might be identical.
                # Adding a small weight for the midpoint distance breaks the tie 
                # in favor of the edge that is broad-side to the road.
                dist = edge_line.distance(nearest_road_line) + (mid_pt.distance(nearest_road_line) * 0.001)
                if dist < best_edge_dist:
                    best_edge_dist = dist
                    best_edge = edge
            
            if not best_edge:
                return "UNKNOWN"
                
            # 3. Calculate outward normal of the best edge
            p1, p2 = best_edge
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            
            nx = -dy
            ny = dx
            
            mid_x = (p1[0] + p2[0]) / 2.0
            mid_y = (p1[1] + p2[1]) / 2.0
            cx, cy = p_shape.centroid.x, p_shape.centroid.y
            
            vec_to_centroid_x = cx - mid_x
            vec_to_centroid_y = cy - mid_y
            
            dot = nx * vec_to_centroid_x + ny * vec_to_centroid_y
            
            # If dot > 0, normal points inward, flip it
            if dot > 0:
                nx = -nx
                ny = -ny
                
            azimuth_rad = math.atan2(nx, -ny)
            azimuth_deg = math.degrees(azimuth_rad)
            if azimuth_deg < 0:
                azimuth_deg += 360
                
            # 4. Apply geographic rotation
            final_azimuth = (azimuth_deg + geographic_rotation) % 360
            
            # 5. Quantize to 8 directions
            idx = int(round(final_azimuth / 45.0)) % 8
            return self.DIRECTIONS[idx]
            
        except Exception:
            return "UNKNOWN"

facing_calculator_instance = FacingCalculator()
