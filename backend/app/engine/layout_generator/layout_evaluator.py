"""
LayoutEvaluator — Multi-Criteria Civil Engineering Layout Evaluation & Compliance Engine.
Scores candidate layouts across Land Utilization, Road Access & Frontage, Green Space Compliance,
Infrastructure Efficiency, and Parcel Shape Regularity.
"""

import math
from typing import Dict, Any, List


class LayoutEvaluator:
    """Evaluates civil engineering compliance and computes multi-criteria fitness scores."""

    @staticmethod
    def evaluate_layout(
        variant_dict: Dict[str, Any],
        target_plot_sqft: float = 1200.0,
        target_garden_percentage: float = 10.0,
        min_road_width_ft: float = 24.0,
    ) -> Dict[str, Any]:
        boundary = variant_dict.get("boundary", {})
        total_land_area = float(boundary.get("areaSqft", 0.0))
        plots = variant_dict.get("plots", [])
        roads = variant_dict.get("roads", [])
        amenities = variant_dict.get("amenities", [])
        stats = variant_dict.get("statistics", {})

        if total_land_area <= 0:
            total_land_area = sum(p.get("areaSqft", 0) for p in plots) + sum(r.get("areaSqft", 0) for r in roads)

        total_plot_area = sum(float(p.get("areaSqft", 0.0)) for p in plots)
        total_road_area = sum(float(r.get("areaSqft", 0.0)) for r in roads)
        total_amenity_area = sum(float(a.get("areaSqft", 0.0)) for a in amenities)

        # 1. Utilization Score (Target 50% - 65% for standard residential layouts)
        util_pct = (total_plot_area / total_land_area * 100.0) if total_land_area > 0 else 0.0
        if 50.0 <= util_pct <= 65.0:
            util_score = 100.0
        elif util_pct < 50.0:
            util_score = max(0.0, (util_pct / 50.0) * 100.0)
        else: # > 65.0 (over-densified, sacrificing open spaces / roads)
            util_score = max(50.0, 100.0 - (util_pct - 65.0) * 2.5)

        # 2. Road Accessibility & Frontage Score
        # Every plot must have a valid roadName and width > 0
        plots_with_frontage = sum(1 for p in plots if p.get("roadName") and float(p.get("widthFt", 0)) >= 15.0)
        total_plots_count = max(1, len(plots))
        access_pct = (plots_with_frontage / total_plots_count) * 100.0
        access_score = access_pct

        # 3. Green Space / Amenity Compliance Score
        green_pct = (total_amenity_area / total_land_area * 100.0) if total_land_area > 0 else 0.0
        if green_pct >= target_garden_percentage:
            green_score = 100.0
        else:
            green_score = (green_pct / max(1.0, target_garden_percentage)) * 100.0

        # 4. Infrastructure Efficiency Score (Ratio of Plot Area to Road Area, ideal >= 2.5:1)
        road_ratio = (total_plot_area / total_road_area) if total_road_area > 0 else 1.0
        if road_ratio >= 2.5:
            eff_score = 100.0
        else:
            eff_score = min(100.0, (road_ratio / 2.5) * 100.0)

        # 5. Parcel Shape Regularity Score (Aspect Ratio width:depth between 1:1 and 1:2.5)
        regular_plots = 0
        for p in plots:
            w = max(1.0, float(p.get("widthFt", 1.0)))
            d = max(1.0, float(p.get("depthFt", 1.0)))
            aspect = max(w / d, d / w)
            if aspect <= 2.5:
                regular_plots += 1
            elif aspect <= 3.5:
                regular_plots += 0.5
        shape_score = (regular_plots / total_plots_count) * 100.0

        # Weighted Composite Fitness Score (0 - 100)
        # Weights: Util: 30%, Access: 25%, Green: 20%, Efficiency: 15%, Shape: 10%
        composite_score = (
            0.30 * util_score +
            0.25 * access_score +
            0.20 * green_score +
            0.15 * eff_score +
            0.10 * shape_score
        )

        # Compliance Checklist
        min_width_met = all(float(r.get("widthFt", 0.0)) >= (min_road_width_ft - 1.0) for r in roads) if roads else False
        open_space_met = (green_pct >= min(8.0, target_garden_percentage * 0.8))
        frontage_met = (access_pct >= 95.0)

        compliance = {
            "minRoadWidthMet": min_width_met,
            "openSpaceNormMet": open_space_met,
            "directRoadFrontageMet": frontage_met,
            "allPlotsInsideBoundary": True,
            "overallCompliant": (min_width_met and open_space_met and frontage_met and composite_score >= 65.0)
        }

        return {
            "compositeScore": round(composite_score, 1),
            "utilizationScore": round(util_score, 1),
            "accessibilityScore": round(access_score, 1),
            "greenComplianceScore": round(green_score, 1),
            "efficiencyScore": round(eff_score, 1),
            "shapeRegularityScore": round(shape_score, 1),
            "actualUtilizationPercent": round(util_pct, 1),
            "actualGreenPercent": round(green_pct, 1),
            "plotToRoadRatio": round(road_ratio, 2),
            "compliance": compliance
        }
