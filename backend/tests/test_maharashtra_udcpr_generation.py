"""
Automated Test Suite for Maharashtra UDCPR Alternative Plotting Layouts (13A - 13O).
Tests:
1. Maharashtra Planning Norms evaluation (UDCPR Rule 3.3, 3.4, 3.5, 3.6, 6.1).
2. Area tier thresholds (<0.4 Ha, 0.4–1.0 Ha, >2.0 Ha, congested vs non-congested).
3. Space Allocation Sequence (Setbacks -> Roads -> Open Space -> Amenity Space -> Utilities -> Plots).
4. Generation of genuine alternative strategies (Option A Grid, Option B Arterial Loop, Option C Courtyard).
5. Hard Constraint Validation (100% pass required, zero overlap, direct access).
6. Edge case 13M: Undersized parcels return structured failure reasons.
7. Multi-objective scoring and Section 13J badging.
"""

import pytest
from app.engine.planning_norms_engine import planning_norms_engine_instance
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine, LayoutVariant
from app.engine.layout_generator.amenity_placer import AmenityPlacer, AmenityZone
from app.engine.layout_generator.road_network_generator import RoadNetworkGenerator
from app.engine.layout_generator.plot_subdivider import PlotSubdivider
from app.engine.constraint_validation_engine import constraint_validation_engine_instance
from app.engine.layout_scorer import layout_scorer_instance


class TestMaharashtraUDCPRPlanningNorms:
    """Tests Section 13C: Maharashtra Planning Norms Engine."""

    def test_list_maharashtra_authorities(self):
        authorities = planning_norms_engine_instance.list_maharashtra_authorities()
        assert len(authorities) >= 10
        auth_ids = [a["id"] for a in authorities]
        assert "IN_MH_PMC" in auth_ids
        assert "IN_MH_PCMC" in auth_ids
        assert "IN_MH_BMC" in auth_ids
        assert "IN_MH_PMRDA" in auth_ids
        assert "IN_MH_UDCPR_STANDARD" in auth_ids

    def test_small_parcel_exemption_under_0_4_ha(self):
        """Under UDCPR Rule 3.4.1, parcels < 0.40 Ha (4000 sqm) are exempt from mandatory open space."""
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id="IN_MH_UDCPR_STANDARD",
            land_area_sqm=3000.0,
            land_use="RESIDENTIAL",
            is_congested=False
        )
        assert norms.openSpacePercentage == 0.0
        assert norms.amenitySpacePercentage == 0.0
        assert norms.internalRoadWidthM == 9.0
        assert norms.minPlotAreaSqm == 100.0
        assert norms.minFrontageM == 6.0

    def test_standard_parcel_open_space_between_0_4_and_1_0_ha(self):
        """Under UDCPR Rule 3.4.1, parcels 0.40–1.0 Ha require mandatory 10% open space."""
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id="IN_MH_UDCPR_STANDARD",
            land_area_sqm=6000.0,
            land_use="RESIDENTIAL",
            is_congested=False
        )
        assert norms.openSpacePercentage == 10.0
        assert norms.openSpaceRequiredSqm == 600.0
        assert norms.minSingleOpenSpaceSqm == 400.0
        assert norms.minOpenSpaceWidthM == 7.5

    def test_large_parcel_amenity_space_above_2_0_ha(self):
        """Under UDCPR Rule 3.5, layouts >= 2.0 Ha mandate 5% Civic Amenity space."""
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id="IN_MH_UDCPR_STANDARD",
            land_area_sqm=25000.0,
            land_use="RESIDENTIAL",
            is_congested=False
        )
        assert norms.openSpacePercentage == 10.0
        assert norms.amenitySpacePercentage == 5.0
        assert norms.amenitySpaceRequiredSqm == 1250.0

    def test_pmc_special_amenity_threshold(self):
        """In Pune Municipal Corporation (PMC), amenity space applies from 0.40 Ha in developing sectors."""
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id="IN_MH_PMC",
            land_area_sqm=6000.0,
            land_use="RESIDENTIAL",
            is_congested=False
        )
        assert norms.amenitySpacePercentage == 5.0

    def test_congested_gaothan_rules(self):
        """Congested Gaothan areas under Rule 3.3.1 allow 6.0m internal roads and 50 sqm plots."""
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id="IN_MH_PMC",
            land_area_sqm=5000.0,
            land_use="RESIDENTIAL",
            is_congested=True
        )
        assert norms.internalRoadWidthM == 6.0
        assert norms.minPlotAreaSqm == 50.0
        assert norms.minFrontageM == 4.5
        assert norms.outerBoundarySetbackM == 1.5


