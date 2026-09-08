import os
import sys
import cv2
import numpy as np
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.research_benchmark import ResearchBenchmark


def test_research_metrics():
    # 1. Test GEOS IoU
    poly_a = [[0, 0], [100, 0], [100, 100], [0, 100]]
    poly_b = [[50, 0], [150, 0], [150, 100], [50, 100]]
    iou = ResearchBenchmark.compute_polygon_iou(poly_a, poly_b)
    # Area of intersection = 50x100 = 5000. Union = 150x100 = 15000. IoU = 5000/15000 = 0.3333
    assert abs(iou - 0.3333) < 0.01

    # 2. Test OCR Word Accuracy
    gt = ["PLOT", "10", "ROAD", "30FT", "1200", "SQFT"]
    extracted = ["PLOT", "10", "ROAD", "30FT", "1200", "SQFT", "SURVEY"]
    metrics = ResearchBenchmark.compute_ocr_word_accuracy(gt, extracted)
    assert metrics["recall"] == 1.0
    assert metrics["precision"] > 0.85

    # 3. Test Segmentation Ablation
    canvas = np.ones((600, 800, 3), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (40, 40), (760, 560), (0, 0, 0), 2)
    cv2.line(canvas, (40, 300), (760, 300), (0, 0, 0), 20)

    ablation_res = ResearchBenchmark.run_segmentation_ablation(canvas)
    assert ablation_res["ablationType"] == "SEMANTIC_SEGMENTATION_ABLATION"
    assert len(ablation_res["benchmarkResults"]) == 3

    # 4. Test Generative Layout Benchmark
    gen_res = ResearchBenchmark.run_generative_layout_benchmark(length_ft=300.0, breadth_ft=200.0)
    assert gen_res["benchmarkType"] == "MULTI_ALTERNATIVE_GENERATIVE_BENCHMARK"
    assert gen_res["variantsCount"] >= 3
    assert len(gen_res["strategyComparison"]) >= 3


if __name__ == "__main__":
    test_research_metrics()
    print("ALL RESEARCH EVALUATION & ABLATION BENCHMARK TESTS PASSED SUCCESSFULLY!")
