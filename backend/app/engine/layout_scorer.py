"""
Multi-Objective Layout Scorer & Ranking Engine (Phase 11).
Computes a mathematically rigorous composite objective score across 6 criteria:
Composite Score = w1·U + w2·A + w3·R + w4·N + w5·B - w6·V

Where:
- U: Land Area Utilization (Total Plot Area / Gross Land Area)
- A: Road Accessibility Index (Road frontage compliance rate)
- R: Plot Regularity & Aspect Ratio Compliance (1:1 to 1:2.5 aspect ratio)
- N: Normalized Plot Yield (Yield efficiency per gross acre)
- B: Boundary Envelope Fit (Coverage of the buildable envelope)
- V: Constraint Penalty (Deductions for geometric errors/warnings)
"""

import math
import logging
from typing import Dict, Any, List, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.ops import unary_union

logger = logging.getLogger(__name__)


class LayoutScoreBreakdown:
    """Detailed mathematical breakdown of layout objective scores."""

    def __init__(
        self,
        composite_score: float,
        utilization_score: float,
        accessibility_score: float,
        shape_regularity_score: float,
        yield_score: float,
        boundary_fit_score: float,
        violation_penalty: float,
        actual_utilization_pct: float,
        actual_accessibility_pct: float,
        actual_green_pct: float,
        plot_to_road_ratio: float,
        rank: int = 1,
    ):
        self.composite_score = composite_score
        self.utilization_score = utilization_score
        self.accessibility_score = accessibility_score
        self.shape_regularity_score = shape_regularity_score
        self.yield_score = yield_score
        self.boundary_fit_score = boundary_fit_score
        self.violation_penalty = violation_penalty
        self.actual_utilization_pct = actual_utilization_pct
        self.actual_accessibility_pct = actual_accessibility_pct
        self.actual_green_pct = actual_green_pct
        self.plot_to_road_ratio = plot_to_road_ratio
        self.rank = rank

    def to_dict(self) -> Dict[str, Any]:
        return {
            "compositeScore": round(self.composite_score, 1),
            "utilizationScore": round(self.utilization_score, 1),
            "accessibilityScore": round(self.accessibility_score, 1),
            "shapeRegularityScore": round(self.shape_regularity_score, 1),
            "greenComplianceScore": round(self.actual_green_pct * 10.0, 1),
            "yieldScore": round(self.yield_score, 1),
            "boundaryFitScore": round(self.boundary_fit_score, 1),
            "violationPenalty": round(self.violation_penalty, 1),
            "rank": self.rank,
            "weights": {
                "utilization": 0.28,
                "accessibility": 0.24,
                "shapeRegularity": 0.16,
                "yieldEfficiency": 0.16,
                "boundaryFit": 0.16,
                "penaltyMultiplier": 1.0,
            },
            "subScores": {
                "utilizationScore": round(self.utilization_score, 1),
                "accessibilityScore": round(self.accessibility_score, 1),
                "shapeRegularityScore": round(self.shape_regularity_score, 1),
                "yieldScore": round(self.yield_score, 1),
                "boundaryFitScore": round(self.boundary_fit_score, 1),
                "violationPenalty": round(self.violation_penalty, 1),
            },
            "metrics": {
                "actualUtilizationPercent": round(self.actual_utilization_pct, 1),
                "actualAccessibilityPercent": round(self.actual_accessibility_pct, 1),
                "actualGreenPercent": round(self.actual_green_pct, 1),
                "plotToRoadRatio": round(self.plot_to_road_ratio, 2),
            }
        }


