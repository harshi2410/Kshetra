import logging
from typing import List
from app.services.benchmark.schemas import (
    GeometryMetrics, PlotMetrics, RoadMetrics, OCRMetrics, LabelAssociationMetrics, BenchmarkThresholds
)

logger = logging.getLogger(__name__)

class FailureClassifier:
    def classify(self, 
                 geom_metrics: GeometryMetrics,
                 plot_metrics: PlotMetrics,
                 road_metrics: RoadMetrics,
                 ocr_metrics: OCRMetrics,
                 label_metrics: LabelAssociationMetrics,
                 thresholds: BenchmarkThresholds) -> List[str]:
        
        failures = []
        
        if not geom_metrics.is_valid:
            failures.append("GEOMETRY_INVALID")
            
        if geom_metrics.boundary_iou < thresholds.min_boundary_iou:
            failures.append("BROKEN_BOUNDARY")
            
        if plot_metrics.merged_count > 0:
            failures.append("MERGED_PLOTS")
            
        if plot_metrics.missing_count > 0:
            failures.append("MISSING_PLOTS")
            
        if plot_metrics.extra_count > 0:
            failures.append("EXTRA_PLOTS")
            
        if ocr_metrics.recall < thresholds.min_ocr_recall:
            failures.append("OCR_FAILURE")
            
        if road_metrics.road_overlap_iou < 0.5:
            failures.append("ROAD_FAILURE")
            
        if label_metrics.accuracy < thresholds.min_label_association_accuracy:
            failures.append("LABEL_ASSOCIATION_FAILURE")
            
        return failures

failure_classifier_instance = FailureClassifier()
