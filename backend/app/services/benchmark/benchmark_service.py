import time
import tracemalloc
import uuid
from pathlib import Path
import logging
from typing import Dict, Any, Optional

from app.services.benchmark.schemas import BenchmarkThresholds, BenchmarkResult
from app.services.benchmark.ground_truth_loader import ground_truth_loader_instance
from app.services.benchmark.geometry_metrics import geometry_metrics_evaluator_instance
from app.services.benchmark.plot_metrics import plot_metrics_evaluator_instance
from app.services.benchmark.road_metrics import road_metrics_evaluator_instance
from app.services.benchmark.ocr_metrics import ocr_metrics_evaluator_instance
from app.services.benchmark.label_association import label_association_evaluator_instance
from app.services.benchmark.failure_classifier import failure_classifier_instance
from app.services.benchmark.threshold_evaluator import threshold_evaluator_instance
from app.services.benchmark.report_generator import report_generator_instance

logger = logging.getLogger(__name__)

class BenchmarkService:
    def __init__(self, output_root: Path = None):
        if not output_root:
            self.output_root = Path(__file__).resolve().parent.parent.parent.parent.parent / "storage" / "benchmarks"
        else:
            self.output_root = output_root

    def evaluate_layout(self, 
                        project_id: str, 
                        predicted_model: Dict[str, Any], 
                        pipeline_version: str, 
                        git_commit: str,
                        gt_version: str = "latest",
                        thresholds: Optional[BenchmarkThresholds] = None) -> BenchmarkResult:
        
        tracemalloc.start()
        start_time = time.time()
        
        if not thresholds:
            thresholds = BenchmarkThresholds()

        # Load Ground Truth
        gt_model, gt_metadata = ground_truth_loader_instance.load_ground_truth(project_id, gt_version)
        
        actual_gt_version = gt_metadata.get("version", gt_version)
        
        # 1. Geometry Metrics (Boundary)
        geom_metrics = geometry_metrics_evaluator_instance.evaluate(
            gt_model.get("boundary", {}), 
            predicted_model.get("boundary", {})
        )
        
        # 2. Plot Metrics
        plot_metrics = plot_metrics_evaluator_instance.evaluate(
            gt_model.get("plots", []), 
            predicted_model.get("plots", [])
        )
        
        # 3. Road Metrics
        road_metrics = road_metrics_evaluator_instance.evaluate(
            gt_model.get("roads", []), 
            predicted_model.get("roads", [])
        )
        
        # 4. OCR Metrics
        ocr_metrics = ocr_metrics_evaluator_instance.evaluate(
            gt_model.get("labels", []), 
            predicted_model.get("labels", [])
        )
        
        # 5. Label Association Metrics
        label_metrics = label_association_evaluator_instance.evaluate(
            gt_model.get("labels", []), 
            predicted_model.get("labels", [])
        )
        
        # 6. Failure Classification
        failure_categories = failure_classifier_instance.classify(
            geom_metrics, plot_metrics, road_metrics, ocr_metrics, label_metrics, thresholds
        )
        
        # 7. Threshold Evaluation
        is_acceptable, stage_evidence = threshold_evaluator_instance.evaluate(
            geom_metrics, plot_metrics, ocr_metrics, label_metrics, thresholds
        )
        
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        processing_time_ms = (end_time - start_time) * 1000.0
        peak_memory_kb = peak / 1024.0
        
        result = BenchmarkResult(
            project_id=project_id,
            ground_truth_version=actual_gt_version,
            pipeline_version=pipeline_version,
            git_commit=git_commit,
            processing_time_ms=round(processing_time_ms, 2),
            peak_memory_kb=round(peak_memory_kb, 2),
            geometry=geom_metrics,
            plots=plot_metrics,
            roads=road_metrics,
            ocr=ocr_metrics,
            label_association=label_metrics,
            failure_categories=failure_categories,
            is_production_acceptable=is_acceptable,
            stage_evidence=stage_evidence
        )
        
        # Save Reports
        run_id = str(uuid.uuid4())
        run_dir = self.output_root / project_id / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        
        report_generator_instance.generate_json_report(result, run_dir)
        report_generator_instance.generate_markdown_report(result, run_dir)
        
        logger.info(f"Benchmark completed for {project_id}. Acceptable: {is_acceptable}. Run ID: {run_id}")
        return result

benchmark_service_instance = BenchmarkService()
