"""
Tests for Multi-Objective Layout Scorer & Ranking Engine (Phase 11).
Validates mathematical scoring breakdown and ranking consistency.
"""

import pytest
from app.engine.layout_scorer import LayoutScorer, layout_scorer_instance, LayoutScoreBreakdown


def test_layout_scorer_computation():
    """Test composite score computation with standard plot and road inputs."""
    gross_area = 100000.0  # 100,000 sq ft

    # 40 plots of 1200 sqft each = 48,000 sqft (48% utilization)
    plots = [
        {"plotId": f"P-{i:03d}", "areaSqft": 1200.0, "widthFt": 30.0, "depthFt": 40.0, "roadName": "Main Road"}
        for i in range(1, 41)
    ]
    roads = [
        {"roadId": "R-1", "areaSqft": 18000.0, "widthFt": 30.0}
    ]
    green_spaces = [
        {"zoneId": "G-1", "areaSqft": 10000.0}
    ]

    breakdown: LayoutScoreBreakdown = layout_scorer_instance.score_layout(
        gross_land_area_sqft=gross_area,
        plots=plots,
        roads=roads,
        green_spaces=green_spaces,
    )

    assert breakdown.composite_score > 60.0
    assert breakdown.actual_utilization_pct == 48.0
    assert breakdown.actual_accessibility_pct == 100.0
    assert breakdown.actual_green_pct == 10.0
    assert breakdown.plot_to_road_ratio > 2.0

    data = breakdown.to_dict()
    assert "compositeScore" in data
    assert "subScores" in data
    assert "weights" in data
    assert "metrics" in data
