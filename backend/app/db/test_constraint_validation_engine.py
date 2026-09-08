"""
Tests for Constraint Validation Engine (Phase 10).
Validates 12 civil engineering rules (containment, zero road/green overlap, min plot area, etc.).
"""

import pytest
from app.engine.constraint_validation_engine import (
    ConstraintValidationEngine,
    constraint_validation_engine_instance,
    ValidationReport
)


def test_constraint_validation_passing_layout():
    """Test a valid layout where all 12 rules pass."""
    boundary = [[0.0, 0.0], [300.0, 0.0], [300.0, 200.0], [0.0, 200.0], [0.0, 0.0]]
    road = {
        "roadId": "road-01",
        "polygon": [[0.0, 85.0], [300.0, 85.0], [300.0, 115.0], [0.0, 115.0], [0.0, 85.0]],
        "widthFt": 30.0
    }
    # Plot 1: 30x40 at (10, 10 to 40, 50) - inside boundary, not on road
    plot_1 = {
        "plotId": "P-001",
        "polygon": [[10.0, 10.0], [40.0, 10.0], [40.0, 50.0], [10.0, 50.0], [10.0, 10.0]],
        "areaSqft": 1200.0,
        "widthFt": 30.0,
        "depthFt": 40.0,
        "roadName": "Main Avenue"
    }
    # Plot 2: 30x40 at (45, 10 to 75, 50)
    plot_2 = {
        "plotId": "P-002",
        "polygon": [[45.0, 10.0], [75.0, 10.0], [75.0, 50.0], [45.0, 50.0], [45.0, 10.0]],
        "areaSqft": 1200.0,
        "widthFt": 30.0,
        "depthFt": 40.0,
        "roadName": "Main Avenue"
    }

    report: ValidationReport = constraint_validation_engine_instance.validate_layout(
        boundary_polygon=boundary,
        plots=[plot_1, plot_2],
        roads=[road],
        min_plot_sqft=800.0,
        min_frontage_ft=20.0,
        min_road_width_ft=24.0,
        setback_ft=5.0
    )

    assert report.overall_compliant is True
    assert report.passed_rules_count >= 11
    assert report.compliance_percentage >= 90.0
    assert report.rule_results["RULE_01"].passed is True  # Contained in boundary
    assert report.rule_results["RULE_02"].passed is True  # Zero road overlap
    assert report.rule_results["RULE_05"].passed is True  # Zero mutual plot overlap


def test_constraint_validation_detects_violations():
    """Test that violations are caught when plots violate constraints."""
    boundary = [[0.0, 0.0], [100.0, 0.0], [100.0, 100.0], [0.0, 100.0], [0.0, 0.0]]
    road = {
        "roadId": "road-01",
        "polygon": [[0.0, 40.0], [100.0, 40.0], [100.0, 60.0], [0.0, 60.0], [0.0, 40.0]],
        "widthFt": 20.0  # narrower than standard 24ft -> RULE_12 warning/error
    }

    # Plot overflowing outside boundary and intersecting road (y = 30 to 70, overlaps road 40 to 60)
    bad_plot_1 = {
        "plotId": "BAD-001",
        "polygon": [[-20.0, 30.0], [40.0, 30.0], [40.0, 70.0], [-20.0, 70.0], [-20.0, 30.0]],
        "areaSqft": 2400.0,
        "widthFt": 60.0,
        "depthFt": 40.0,
    }

    # Plot 2 overlapping Plot 1
    bad_plot_2 = {
        "plotId": "BAD-002",
        "polygon": [[10.0, 30.0], [60.0, 30.0], [60.0, 70.0], [10.0, 70.0], [10.0, 30.0]],
        "areaSqft": 2000.0,
        "widthFt": 50.0,
        "depthFt": 40.0,
    }

    report: ValidationReport = constraint_validation_engine_instance.validate_layout(
        boundary_polygon=boundary,
        plots=[bad_plot_1, bad_plot_2],
        roads=[road],
        min_plot_sqft=800.0,
        min_frontage_ft=20.0,
        min_road_width_ft=24.0,
        setback_ft=5.0
    )

    assert report.overall_compliant is False
    assert report.rule_results["RULE_01"].passed is False  # Outside boundary detected
    assert report.rule_results["RULE_02"].passed is False  # Overlapping road detected
    assert report.rule_results["RULE_05"].passed is False  # Mutual plot overlap detected
    assert len(report.all_violations) >= 3
