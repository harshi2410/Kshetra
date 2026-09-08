import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class UniversalLayoutReconstructionEngine:
    """
    Universal Layout Reconstruction Engine Singleton (TASK-050 / TASK-055)
    Synthesizes the digital layout into UNIVERSAL_LAYOUT_MODEL and generates vector LAYOUT_SVG.
    Preserves raw coordinates and GEOS spatial representations (WKT / GeoJSON).
    """

    def generate_vector_svg(
        self,
        boundary: Dict[str, Any],
        roads: List[Dict[str, Any]],
        plots: List[Dict[str, Any]],
        labels: List[Dict[str, Any]]
    ) -> str:
        bbox = boundary.get("boundingBox", [0.0, 0.0, 1200.0, 900.0])
        vw = max(float(bbox[2] - bbox[0]), 1200.0)
        vh = max(float(bbox[3] - bbox[1]), 900.0)
        viewbox_str = f"{bbox[0]} {bbox[1]} {vw} {vh}"

        svg_parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox_str}" width="100%" height="100%" id="universal-layout-svg" style="background-color: #0f172a;">',
            '  <defs>',
            '    <style>',
            '      .boundary-path { fill: rgba(30, 41, 59, 0.5); stroke: #3b82f6; stroke-width: 4; stroke-linejoin: round; filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)); }',
            '      .road-polygon { fill: #1e293b; stroke: #475569; stroke-width: 1.5; }',
            '      .road-centerline { fill: none; stroke: #64748b; stroke-width: 1.5; stroke-dasharray: 6,6; }',
            '      .plot-polygon { fill: #10b981; fill-opacity: 0.85; stroke: #047857; stroke-width: 1.5; transition: all 0.2s ease-in-out; cursor: pointer; }',
            '      .plot-polygon.status-sold { fill: #dc2626; fill-opacity: 0.85; stroke: #991b1b; }',
            '      .plot-polygon.status-reserved { fill: #f59e0b; fill-opacity: 0.85; stroke: #b45309; }',
            '      .plot-polygon.status-available { fill: #10b981; fill-opacity: 0.85; stroke: #047857; }',
            '      .plot-polygon:hover { fill-opacity: 1.0; stroke: #38bdf8; stroke-width: 3; filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.6)); transform: scale(1.01); }',
            '      .plot-label { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 700; fill: #ffffff; text-anchor: middle; dominant-baseline: middle; pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }',
            '      .plot-sublabel { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 500; fill: #e2e8f0; text-anchor: middle; dominant-baseline: middle; pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }',
            '      .road-label { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 600; fill: #94a3b8; text-anchor: middle; letter-spacing: 0.05em; pointer-events: none; }',
            '      .boundary-label { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 15px; font-weight: 700; fill: #60a5fa; letter-spacing: 0.05em; }',
            '    </style>',
            '  </defs>',
            '  <g id="layer-boundary">'
        ]

        b_geom = boundary.get("geometry", [])
        if b_geom:
            pts_str = " ".join([f"{p[0]},{p[1]}" for p in b_geom])
            svg_parts.append(f'    <polygon id="{boundary.get("boundaryId", "b-001")}" points="{pts_str}" class="boundary-path" />')

        svg_parts.append('  </g>\n  <g id="layer-roads">')

        for r in roads:
            rid = r.get("roadId", "r-001")
            r_geom = r.get("polygon", []) or r.get("geometry", [])
            r_cline = r.get("centerline", [])
            r_name = r.get("roadName") or ""

            if r_geom:
                pts_str = " ".join([f"{p[0]},{p[1]}" for p in r_geom])
                svg_parts.append(f'    <polygon id="road-poly-{rid}" points="{pts_str}" class="road-polygon" />')

            if r_cline:
                cpts_str = " ".join([f"{p[0]},{p[1]}" for p in r_cline])
                svg_parts.append(f'    <polyline id="road-cline-{rid}" points="{cpts_str}" class="road-centerline" />')
                if r_name and len(r_cline) >= 2:
                    cx = (r_cline[0][0] + r_cline[-1][0]) / 2.0
                    cy = (r_cline[0][1] + r_cline[-1][1]) / 2.0
                    svg_parts.append(f'    <text x="{cx}" y="{cy}" class="road-label">{r_name}</text>')

        svg_parts.append('  </g>\n  <g id="layer-plots">')

        for idx, p in enumerate(plots):
            pid = p.get("id") or p.get("plotId") or f"p-{idx+1:03d}"
            p_geom = p.get("polygon", []) or p.get("geometry", [])
            p_num = p.get("plotNumber") or f"{idx+1}"
            p_status = (p.get("status") or "AVAILABLE").upper()
            p_area = p.get("area") or 0
            c = p.get("centroid", [0.0, 0.0])

            status_class = f"status-{p_status.lower()}"

            if p_geom:
                pts_str = " ".join([f"{pt[0]},{pt[1]}" for pt in p_geom])
                svg_parts.append(f'    <polygon id="plot-poly-{pid}" data-plot-id="{pid}" data-plot-no="{p_num}" data-status="{p_status}" data-area="{p_area}" points="{pts_str}" class="plot-polygon {status_class}" />')

            svg_parts.append(f'    <text x="{c[0]}" y="{c[1] - 4}" class="plot-label">{p_num}</text>')
            if p_area > 0:
                svg_parts.append(f'    <text x="{c[0]}" y="{c[1] + 10}" class="plot-sublabel">{int(p_area)} sq ft</text>')

        svg_parts.append('  </g>\n  <g id="layer-labels">')

        for lbl in labels:
            txt = lbl.get("text", "")
            pos = lbl.get("position", [100.0, 50.0])
            svg_parts.append(f'    <text x="{pos[0]}" y="{pos[1]}" class="boundary-label">{txt}</text>')

        svg_parts.append('  </g>\n</svg>')
        return "\n".join(svg_parts)

    def reconstruct_universal_layout(
        self,
        labeled_layout_dict: Dict[str, Any],
        road_network_dict: Dict[str, Any],
        project_boundary_dict: Dict[str, Any],
        detected_plots_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        labeled_plots = labeled_layout_dict.get("plots", []) or detected_plots_dict.get("plots", [])
        labeled_roads = labeled_layout_dict.get("roads", []) or road_network_dict.get("roads", [])
        boundary_labels = labeled_layout_dict.get("boundaryLabels", [])

        plots_model: List[Dict[str, Any]] = []
        for p in labeled_plots:
            pid = p.get("plotId") or p.get("id")
            plots_model.append({
                "id": pid,
                "plotNumber": p.get("plotNumber") or (pid[:8] if pid else "1"),
                "polygon": p.get("geometry", []),
                "wkt": p.get("wkt", ""),
                "geoJson": p.get("geoJson"),
                "centroid": p.get("centroid", [0.0, 0.0]),
                "area": p.get("area", 0.0),
                "perimeter": p.get("perimeter", 0.0),
                "roadAccess": True,
                "roadId": p.get("nearestRoadId"),
                "roadName": p.get("roadName") or "MAIN ROAD",
                "dimensions": p.get("dimensionLabels", []),
                "areaLabel": p.get("areaLabel") or f"{p.get('area', 0.0)} SQ FT",
                "status": "AVAILABLE",
                "confidence": p.get("confidence", 0.95)
            })

        roads_model: List[Dict[str, Any]] = []
        for r in labeled_roads:
            rid = r.get("roadId")
            roads_model.append({
                "roadId": rid,
                "roadName": r.get("roadName") or f"ROAD-{rid[-3:] if rid else '01'}",
                "roadWidth": r.get("roadWidth", 30.0),
                "centerline": r.get("centerline", []),
                "polygon": r.get("geometry", []),
                "wkt": r.get("wkt", ""),
                "geoJson": r.get("geoJson"),
                "connections": r.get("connectedRoads", [])
            })

        boundary_model = {
            "boundaryId": project_boundary_dict.get("boundaryId", "boundary-001"),
            "boundaryPolygon": project_boundary_dict.get("geometry", []),
            "wkt": project_boundary_dict.get("wkt", ""),
            "geoJson": project_boundary_dict.get("geoJson"),
            "orientation": project_boundary_dict.get("orientation", "NORTH"),
            "layoutArea": project_boundary_dict.get("area", 0.0),
            "perimeter": project_boundary_dict.get("perimeter", 0.0),
            "boundingBox": project_boundary_dict.get("boundingBox", [0.0, 0.0, 1200.0, 900.0])
        }

        labels_model = [{"text": b_lbl, "type": "ANNOTATION", "position": [100.0, 60.0]} for b_lbl in boundary_labels]

        svg_content = self.generate_vector_svg(boundary_model, roads_model, plots_model, labels_model)

        model_result = {
            "artifactType": "UNIVERSAL_LAYOUT_MODEL",
            "project": {"layoutName": "LandOS Universal Layout", "version": "1.0.0"},
            "boundary": boundary_model,
            "roads": roads_model,
            "plots": plots_model,
            "labels": labels_model,
            "dimensions": [p.get("dimensions") for p in plots_model],
            "orientation": boundary_model["orientation"],
            "metadata": {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "engineVersion": "0.11.0",
                "totalPlotsCount": len(plots_model),
                "totalRoadsCount": len(roads_model),
                "georeference": {
                    "status": "UNCONFIGURED",
                    "provider": "OSM",
                    "latitude": None,
                    "longitude": None,
                    "zoom": 18,
                    "rotation": 0,
                    "scale": 1,
                    "translation": {"x": 0, "y": 0}
                }
            },
            "svgContent": svg_content
        }

        logger.info(f"UniversalLayoutReconstructionEngine GEOS completed: {len(plots_model)} plots, {len(roads_model)} roads")
        return model_result

universal_layout_reconstruction_engine_instance = UniversalLayoutReconstructionEngine()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("=" * 60)
    print("LandOS Universal Layout Reconstruction Engine — Live Demo")
    print("=" * 60)

    # Sample input payloads
    sample_boundary = {
        "boundaryId": "demo-boundary-01",
        "geometry": [[0.0, 0.0], [500.0, 0.0], [500.0, 400.0], [0.0, 400.0], [0.0, 0.0]],
        "area": 200000.0,
        "perimeter": 1800.0,
        "orientation": "NORTH",
        "boundingBox": [0.0, 0.0, 500.0, 400.0]
    }

    sample_roads = {
        "roads": [
            {
                "roadId": "road-001",
                "roadName": "Main Avenue 40ft",
                "width": 40.0,
                "length": 500.0,
                "centerline": [[0.0, 200.0], [500.0, 200.0]],
                "geometry": [[0.0, 180.0], [500.0, 180.0], [500.0, 220.0], [0.0, 220.0], [0.0, 180.0]]
            }
        ]
    }

    sample_plots = {
        "plots": [
            {
                "plotId": "P-001",
                "plotNumber": "P-001",
                "area": 1200.0,
                "centroid": [50.0, 100.0],
                "geometry": [[20.0, 60.0], [80.0, 60.0], [80.0, 140.0], [20.0, 140.0], [20.0, 60.0]],
                "nearestRoadId": "road-001",
                "roadName": "Main Avenue 40ft",
                "status": "AVAILABLE"
            },
            {
                "plotId": "P-002",
                "plotNumber": "P-002",
                "area": 1200.0,
                "centroid": [130.0, 100.0],
                "geometry": [[100.0, 60.0], [160.0, 60.0], [160.0, 140.0], [100.0, 140.0], [100.0, 60.0]],
                "nearestRoadId": "road-001",
                "roadName": "Main Avenue 40ft",
                "status": "RESERVED"
            },
            {
                "plotId": "P-003",
                "plotNumber": "P-003",
                "area": 1200.0,
                "centroid": [210.0, 100.0],
                "geometry": [[180.0, 60.0], [240.0, 60.0], [240.0, 140.0], [180.0, 140.0], [180.0, 60.0]],
                "nearestRoadId": "road-001",
                "roadName": "Main Avenue 40ft",
                "status": "SOLD"
            }
        ]
    }

    sample_labels = {
        "plots": sample_plots["plots"],
        "roads": sample_roads["roads"],
        "boundaryLabels": ["SURVEY NO. 142/A", "NORTH"]
    }

    result = universal_layout_reconstruction_engine_instance.reconstruct_universal_layout(
        labeled_layout_dict=sample_labels,
        road_network_dict=sample_roads,
        project_boundary_dict=sample_boundary,
        detected_plots_dict=sample_plots
    )

    print(f"Artifact Type: {result['artifactType']}")
    print(f"Total Plots Reconstructed: {len(result['plots'])}")
    print(f"Total Roads Reconstructed: {len(result['roads'])}")
    print(f"SVG Length: {len(result['svgContent'])} characters")
    print(f"Generated at: {result['metadata']['generatedAt']}")
    print("=" * 60)
    print("SUCCESS: Universal Layout Reconstructed & SVG Generated!")
    print("=" * 60)
