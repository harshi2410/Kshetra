import os
import sys
import tempfile
from pathlib import Path
import pytest

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import ezdxf
from app.engine.cad_parser import cad_parser_instance
from app.engine.vision_engine import vision_engine_instance
from app.engine.inspector import file_inspector_instance

def test_cad_dxf_extraction():
    # 1. Create a synthetic test DXF file with lines, polyline (plot boundary), circle, and text
    doc = ezdxf.new("R2010")
    msp = doc.modelspace()

    # Add outer boundary polyline
    msp.add_lwpolyline([(0, 0), (500, 0), (500, 300), (0, 300)], close=True, dxfattribs={"layer": "BOUNDARY"})
    # Add internal road lines
    msp.add_line((0, 150), (500, 150), dxfattribs={"layer": "ROAD_CENTERLINE"})
    # Add plot polyline
    msp.add_lwpolyline([(50, 20), (150, 20), (150, 130), (50, 130)], close=True, dxfattribs={"layer": "PLOTS"})
    # Add plot text annotation
    msp.add_text("PLOT 101", dxfattribs={"layer": "ANNOTATIONS", "height": 12.0, "insert": (60, 40)})

    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        doc.saveas(tmp_path)

        # 2. Test VisionEngine context
        ctx = vision_engine_instance.analyze_vision_context(tmp_path)
        assert ctx.fileType == "DXF"
        assert ctx.isVector is True
        assert ctx.isSupported is True
        assert ctx.strategy == "CAD_DXF_PIPELINE"

        # 3. Test FileInspector
        insp = file_inspector_instance.inspect_file(tmp_path)
        assert insp["recommendedParser"] == "CAD_DXF_PARSER"
        assert insp["hasVectorStream"] is True

        # 4. Test CADParser extraction
        result = cad_parser_instance.parse_dxf(tmp_path)
        assert result["artifactType"] == "CAD_DXF_PARSED"
        assert result["primitivesCount"] >= 3
        assert result["textElementsCount"] >= 1
        assert "BOUNDARY" in result["layers"]
        assert "PLOTS" in result["layers"]
        assert any(t["text"] == "PLOT 101" for t in result["textElements"])

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
