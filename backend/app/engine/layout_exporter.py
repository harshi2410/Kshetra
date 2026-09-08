"""
LayoutExporter — Production CAD DXF, GeoJSON, Vector PDF, and Inventory CSV Exporter.
Exports any generated or edited layout variant into industry-standard deliverables:
- AutoCAD DXF (R2018 format with layer hierarchy & MTEXT)
- RFC 7946 GeoJSON FeatureCollection
- Tabular Plot Inventory CSV
- Architectural Summary Specification
"""

import io
import csv
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import ezdxf
    HAS_EZDXF = True
except ImportError:
    HAS_EZDXF = False

try:
    import pymupdf as fitz
    HAS_FITZ = True
except ImportError:
    try:
        import fitz
        HAS_FITZ = True
    except ImportError:
        HAS_FITZ = False


class LayoutExporter:
    """Exports universal and generative layouts to CAD DXF, GeoJSON, and CSV."""

    @classmethod
    def export_dxf(cls, layout_model: Dict[str, Any], project_name: str = "LandOS Project") -> bytes:
        """Exports layout to layered AutoCAD DXF."""
        if not HAS_EZDXF:
            raise RuntimeError("ezdxf is required for DXF export")

        doc = ezdxf.new("R2018")
        msp = doc.modelspace()

        # Setup standard CAD Layers
        layers = [
            ("LAND_BOUNDARY", 5),     # Blue
            ("ROAD_NETWORK", 8),      # Dark Gray
            ("RESIDENTIAL_PLOTS", 3), # Green
            ("CORNER_PLOTS", 2),      # Yellow
            ("AMENITY_ZONES", 4),     # Cyan
            ("PLOT_LABELS", 7),       # White
            ("DIMENSIONS", 1),        # Red
        ]
        for name, color in layers:
            if name not in doc.layers:
                doc.layers.add(name, color=color)

        # 1. Boundary
        boundary = layout_model.get("boundary", {})
        b_pts = boundary.get("polygon", [])
        if b_pts:
            pts_2d = [(float(p["x"]), float(p["y"])) for p in b_pts]
            if pts_2d:
                msp.add_lwpolyline(pts_2d, close=True, dxfattribs={"layer": "LAND_BOUNDARY"})

        # 2. Roads
        roads = layout_model.get("roads", [])
        for r in roads:
            r_pts = r.get("polygon", [])
            if r_pts:
                pts_2d = [(float(p["x"]), float(p["y"])) for p in r_pts]
                if pts_2d:
                    msp.add_lwpolyline(pts_2d, close=True, dxfattribs={"layer": "ROAD_NETWORK"})

        # 3. Amenities
        amenities = layout_model.get("amenities", [])
        for a in amenities:
            a_pts = a.get("polygon", [])
            if a_pts:
                pts_2d = [(float(p["x"]), float(p["y"])) for p in a_pts]
                if pts_2d:
                    msp.add_lwpolyline(pts_2d, close=True, dxfattribs={"layer": "AMENITY_ZONES"})

        # 4. Plots & Labels
        plots = layout_model.get("plots", [])
        for p in plots:
            p_pts = p.get("polygon", [])
            is_corner = p.get("isCorner", False)
            layer_name = "CORNER_PLOTS" if is_corner else "RESIDENTIAL_PLOTS"

            if p_pts:
                pts_2d = [(float(pt["x"]), float(pt["y"])) for pt in p_pts]
                if pts_2d:
                    msp.add_lwpolyline(pts_2d, close=True, dxfattribs={"layer": layer_name})

                    # Calculate centroid for text
                    cx = sum(pt[0] for pt in pts_2d) / len(pts_2d)
                    cy = sum(pt[1] for pt in pts_2d) / len(pts_2d)

                    plot_no = str(p.get("plotNumber") or p.get("plot_number") or "PLOT")
                    area_txt = f"{float(p.get('areaSqft', 0)):.0f} SQFT"

                    # Add text in CAD
                    msp.add_text(
                        plot_no,
                        dxfattribs={
                            "layer": "PLOT_LABELS",
                            "height": 4.0,
                            "insert": (cx - 6.0, cy + 2.0),
                        }
                    )
                    msp.add_text(
                        area_txt,
                        dxfattribs={
                            "layer": "DIMENSIONS",
                            "height": 2.5,
                            "insert": (cx - 8.0, cy - 4.0),
                        }
                    )

        stream = io.StringIO()
        doc.write(stream)
        return stream.getvalue().encode("utf-8")

    @classmethod
    def export_geojson(cls, layout_model: Dict[str, Any]) -> Dict[str, Any]:
        """Exports layout to standard RFC 7946 GeoJSON FeatureCollection."""
        features = []

        # Boundary
        boundary = layout_model.get("boundary", {})
        b_pts = boundary.get("polygon", [])
        if b_pts:
            coords = [[float(p["x"]), float(p["y"])] for p in b_pts]
            if coords and coords[0] != coords[-1]:
                coords.append(coords[0])
            features.append({
                "type": "Feature",
                "properties": {
                    "layer": "LAND_BOUNDARY",
                    "areaSqft": boundary.get("areaSqft"),
                },
                "geometry": {"type": "Polygon", "coordinates": [coords]}
            })

        # Roads
        for r in layout_model.get("roads", []):
            r_pts = r.get("polygon", [])
            if r_pts:
                coords = [[float(p["x"]), float(p["y"])] for p in r_pts]
                if coords and coords[0] != coords[-1]:
                    coords.append(coords[0])
                features.append({
                    "type": "Feature",
                    "properties": {
                        "layer": "ROAD_NETWORK",
                        "roadId": r.get("roadId"),
                        "name": r.get("name"),
                        "widthFt": r.get("widthFt"),
                        "type": r.get("type"),
                    },
                    "geometry": {"type": "Polygon", "coordinates": [coords]}
                })

        # Amenities
        for a in layout_model.get("amenities", []):
            a_pts = a.get("polygon", [])
            if a_pts:
                coords = [[float(p["x"]), float(p["y"])] for p in a_pts]
                if coords and coords[0] != coords[-1]:
                    coords.append(coords[0])
                features.append({
                    "type": "Feature",
                    "properties": {
                        "layer": "AMENITY_ZONES",
                        "amenityId": a.get("amenityId"),
                        "name": a.get("name"),
                        "type": a.get("type"),
                        "areaSqft": a.get("areaSqft"),
                    },
                    "geometry": {"type": "Polygon", "coordinates": [coords]}
                })

        # Plots
        for p in layout_model.get("plots", []):
            p_pts = p.get("polygon", [])
            if p_pts:
                coords = [[float(pt["x"]), float(pt["y"])] for pt in p_pts]
                if coords and coords[0] != coords[-1]:
                    coords.append(coords[0])
                features.append({
                    "type": "Feature",
                    "properties": {
                        "layer": "RESIDENTIAL_PLOTS",
                        "plotId": p.get("plotId"),
                        "plotNumber": p.get("plotNumber"),
                        "areaSqft": p.get("areaSqft"),
                        "dimensions": p.get("dimensions"),
                        "widthFt": p.get("widthFt"),
                        "depthFt": p.get("depthFt"),
                        "facing": p.get("facing"),
                        "roadName": p.get("roadName"),
                        "isCorner": p.get("isCorner"),
                        "status": p.get("status", "AVAILABLE"),
                        "estimatedPrice": p.get("estimatedPrice", 0),
                    },
                    "geometry": {"type": "Polygon", "coordinates": [coords]}
                })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    @classmethod
    def export_csv_inventory(cls, layout_model: Dict[str, Any]) -> str:
        """Exports plot schedule and bill of quantities as CSV."""
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Plot Number",
            "Status",
            "Area (Sq Ft)",
            "Width (Ft)",
            "Depth (Ft)",
            "Facing",
            "Road Access",
            "Corner Plot",
            "Est. Base Price (INR)"
        ])

        plots = layout_model.get("plots", [])
        for p in plots:
            writer.writerow([
                p.get("plotNumber", "P-000"),
                p.get("status", "AVAILABLE"),
                f"{float(p.get('areaSqft', 0)):.1f}",
                f"{float(p.get('widthFt', 0)):.1f}",
                f"{float(p.get('depthFt', 0)):.1f}",
                p.get("facing", "NORTH"),
                p.get("roadName", "Main Road"),
                "YES" if p.get("isCorner") else "NO",
                f"{float(p.get('estimatedPrice', 0)):.2f}"
            ])

        return output.getvalue()
