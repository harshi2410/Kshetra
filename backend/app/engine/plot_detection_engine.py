import uuid
import logging
from typing import Dict, Any, List, Set
from app.engine.geometry_engine import GeometryEngine

logger = logging.getLogger(__name__)

class PlotDetectionEngine:
    """
    Plot Detection Engine Singleton (TASK-047 / TASK-055)
    Validates and extracts plot polygons using GEOS computational geometry (Shapely).
    Computes exact areas, perimeters, centroids, and stable UUID5 plot identifiers.
    """

    @staticmethod
    def generate_stable_plot_id(centroid: List[float], area: float) -> str:
        seed = f"landos-plot-{round(centroid[0], 1)}-{round(centroid[1], 1)}-{round(area, 0)}"
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, seed))

    def detect_plots(
        self,
        universal_primitives_dict: Dict[str, Any],
        geometry_graph_dict: Dict[str, Any],
        road_network_dict: Dict[str, Any],
        project_boundary_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        primitives = universal_primitives_dict.get("universalPrimitives", []) or universal_primitives_dict.get("primitives", [])
        edges = geometry_graph_dict.get("edges", [])
        roads = road_network_dict.get("roads", [])
        road_ids = {r.get("roadId") for r in roads}
        boundary_id = project_boundary_dict.get("boundaryId", "")

        # 1. GEOS Polygon Extraction & Validation
        raw_plot_candidates = []
        for p in primitives:
            p_id = p.get("id") or p.get("primitiveId")
            cand_type = p.get("candidateType", "UNKNOWN")
            verts = p.get("vertices", [])
            if not verts and p.get("boundingBox"):
                bbox = p.get("boundingBox")
                if len(bbox) == 4:
                    verts = [
                        [float(bbox[0]), float(bbox[1])],
                        [float(bbox[2]), float(bbox[1])],
                        [float(bbox[2]), float(bbox[3])],
                        [float(bbox[0]), float(bbox[3])],
                        [float(bbox[0]), float(bbox[1])]
                    ]

            if p_id == boundary_id or p_id in road_ids:
                continue

            geo_info = GeometryEngine.analyze_polygon(verts)
            area = geo_info["area"]

            if cand_type in ["PLOT_CANDIDATE", "UNKNOWN"] and area > 100.0 and area < 200000.0:
                p["geos"] = geo_info
                raw_plot_candidates.append(p)

        # 2. Build neighbor adjacency map
        plot_ids = {p.get("id") or p.get("primitiveId") for p in raw_plot_candidates}
        neighbors_map: Dict[str, Set[str]] = {pid: set() for pid in plot_ids}

        for edge in edges:
            src, tgt, rel = edge.get("sourceId"), edge.get("targetId"), edge.get("relationshipType")
            if src in plot_ids and tgt in plot_ids and rel in ["SHARED_EDGE", "TOUCHES", "OVERLAPS", "NEIGHBOR"]:
                neighbors_map[src].add(tgt)
                neighbors_map[tgt].add(src)

        detected_plots: List[Dict[str, Any]] = []
        total_plot_area = 0.0

        for p in raw_plot_candidates:
            p_id = p.get("id") or p.get("primitiveId")
            geo = p["geos"]

            centroid = geo["centroid"]
            area = geo["area"]
            perimeter = geo["perimeter"]
            bbox = geo["boundingBox"]
            vertices = geo["vertices"]

            stable_id = self.generate_stable_plot_id(centroid, area)

            w = abs(bbox[2] - bbox[0])
            h = abs(bbox[3] - bbox[1])
            aspect_ratio = round(w / h, 2) if h > 0 else 1.0
            orientation = "NORTH" if h >= w else "EAST"

            neighbor_list = sorted(list(neighbors_map.get(p_id, set())))
            total_plot_area += area

            detected_plots.append({
                "plotId": stable_id,
                "primitiveId": p_id,
                "geometry": vertices,
                "wkt": geo.get("wkt", ""),
                "geoJson": geo.get("geoJson"),
                "centroid": centroid,
                "boundingBox": bbox,
                "area": area,
                "perimeter": perimeter,
                "aspectRatio": aspect_ratio,
                "orientation": orientation,
                "roadAccess": True,
                "neighborPlots": neighbor_list,
                "confidence": 0.95
            })

        result = {
            "artifactType": "DETECTED_PLOTS",
            "totalPlotsCount": len(detected_plots),
            "totalPlotArea": round(total_plot_area, 2),
            "plots": detected_plots
        }

        logger.info(f"PlotDetectionEngine GEOS completed: {len(detected_plots)} plots detected, total area={total_plot_area:.2f}")
        return result

plot_detection_engine_instance = PlotDetectionEngine()
