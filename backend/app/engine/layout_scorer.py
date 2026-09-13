"""
Multi-Objective Layout Scorer & Ranking Engine (13I & 13J).
Computes a mathematically rigorous multi-objective score across civil criteria:
Overall Score =
    Compliance Score
  + Accessibility Score
  + Plot Practicality Score
  + Land Utilization Score
  + Road Efficiency Score
  + Open/Amenity Space Quality
  - Violations Penalty
  - Unusable Residual Land Penalty

Assigns official option badges:
- OPTION 1 — BEST OVERALL
- OPTION 2 — BEST ACCESS
- OPTION 3 — BEST LAND UTILIZATION / BALANCED AMENITY
"""

import math
import logging
from typing import Dict, Any, List, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.ops import unary_union

logger = logging.getLogger(__name__)

SQFT_TO_SQM = 0.09290304


class LayoutScoreBreakdown:
    """Detailed mathematical breakdown of layout objective scores."""

    def __init__(
        self,
        composite_score: float,
        compliance_score: float,
        utilization_score: float,
        accessibility_score: float,
        shape_regularity_score: float,
        road_efficiency_score: float,
        open_space_quality_score: float,
        yield_score: float,
        boundary_fit_score: float,
        violation_penalty: float,
        residual_penalty: float,
        actual_utilization_pct: float,
        actual_accessibility_pct: float,
        actual_green_pct: float,
        actual_amenity_pct: float,
        plot_to_road_ratio: float,
        option_badge: str = "OPTION 1 — BEST OVERALL",
        is_compliant: bool = True,
        rank: int = 1,
    ):
        self.composite_score = composite_score
        self.compliance_score = compliance_score
        self.utilization_score = utilization_score
        self.accessibility_score = accessibility_score
        self.shape_regularity_score = shape_regularity_score
        self.road_efficiency_score = road_efficiency_score
        self.open_space_quality_score = open_space_quality_score
        self.yield_score = yield_score
        self.boundary_fit_score = boundary_fit_score
        self.violation_penalty = violation_penalty
        self.residual_penalty = residual_penalty
        self.actual_utilization_pct = actual_utilization_pct
        self.actual_accessibility_pct = actual_accessibility_pct
        self.actual_green_pct = actual_green_pct
        self.actual_amenity_pct = actual_amenity_pct
        self.plot_to_road_ratio = plot_to_road_ratio
        self.option_badge = option_badge
        self.is_compliant = is_compliant
        self.rank = rank

    def to_dict(self) -> Dict[str, Any]:
        return {
            "compositeScore": round(self.composite_score, 1),
            "optionBadge": self.option_badge,
            "isCompliant": self.is_compliant,
            "complianceStatus": "PASS" if self.is_compliant else "FAIL",
            "complianceScore": round(self.compliance_score, 1),
            "utilizationScore": round(self.utilization_score, 1),
            "accessibilityScore": round(self.accessibility_score, 1),
            "plotPracticalityScore": round(self.shape_regularity_score, 1),
            "roadEfficiencyScore": round(self.road_efficiency_score, 1),
            "openSpaceQualityScore": round(self.open_space_quality_score, 1),
            "yieldScore": round(self.yield_score, 1),
            "boundaryFitScore": round(self.boundary_fit_score, 1),
            "subScores": {
                "complianceScore": round(self.compliance_score, 1),
                "utilizationScore": round(self.utilization_score, 1),
                "accessibilityScore": round(self.accessibility_score, 1),
                "plotPracticalityScore": round(self.shape_regularity_score, 1),
                "roadEfficiencyScore": round(self.road_efficiency_score, 1),
                "openSpaceQualityScore": round(self.open_space_quality_score, 1),
                "yieldScore": round(self.yield_score, 1),
                "boundaryFitScore": round(self.boundary_fit_score, 1),
            },
            "violationPenalty": round(self.violation_penalty, 1),
            "residualPenalty": round(self.residual_penalty, 1),
            "rank": self.rank,
            "weights": {
                "compliance": 0.25,
                "accessibility": 0.20,
                "plotPracticality": 0.15,
                "landUtilization": 0.15,
                "roadEfficiency": 0.15,
                "openSpaceQuality": 0.10,
            },
            "metrics": {
                "actualUtilizationPercent": round(self.actual_utilization_pct, 1),
                "actualAccessibilityPercent": round(self.actual_accessibility_pct, 1),
                "actualGreenPercent": round(self.actual_green_pct, 1),
                "actualAmenityPercent": round(self.actual_amenity_pct, 1),
                "plotToRoadRatio": round(self.plot_to_road_ratio, 2),
            }
        }