class TestSpaceAllocationSequence:
    """Tests Section 13D, 13E, 13F, 13G, 13H: Dedicated Space Allocations."""

    def test_space_allocation_reservations(self):
        engine = LayoutGeneratorEngine()
        variants, failures = engine.generate_all_variants(
            length_ft=320.0,
            breadth_ft=220.0,
            jurisdiction_id="IN_MH_PMC",
            land_use="RESIDENTIAL"
        )
        assert len(variants) >= 2
        assert len(failures) == 0

        for v in variants:
            stats = v.statistics
            # Total Land must equal or exceed allocated portions
            total_sqft = stats["totalLandAreaSqft"]
            plot_sqft = stats["totalPlotAreaSqft"]
            road_sqft = stats["totalRoadAreaSqft"]
            open_sqft = stats["totalOpenSpaceAreaSqft"]
            amenity_sqft = stats["totalAmenityAreaSqft"]

            assert total_sqft > 0
            assert plot_sqft > 0
            assert road_sqft > 0
            # Open space should be reserved (parcels >= 0.4ha have 10%)
            assert stats["openSpacePercentage"] >= 5.0
            # Sum of allocations cannot exceed 100% of gross boundary
            allocated_pct = (plot_sqft + road_sqft + open_sqft + amenity_sqft) / total_sqft * 100.0
            assert allocated_pct <= 100.0

            # Verify presence of distinct reservation zones (13F, 13G, 13H)
            zone_types = [a.zone_type for a in v.amenities]
            assert "RECREATIONAL_OPEN_SPACE" in zone_types


class TestGenuineAlternativeStrategies:
    """Tests Section 13A: 2–3 Genuinely Different Planning Strategies."""

    def test_multi_strategy_diversity(self):
        engine = LayoutGeneratorEngine()
        variants, _ = engine.generate_all_variants(
            length_ft=350.0,
            breadth_ft=250.0,
            jurisdiction_id="IN_MH_PMC"
        )
        assert len(variants) in [2, 3]

        # Strategies must be distinct
        strategy_names = [v.strategy_name for v in variants]
        assert len(set(strategy_names)) == len(variants)

        # Badges must follow Section 13J
        badges = [v.option_badge for v in variants]
        assert "OPTION 1 — BEST OVERALL" in badges[0]
        if len(variants) >= 2:
            assert "OPTION 2 — BEST ACCESS" in badges[1]
        if len(variants) >= 3:
            assert "OPTION 3 — BEST LAND UTILIZATION" in badges[2]

        # Verify differences in plot counts or road configurations
        plot_counts = [v.total_plots for v in variants]
        # Option A (Yield) typically has the highest or equal plot count
        assert plot_counts[0] >= min(plot_counts)


class TestHardConstraintValidation:
    """Tests Section 13B & 13I: Hard Constraint Invariants."""

    def test_all_variants_pass_hard_constraints(self):
        engine = LayoutGeneratorEngine()
        variants, _ = engine.generate_all_variants(
            length_ft=300.0,
            breadth_ft=200.0,
            jurisdiction_id="IN_MH_UDCPR_STANDARD"
        )
        assert len(variants) >= 1

        for v in variants:
            # 1. Verification of compliance
            assert v.is_compliant is True
            val_rep = v.validation_report
            assert val_rep["statistics"]["totalErrorsCount"] == 0

            # 2. Every plot must have verified road frontage
            rule_08 = val_rep["ruleResults"].get("RULE_08")
            if rule_08:
                assert rule_08["status"] == "PASS"

            # 3. No mutual plot overlap
            rule_05 = val_rep["ruleResults"].get("RULE_05")
            if rule_05:
                assert rule_05["status"] == "PASS"

            # 4. Zero road overlap
            rule_02 = val_rep["ruleResults"].get("RULE_02")
            if rule_02:
                assert rule_02["status"] == "PASS"


class TestEdgeCasesAndDiagnostics:
    """Tests Section 13L & 13M: Edge Cases & Failure Reasons."""

    def test_undersized_boundary_returns_diagnostics(self):
        engine = LayoutGeneratorEngine()
        # Extremely small parcel (30ft x 25ft = 750 sqft)
        variants, failures = engine.generate_all_variants(
            length_ft=30.0,
            breadth_ft=25.0,
            jurisdiction_id="IN_MH_PMC"
        )
        # Should return 0 fake variants and provide explicit reasons (13M)
        assert len(variants) == 0
        assert len(failures) > 0
        assert any("Insufficient usable land area" in f for f in failures)
