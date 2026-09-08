import logging
import statistics
import math
from typing import Dict, Any, List
from shapely.geometry import Polygon
from shapely.validation import make_valid
from app.engine.geometry_engine import geometry_engine_instance
from app.services.benchmark.schemas import PlotMetrics

logger = logging.getLogger(__name__)

class PlotMetricsEvaluator:
    def _create_geom(self, p: Dict[str, Any]) -> Polygon:
        poly_dict = geometry_engine_instance.analyze_polygon(p["polygon"])
        geom = Polygon(poly_dict["vertices"])
        if not geom.is_valid:
            geom = make_valid(geom)
        return geom

    def evaluate(self, gt_plots: List[Dict[str, Any]], pred_plots: List[Dict[str, Any]], iou_threshold: float = 0.5) -> PlotMetrics:
        gt_geoms = [self._create_geom(p) for p in gt_plots]
        pred_geoms = [self._create_geom(p) for p in pred_plots]
        
        gt_matched = set()
        pred_matched = set()
        
        ious = []
        centroid_errors = []
        area_errors = []
        
        # Greedy matching by max IoU
        for i, gt in enumerate(gt_geoms):
            best_iou = 0.0
            best_j = -1
            
            for j, pred in enumerate(pred_geoms):
                if j in pred_matched:
                    continue
                    
                inter = gt.intersection(pred).area
                union = gt.union(pred).area
                iou = inter / union if union > 0 else 0.0
                
                if iou > best_iou:
                    best_iou = iou
                    best_j = j
                    
            if best_iou >= iou_threshold and best_j != -1:
                gt_matched.add(i)
                pred_matched.add(best_j)
                ious.append(best_iou)
                
                # Centroid error
                cx_gt, cy_gt = gt.centroid.x, gt.centroid.y
                cx_pr, cy_pr = pred_geoms[best_j].centroid.x, pred_geoms[best_j].centroid.y
                dist = math.sqrt((cx_gt - cx_pr)**2 + (cy_gt - cy_pr)**2)
                centroid_errors.append(dist)
                
                # Area error
                area_gt = gt.area
                area_pr = pred_geoms[best_j].area
                err = abs(area_gt - area_pr) / area_gt * 100.0 if area_gt > 0 else 0.0
                area_errors.append(err)

        missing_count = len(gt_plots) - len(gt_matched)
        extra_count = len(pred_plots) - len(pred_matched)
        
        # Simple heuristic for merged/duplicated
        merged_count = 0
        if len(pred_plots) < len(gt_plots) and extra_count == 0 and missing_count > 0:
            merged_count = missing_count
            
        duplicated_count = 0
        if len(pred_plots) > len(gt_plots) and missing_count == 0 and extra_count > 0:
            duplicated_count = extra_count

        return PlotMetrics(
            ground_truth_count=len(gt_plots),
            predicted_count=len(pred_plots),
            matched_count=len(gt_matched),
            missing_count=missing_count,
            extra_count=extra_count,
            merged_count=merged_count,
            duplicated_count=duplicated_count,
            mean_iou=round(statistics.mean(ious) if ious else 0.0, 4),
            median_iou=round(statistics.median(ious) if ious else 0.0, 4),
            mean_centroid_error=round(statistics.mean(centroid_errors) if centroid_errors else 0.0, 4),
            mean_area_error_percent=round(statistics.mean(area_errors) if area_errors else 0.0, 2)
        )

plot_metrics_evaluator_instance = PlotMetricsEvaluator()