class LayoutScorer:
    """
    Multi-Objective Layout Scorer Singleton.
    Scores and ranks candidate layouts for academic benchmarks and civil compliance.
    """

    # Multi-Objective Weights
    WEIGHT_UTILIZATION = 0.28
    WEIGHT_ACCESSIBILITY = 0.24
    WEIGHT_REGULARITY = 0.16
    WEIGHT_YIELD = 0.16
    WEIGHT_BOUNDARY_FIT = 0.16

    @classmethod
    def score_layout(
        cls,
        gross_land_area_sqft: float,
        plots: List[Any],
        roads: Optional[List[Any]] = None,
        green_spaces: Optional[List[Any]] = None,
        buildable_area_sqft: Optional[float] = None,
        validation_report: Optional[Dict[str, Any]] = None,
        target_plot_sqft: float = 1200.0,
        target_garden_pct: float = 10.0,
    ) -> LayoutScoreBreakdown:
        """
        Computes composite multi-objective score.
        """
        plots_list = plots or []
        roads_list = roads or []
        green_list = green_spaces or []

        total_plot_area = 0.0
        regular_plots_count = 0
        accessible_plots_count = 0

        for p in plots_list:
            if isinstance(p, dict):
                area = float(p.get("areaSqft", p.get("area", 0.0)))
                w = float(p.get("widthFt", 30.0))
                d = float(p.get("depthFt", 40.0))
                has_road = bool(p.get("roadName") or p.get("nearestRoadId"))
            else:
                area = float(getattr(p, "area_sqft", 0.0))
                w = float(getattr(p, "width_ft", 30.0))
                d = float(getattr(p, "depth_ft", 40.0))
                has_road = bool(getattr(p, "road_name", ""))

            total_plot_area += area
            if has_road and w >= 15.0:
                accessible_plots_count += 1

            # Aspect ratio regularity (1:1 to 1:2.5 is ideal)
            aspect = max(w / max(1.0, d), d / max(1.0, w))
            if aspect <= 2.5:
                regular_plots_count += 1.0
            elif aspect <= 3.5:
                regular_plots_count += 0.5

        total_road_area = 0.0
        for r in roads_list:
            if isinstance(r, dict):
                total_road_area += float(r.get("areaSqft", r.get("area", 0.0)))
            else:
                total_road_area += float(getattr(r, "area_sqft", 0.0))

        total_green_area = 0.0
        for g in green_list:
            if isinstance(g, dict):
                total_green_area += float(g.get("areaSqft", g.get("area", 0.0)))
            else:
                total_green_area += float(getattr(g, "area_sqft", 0.0))

        gross = max(1.0, gross_land_area_sqft)
        n_plots = max(1, len(plots_list))

        # 1. Utilization Score (U): Target 50% - 65%
        util_pct = (total_plot_area / gross) * 100.0
        if 50.0 <= util_pct <= 65.0:
            u_score = 100.0
        elif util_pct < 50.0:
            u_score = max(0.0, (util_pct / 50.0) * 100.0)
        else:
            u_score = max(50.0, 100.0 - (util_pct - 65.0) * 2.5)

        # 2. Road Accessibility Score (A)
        access_pct = (accessible_plots_count / n_plots) * 100.0
        a_score = access_pct

        # 3. Shape Regularity Score (R)
        r_score = (regular_plots_count / n_plots) * 100.0

        # 4. Normalized Yield Efficiency (N)
        # Theoretical max plots = (gross * 0.60) / target_plot_sqft
        theoretical_yield = max(1.0, (gross * 0.60) / max(100.0, target_plot_sqft))
        actual_yield = len(plots_list)
        yield_ratio = min(1.2, actual_yield / theoretical_yield)
        n_score = min(100.0, yield_ratio * 100.0)

        # 5. Boundary Fit Score (B)
        # Buildable area utilization
        buildable = buildable_area_sqft if (buildable_area_sqft and buildable_area_sqft > 0) else (gross * 0.75)
        fit_pct = (total_plot_area / buildable) * 100.0 if buildable > 0 else 0.0
        b_score = min(100.0, max(0.0, fit_pct * 1.25))

        # 6. Violation Penalty (V)
        penalty = 0.0
        if validation_report:
            errors = validation_report.get("statistics", {}).get("totalErrorsCount", 0)
            warnings = validation_report.get("statistics", {}).get("totalWarningsCount", 0)
            penalty = (errors * 15.0) + (warnings * 3.0)

        # Weighted Composite Score
        composite = (
            cls.WEIGHT_UTILIZATION * u_score +
            cls.WEIGHT_ACCESSIBILITY * a_score +
            cls.WEIGHT_REGULARITY * r_score +
            cls.WEIGHT_YIELD * n_score +
            cls.WEIGHT_BOUNDARY_FIT * b_score
        ) - penalty

        composite = max(0.0, min(100.0, composite))

        green_pct = (total_green_area / gross) * 100.0
        road_ratio = (total_plot_area / max(1.0, total_road_area))

        return LayoutScoreBreakdown(
            composite_score=composite,
            utilization_score=u_score,
            accessibility_score=a_score,
            shape_regularity_score=r_score,
            yield_score=n_score,
            boundary_fit_score=b_score,
            violation_penalty=penalty,
            actual_utilization_pct=util_pct,
            actual_accessibility_pct=access_pct,
            actual_green_pct=green_pct,
            plot_to_road_ratio=road_ratio,
        )

    @classmethod
    def rank_variants(cls, variants: List[Any], gross_land_area_sqft: float) -> List[Any]:
        """Ranks multiple layout variants in descending order of composite score."""
        for v in variants:
            # Check if evaluation is present
            eval_dict = getattr(v, "evaluation", {}) or {}
            score = eval_dict.get("compositeScore")
            if score is None:
                breakdown = cls.score_layout(
                    gross_land_area_sqft=gross_land_area_sqft,
                    plots=getattr(v, "plots", []),
                    roads=getattr(v, "road_network", {}).roads if hasattr(getattr(v, "road_network", {}), "roads") else [],
                    green_spaces=getattr(v, "amenities", []),
                )
                if hasattr(v, "evaluation"):
                    v.evaluation = breakdown.to_dict()

        variants.sort(key=lambda v: (getattr(v, "evaluation", {}) or {}).get("compositeScore", 0.0), reverse=True)
        for idx, v in enumerate(variants, start=1):
            if hasattr(v, "variant_number"):
                v.variant_number = idx
            if hasattr(v, "evaluation") and isinstance(v.evaluation, dict):
                v.evaluation["rank"] = idx

        return variants


layout_scorer_instance = LayoutScorer()
