import logging
from typing import Dict, Any, Tuple
from shapely.geometry import Polygon
from shapely.validation import make_valid
from app.engine.geometry_engine import geometry_engine_instance
from app.services.benchmark.schemas import GeometryMetrics

logger = logging.getLogger(__name__)

class GeometryMetricsEvaluator:
    def evaluate(self, gt_boundary: Dict[str, Any], pred_boundary: Dict[str, Any]) -> GeometryMetrics:
        if not gt_boundary or not gt_boundary.get("geometry"):
            return GeometryMetrics(
                boundary_iou=0.0,
                boundary_area_error_percent=0.0,
                boundary_perimeter_error_percent=0.0,
                is_valid=False,
                containment_failures=0
            )

        gt_poly_dict = geometry_engine_instance.analyze_polygon(gt_boundary["geometry"])
        gt_geom = Polygon(gt_poly_dict["vertices"])
        if not gt_geom.is_valid:
            gt_geom = make_valid(gt_geom)

        if not pred_boundary or not pred_boundary.get("geometry"):
            return GeometryMetrics(
                boundary_iou=0.0,
                boundary_area_error_percent=100.0,
                boundary_perimeter_error_percent=100.0,
                is_valid=False,
                containment_failures=1
            )

        pred_poly_dict = geometry_engine_instance.analyze_polygon(pred_boundary["geometry"])
        pred_geom = Polygon(pred_poly_dict["vertices"])
        is_valid = pred_geom.is_valid
        if not is_valid:
            pred_geom = make_valid(pred_geom)

        intersection_area = gt_geom.intersection(pred_geom).area
        union_area = gt_geom.union(pred_geom).area
        iou = intersection_area / union_area if union_area > 0 else 0.0

        gt_area = gt_geom.area
        pred_area = pred_geom.area
        area_error = abs(gt_area - pred_area) / gt_area * 100.0 if gt_area > 0 else 0.0

        gt_perim = gt_geom.length
        pred_perim = pred_geom.length
        perim_error = abs(gt_perim - pred_perim) / gt_perim * 100.0 if gt_perim > 0 else 0.0

        return GeometryMetrics(
            boundary_iou=round(iou, 4),
            boundary_area_error_percent=round(area_error, 2),
            boundary_perimeter_error_percent=round(perim_error, 2),
            is_valid=is_valid,
            containment_failures=1 if iou < 0.95 else 0
        )

geometry_metrics_evaluator_instance = GeometryMetricsEvaluator()
