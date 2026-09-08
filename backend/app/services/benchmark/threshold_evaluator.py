import logging
from typing import Dict, Any, Tuple
from app.services.benchmark.schemas import (
    GeometryMetrics, PlotMetrics, OCRMetrics, LabelAssociationMetrics, BenchmarkThresholds
)

logger = logging.getLogger(__name__)

class ThresholdEvaluator:
    def evaluate(self, 
                 geom_metrics: GeometryMetrics,
                 plot_metrics: PlotMetrics,
                 ocr_metrics: OCRMetrics,
                 label_metrics: LabelAssociationMetrics,
                 thresholds: BenchmarkThresholds) -> Tuple[bool, Dict[str, Any]]:
        
        stage_evidence = {}
        
        # 1. Boundary check
        boundary_pass = geom_metrics.boundary_iou >= thresholds.min_boundary_iou
        stage_evidence["boundary_evaluation"] = {
            "pass": boundary_pass,
            "measured_iou": geom_metrics.boundary_iou,
            "threshold": thresholds.min_boundary_iou
        }
        
        # 2. Plot check
        plot_pass = plot_metrics.mean_iou >= thresholds.min_plot_iou
        stage_evidence["plot_evaluation"] = {
            "pass": plot_pass,
            "measured_mean_iou": plot_metrics.mean_iou,
            "threshold": thresholds.min_plot_iou
        }
        
        # 3. OCR check
        ocr_pass = ocr_metrics.recall >= thresholds.min_ocr_recall
        stage_evidence["ocr_evaluation"] = {
            "pass": ocr_pass,
            "measured_recall": ocr_metrics.recall,
            "threshold": thresholds.min_ocr_recall
        }
        
        # 4. Label Association check
        label_pass = label_metrics.accuracy >= thresholds.min_label_association_accuracy
        stage_evidence["label_association_evaluation"] = {
            "pass": label_pass,
            "measured_accuracy": label_metrics.accuracy,
            "threshold": thresholds.min_label_association_accuracy
        }
        
        is_production_acceptable = all([boundary_pass, plot_pass, ocr_pass, label_pass])
        
        return is_production_acceptable, stage_evidence

threshold_evaluator_instance = ThresholdEvaluator()
