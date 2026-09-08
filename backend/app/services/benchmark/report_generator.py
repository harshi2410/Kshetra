import json
import logging
from pathlib import Path
from app.services.benchmark.schemas import BenchmarkResult

logger = logging.getLogger(__name__)

class ReportGenerator:
    def generate_json_report(self, result: BenchmarkResult, output_dir: Path) -> Path:
        json_path = output_dir / "benchmark_result.json"
        json_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        return json_path

    def generate_markdown_report(self, result: BenchmarkResult, output_dir: Path) -> Path:
        md_content = f"""# BENCHMARK REPORT: {result.project_id}

## 1. Meta Information
- **Ground Truth Version**: {result.ground_truth_version}
- **Pipeline Version**: {result.pipeline_version}
- **Git Commit**: {result.git_commit}
- **Processing Time**: {result.processing_time_ms} ms
- **Peak Memory**: {result.peak_memory_kb} KB
- **Overall Result**: {'PASS' if result.is_production_acceptable else 'FAIL'}

## 2. Failure Categories
{'- None' if not result.failure_categories else chr(10).join([f'- {f}' for f in result.failure_categories])}

## 3. Core Questions Answered
**1. How many plots were detected correctly?**
- {result.plots.matched_count} out of {result.plots.ground_truth_count} ground truth plots were matched (IoU >= 0.5).

**2. Which plots were wrong?**
- Mean IoU for matched plots: {result.plots.mean_iou}
- Median IoU for matched plots: {result.plots.median_iou}

**3. Which plots were missing?**
- Missing plots count: {result.plots.missing_count}

**4. Which plots were merged?**
- Merged plots count: {result.plots.merged_count}

**5. How accurate are polygon shapes?**
- Boundary IoU: {result.geometry.boundary_iou}
- Plot Centroid Error (mean): {result.plots.mean_centroid_error}

**6. How accurate are areas?**
- Plot Area Relative Error (mean %): {result.plots.mean_area_error_percent}
- Boundary Area Relative Error (%): {result.geometry.boundary_area_error_percent}

**7. How accurate are roads?**
- Road Topology Overlap IoU: {result.roads.road_overlap_iou}
- Road Length Error (%): {result.roads.length_error_percent}

**8. How accurate is OCR?**
- Recall: {result.ocr.recall}
- Precision: {result.ocr.precision}
- F1 Score: {result.ocr.f1_score}
- Mean Levenshtein Distance: {result.ocr.mean_levenshtein_distance}
- Word Error Rate: {result.ocr.wer}

**9. Which pipeline stage is responsible for failures?**
```json
{json.dumps(result.stage_evidence, indent=2)}
```

**10. Is this layout production-acceptable?**
- {'YES' if result.is_production_acceptable else 'NO, failed on configured thresholds.'}

"""
        md_path = output_dir / "BENCHMARK_REPORT.md"
        md_path.write_text(md_content, encoding="utf-8")
        return md_path

report_generator_instance = ReportGenerator()
