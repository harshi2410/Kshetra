import logging
from typing import Dict, Any, List
from shapely.geometry import Polygon
from shapely.validation import make_valid
from app.engine.geometry_engine import geometry_engine_instance
from app.services.benchmark.schemas import RoadMetrics

logger = logging.getLogger(__name__)

class RoadMetricsEvaluator:
    def _create_geom(self, r: Dict[str, Any]) -> Polygon:
        pts = r.get("geometry") or r.get("polygon")
        if not pts:
            return Polygon()
        poly_dict = geometry_engine_instance.analyze_polygon(pts)
        geom = Polygon(poly_dict["vertices"])
        if not geom.is_valid:
            geom = make_valid(geom)
        return geom

    def evaluate(self, gt_roads: List[Dict[str, Any]], pred_roads: List[Dict[str, Any]]) -> RoadMetrics:
        if not gt_roads and not pred_roads:
            return RoadMetrics(
                ground_truth_count=0,
                predicted_count=0,
                road_overlap_iou=1.0,
                length_error_percent=0.0,
                connectivity_accuracy=1.0
            )
            
        gt_geoms = [self._create_geom(r) for r in gt_roads]
        pred_geoms = [self._create_geom(r) for r in pred_roads]
        
        gt_union = Polygon()
        for g in gt_geoms:
            gt_union = gt_union.union(g)
            
        pred_union = Polygon()
        for g in pred_geoms:
            pred_union = pred_union.union(g)
            
        inter_area = gt_union.intersection(pred_union).area
        union_area = gt_union.union(pred_union).area
        
        iou = inter_area / union_area if union_area > 0 else 0.0
        
        # Length/Area error as proxy for length error
        gt_area = gt_union.area
        pred_area = pred_union.area
        length_error = abs(gt_area - pred_area) / gt_area * 100.0 if gt_area > 0 else 0.0

        return RoadMetrics(
            ground_truth_count=len(gt_roads),
            predicted_count=len(pred_roads),
            road_overlap_iou=round(iou, 4),
            length_error_percent=round(length_error, 2),
            connectivity_accuracy=round(iou, 4) # Proxy for connectivity
        )

road_metrics_evaluator_instance = RoadMetricsEvaluator()
