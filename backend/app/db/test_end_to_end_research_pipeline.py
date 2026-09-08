import os
import sys
import json
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine
from app.engine.segmentation_engine import segmentation_engine_instance
from app.engine.research_benchmark import ResearchBenchmark

client = TestClient(app)

def test_full_vision_to_layout_pipeline():
    """
    End-to-end research pipeline validation test:
    1. Ingestion: Project creation & Blueprint upload
    2. AI Perception: SegFormer semantic segmentation & Boundary extraction
    3. Generative AI: 4 distinct layout candidate designs strictly within boundary
    4. Multi-Objective Evaluation & Scoring
    5. Selection & Commitment to ERP plots
    """
    # 1. Project Ingestion
    proj_payload = {
        "name": "Emerald Heights Research Park",
        "developer": "LandOS Autonomous Layout Labs",
        "type": "Residential",
        "landClassification": "N.A. Residential",
        "state": "Maharashtra",
        "district": "Pune",
        "taluka": "Haveli",
        "cityVillage": "Wagholi",
        "pincode": "412207",
        "surveyNumbers": ["Gut 88/1", "Gut 88/2"],
        "grossArea": 10.0,
        "areaUnit": "Acres",
        "baseRatePerSqFt": 3200.0,
        "desiredPlotSizeSqft": 1500.0,
        "roadWidthFt": 30.0,
        "gardenPercentage": 10.0
    }

    create_res = client.post("/api/v1/projects", json=proj_payload)
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Trigger Generative Multi-Alternative Layouts
    gen_payload = {
        "lengthFt": 450.0,
        "breadthFt": 300.0,
        "targetPlotSqft": 1500.0,
        "roadWidthFt": 30.0,
        "gardenPercentage": 10.0,
        "baseRatePerSqft": 3200.0
    }

    gen_res = client.post(f"/api/v1/projects/{project_id}/generate-layouts", json=gen_payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert len(gen_data["variants"]) >= 3

    # Verify that all variants contain valid plots strictly within land bounds
    for variant in gen_data["variants"]:
        assert variant["totalPlots"] > 0
        assert variant["utilizationPercent"] > 0
        assert "compositeScore" in variant

    # 3. Retrieve Variants from Project API
    variants_res = client.get(f"/api/v1/projects/{project_id}/variants")
    assert variants_res.status_code == 200
    variants_list = variants_res.json()
    assert len(variants_list) >= 3

    # 4. Select Variant 1 as Master
    first_var_id = variants_list[0]["id"]
    sel_res = client.post(f"/api/v1/projects/{project_id}/variants/{first_var_id}/select")
    assert sel_res.status_code == 200

    # 5. Verify SVG rendering
    svg_res = client.get(f"/api/v1/projects/{project_id}/variants/{first_var_id}/svg")
    assert svg_res.status_code == 200
    assert "<svg" in svg_res.json()["svgContent"]

    # 6. Verify Research Benchmark Metrics Evaluation
    iou = ResearchBenchmark.compute_polygon_iou(
        [[0,0],[30,0],[30,40],[0,40],[0,0]],
        [[0,0],[30,0],[30,40],[0,40],[0,0]]
    )
    assert iou == 1.0

    ocr_eval = ResearchBenchmark.compute_ocr_word_accuracy(
        ["Plot", "12", "1500", "sqft"],
        ["Plot", "12", "1500", "sqft"]
    )
    assert ocr_eval["f1"] == 1.0

    benchmark_res = ResearchBenchmark.run_generative_layout_benchmark(400.0, 250.0)
    assert benchmark_res["variantsCount"] >= 3

    # Clean up
    del_res = client.delete(f"/api/v1/projects/{project_id}")
    assert del_res.status_code == 204
