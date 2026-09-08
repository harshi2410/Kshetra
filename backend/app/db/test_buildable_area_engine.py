"""
Tests for Buildable Area Engine (Phase 8).
Validates exact GEOS topological subtraction of setbacks, roads, green spaces, and obstacles.
"""

import pytest
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box
from app.engine.buildable_area_engine import (
    BuildableAreaEngine,
    buildable_area_engine_instance,
    BuildableAreaResult
)


def test_buildable_area_subtraction_basic():
    """Test basic rectangular boundary with road and setbacks subtraction."""
    # 300 x 200 ft boundary (60,000 sq ft)
    boundary = [[0.0, 0.0], [300.0, 0.0], [300.0, 200.0], [0.0, 200.0], [0.0, 0.0]]
    setback_ft = 10.0

    # Internal road corridor 30ft wide in middle (y = 85 to 115)
    road_poly = [[0.0, 85.0], [300.0, 85.0], [300.0, 115.0], [0.0, 115.0], [0.0, 85.0]]

    # Green park 50x50 at top right (x = 220 to 270, y = 130 to 180)
    green_poly = [[220.0, 130.0], [270.0, 130.0], [270.0, 180.0], [220.0, 180.0], [220.0, 130.0]]

    res: BuildableAreaResult = buildable_area_engine_instance.compute_buildable_area(
        boundary_vertices=boundary,
        setback_ft=setback_ft,
        road_polygons=[road_poly],
        green_spaces=[green_poly]
    )

    assert res.gross_area_sqft == 60000.0
    assert res.net_buildable_area_sqft > 0.0
    # Net buildable area must be strictly less than gross area
    assert res.net_buildable_area_sqft < res.gross_area_sqft
    assert res.road_area_sqft == 9000.0  # 300 * 30
    assert res.green_space_area_sqft == 2500.0  # 50 * 50
    assert len(res.blocks) >= 2  # Road splits land into at least 2 distinct blocks
    assert res.buildable_percentage > 40.0

    # Ensure to_dict and to_geojson produce valid structures
    data = res.to_dict()
    assert data["artifactType"] == "BUILDABLE_AREA"
    assert "geoJson" in data
    assert data["geoJson"]["type"] == "FeatureCollection"
    assert len(data["geoJson"]["features"]) >= 3


def test_buildable_area_irregular_polygon():
    """Test L-shaped irregular polygon boundary."""
    l_shaped_boundary = [
        [0.0, 0.0], [400.0, 0.0], [400.0, 200.0],
        [200.0, 200.0], [200.0, 400.0], [0.0, 400.0], [0.0, 0.0]
    ]
    # Gross area: (400*200) + (200*200) = 80,000 + 40,000 = 120,000 sq ft

    res = buildable_area_engine_instance.compute_buildable_area(
        boundary_vertices=l_shaped_boundary,
        setback_ft=5.0
    )

    assert abs(res.gross_area_sqft - 120000.0) < 1.0
    assert res.net_buildable_area_sqft > 100000.0
    assert len(res.blocks) >= 1
