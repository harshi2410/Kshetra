import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.layout_generator.land_parser import LandParser, Point
from app.engine.layout_generator.road_network_generator import RoadNetworkGenerator
from app.engine.layout_generator.amenity_placer import AmenityPlacer
from app.engine.layout_generator.plot_subdivider import PlotSubdivider
from app.engine.layout_generator.layout_evaluator import LayoutEvaluator
from app.engine.layout_generator.layout_optimizer import LayoutOptimizer
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine


def test_usable_land_and_layout_generation():
    engine = LayoutGeneratorEngine()

    # 1. Test rectangular 400x250 ft layout generation
    variants = engine.generate_all_variants(
        length_ft=400.0,
        breadth_ft=250.0,
        target_plot_sqft=1200.0,
        road_width_ft=30.0,
        garden_percentage=10.0,
        base_rate_per_sqft=3000.0
    )

    assert len(variants) >= 3, f"Expected at least 3 variants, got {len(variants)}"

    for v in variants:
        assert v.total_plots > 0, f"Variant {v.strategy_name} generated 0 plots"
        assert v.land.total_area_sqft == 100000.0
        assert v.total_plot_area > 0
        assert v.total_road_area > 0
        assert v.total_amenity_area > 0
        assert 0.0 < v.utilization_percent < 100.0

        # Verify evaluation
        assert "compositeScore" in v.evaluation
        assert 0.0 <= v.evaluation["compositeScore"] <= 100.0
        assert "compliance" in v.evaluation
        assert "utilizationScore" in v.evaluation
        assert "accessibilityScore" in v.evaluation

        # Invariant: Every plot is strictly inside the land boundary
        land_poly = v.land.shapely_polygon
        for p in v.plots:
            assert len(p.polygon) >= 3
            assert p.area_sqft >= 300.0
            assert p.width_ft >= 10.0
            assert p.depth_ft >= 10.0
            assert p.facing in ["NORTH", "SOUTH", "EAST", "WEST"]
            assert p.road_name is not None

            # Verify plot centroid is within land polygon
            from shapely.geometry import Point as SPoint
            pt = SPoint(p.centroid.x, p.centroid.y)
            assert land_poly.buffer(1.0).contains(pt), f"Plot {p.plot_number} centroid outside land boundary!"

        # Verify SVG generated
        svg = v.to_svg()
        assert "<svg" in svg and "</svg>" in svg
        assert "landos-plot" in svg


def test_irregular_polygon_boundary():
    engine = LayoutGeneratorEngine()

    # Irregular 5-sided polygon
    irregular_verts = [
        [0.0, 0.0],
        [350.0, 30.0],
        [300.0, 260.0],
        [80.0, 280.0],
        [0.0, 150.0]
    ]

    variants = engine.generate_all_variants(
        length_ft=350.0,
        breadth_ft=280.0,
        polygon_vertices=irregular_verts,
        target_plot_sqft=1200.0,
        road_width_ft=28.0,
        garden_percentage=8.0
    )

    assert len(variants) >= 2
    for v in variants:
        assert v.total_plots > 0
        # Check all plots remain inside irregular polygon
        land_poly = v.land.shapely_polygon
        from shapely.geometry import Point as SPoint
        for p in v.plots:
            pt = SPoint(p.centroid.x, p.centroid.y)
            assert land_poly.buffer(2.0).contains(pt)


if __name__ == "__main__":
    test_usable_land_and_layout_generation()
    test_irregular_polygon_boundary()
    print("ALL LAYOUT GENERATOR AND EVALUATION TESTS PASSED SUCCESSFULLY!")