class LayoutScorer:
    """
    Multi-Objective Layout Scorer Singleton (13I).
    Scores and ranks candidate layouts for civil engineering compliance and quality.
    """

    # Multi-Objective Weights
    WEIGHT_COMPLIANCE = 0.25
    WEIGHT_ACCESSIBILITY = 0.20
    WEIGHT_PRACTICALITY = 0.15
    WEIGHT_UTILIZATION = 0.15
    WEIGHT_ROAD_EFFICIENCY = 0.15
    WEIGHT_OPEN_SPACE = 0.10

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
        Computes composite multi-objective score based on Section 13I.
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

            # Aspect ratio regularity (1:1 to 1:2.5 is ideal for residential)
            aspect = max(w / max(1.0, d), d / max(1.0, w))
            if aspect <= 2.2:
                regular_plots_count += 1.0
            elif aspect <= 3.0:
                regular_plots_count += 0.6
            else:
                regular_plots_count += 0.2

        total_road_area = 0.0
        for r in roads_list:
            if isinstance(r, dict):
                total_road_area += float(r.get("areaSqft", r.get("area", 0.0)))
            else:
                total_road_area += float(getattr(r, "area_sqft", 0.0))

        total_open_space_area = 0.0
        total_amenity_area = 0.0
        for g in green_list:
            if isinstance(g, dict):
                g_area = float(g.get("areaSqft", g.get("area", 0.0)))
                g_type = g.get("type", "")
            else:
                g_area = float(getattr(g, "area_sqft", 0.0))
                g_type = getattr(g, "zone_type", "")

            if "AMENITY" in g_type:
                total_amenity_area += g_area
            else:
                total_open_space_area += g_area

        gross = max(1.0, gross_land_area_sqft)
        n_plots = max(1, len(plots_list))

        # 1. Compliance Score (100 if no errors, heavy deduction if errors)
        is_compliant = True
        violation_penalty = 0.0
        compliance_score = 100.0
        if validation_report:
            errors = validation_report.get("statistics", {}).get("totalErrorsCount", 0)
            warnings = validation_report.get("statistics", {}).get("totalWarningsCount", 0)
            if errors > 0:
                is_compliant = False
                compliance_score = max(0.0, 100.0 - (errors * 40.0))
                violation_penalty = (errors * 35.0) + (warnings * 2.0)
            else:
                compliance_score = max(70.0, 100.0 - (warnings * 3.0))
                violation_penalty = warnings * 2.0

        # 2. Accessibility Score (A)
        access_pct = (accessible_plots_count / n_plots) * 100.0
        accessibility_score = access_pct

        # 3. Plot Practicality / Regularity Score (R)
        plot_practicality_score = (regular_plots_count / n_plots) * 100.0

        # 4. Land Utilization Score (U): Target 50% - 65% for plotted layouts
        util_pct = (total_plot_area / gross) * 100.0
        if 50.0 <= util_pct <= 65.0:
            utilization_score = 100.0
        elif util_pct < 50.0:
            utilization_score = max(0.0, (util_pct / 50.0) * 100.0)
        else:
            utilization_score = max(50.0, 100.0 - (util_pct - 65.0) * 3.0)

        # 5. Road Efficiency Score (ratio of plot area to road area)
        road_ratio = (total_plot_area / max(1.0, total_road_area))
        if 2.0 <= road_ratio <= 3.5:
            road_efficiency_score = 100.0
        elif road_ratio < 2.0:
            road_efficiency_score = max(40.0, (road_ratio / 2.0) * 100.0)
        else:
            road_efficiency_score = max(60.0, 100.0 - (road_ratio - 3.5) * 10.0)

        # 6. Open Space & Amenity Quality Score
        green_pct = (total_open_space_area / gross) * 100.0
        amenity_pct = (total_amenity_area / gross) * 100.0
        total_public_pct = green_pct + amenity_pct
        if total_public_pct >= 10.0:
            open_space_quality_score = 100.0
        elif total_public_pct >= 5.0:
            open_space_quality_score = 75.0 + (total_public_pct - 5.0) * 5.0
        else:
            open_space_quality_score = (total_public_pct / 5.0) * 75.0

        # Residual Unusable Area Penalty
        allocated_total = total_plot_area + total_road_area + total_open_space_area + total_amenity_area
        unusable_residual = max(0.0, gross - allocated_total)
        residual_pct = (unusable_residual / gross) * 100.0
        residual_penalty = max(0.0, (residual_pct - 15.0) * 1.5) if residual_pct > 15.0 else 0.0

        # Yield & Boundary fit
        theoretical_yield = max(1.0, (gross * 0.60) / max(100.0, target_plot_sqft))
        yield_score = min(100.0, (len(plots_list) / theoretical_yield) * 100.0)
        buildable = buildable_area_sqft if (buildable_area_sqft and buildable_area_sqft > 0) else (gross * 0.75)
        fit_pct = (total_plot_area / buildable) * 100.0 if buildable > 0 else 0.0
        boundary_fit_score = min(100.0, max(0.0, fit_pct * 1.25))

        # Composite Score
        composite = (
            cls.WEIGHT_COMPLIANCE * compliance_score +
            cls.WEIGHT_ACCESSIBILITY * accessibility_score +
            cls.WEIGHT_PRACTICALITY * plot_practicality_score +
            cls.WEIGHT_UTILIZATION * utilization_score +
            cls.WEIGHT_ROAD_EFFICIENCY * road_efficiency_score +
            cls.WEIGHT_OPEN_SPACE * open_space_quality_score
        ) - violation_penalty - residual_penalty

        composite = max(0.0, min(100.0, composite))

        return LayoutScoreBreakdown(
            composite_score=composite,
            compliance_score=compliance_score,
            utilization_score=utilization_score,
            accessibility_score=accessibility_score,
            shape_regularity_score=plot_practicality_score,
            road_efficiency_score=road_efficiency_score,
            open_space_quality_score=open_space_quality_score,
            yield_score=yield_score,
            boundary_fit_score=boundary_fit_score,
            violation_penalty=violation_penalty,
            residual_penalty=residual_penalty,
            actual_utilization_pct=util_pct,
            actual_accessibility_pct=access_pct,
            actual_green_pct=green_pct,
            actual_amenity_pct=amenity_pct,
            plot_to_road_ratio=road_ratio,
            is_compliant=is_compliant,
            rank=1,
        )

    @classmethod
    def rank_and_profile_variants(cls, variants: List[Any], gross_land_area_sqft: float) -> List[Any]:
        """
        Ranks variants in descending order of composite score and assigns Section 13J option badges:
        - OPTION 1 — BEST OVERALL
        - OPTION 2 — BEST ACCESS
        - OPTION 3 — BEST LAND UTILIZATION
        """
        badges = [
            "OPTION 1 — BEST OVERALL",
            "OPTION 2 — BEST ACCESS",
            "OPTION 3 — BEST LAND UTILIZATION"
        ]

        # Sort variants by composite score descending
        variants.sort(
            key=lambda v: (getattr(v, "evaluation", {}) or {}).get("compositeScore", 0.0),
            reverse=True
        )

        for idx, v in enumerate(variants):
            badge = badges[idx] if idx < len(badges) else f"OPTION {idx+1}"
            if hasattr(v, "variant_number"):
                v.variant_number = idx + 1
            if hasattr(v, "option_badge"):
                v.option_badge = badge
            if hasattr(v, "evaluation") and isinstance(v.evaluation, dict):
                v.evaluation["rank"] = idx + 1
                v.evaluation["optionBadge"] = badge

        return variants


layout_scorer_instance = LayoutScorer()
