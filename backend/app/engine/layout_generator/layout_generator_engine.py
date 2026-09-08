"""
LayoutGeneratorEngine — Master Orchestrator for Multi-Alternative Layout Generation (Phases 9, 10, 11).
Generates 4 distinct, fully validated and scored civil layout design variants:
1. Orthogonal Grid Layout (Maximum Density)
2. Arterial Spine Layout (Balanced Infrastructure)
3. Perimeter Loop Layout (Open Green & Eco Focus)
4. Cluster Courtyard Layout (Premium Accessibility)

Strictly bounds all plots inside Buildable Area (Boundary - Setbacks - Roads - Amenities).
Evaluates 12 civil engineering rules via ConstraintValidationEngine and scores via LayoutScorer.
"""

import uuid
import json
import logging
from typing import List, Dict, Any, Optional

from .land_parser import LandParser, ParsedLand, Point
from .road_network_generator import RoadNetworkGenerator, RoadNetwork
from .plot_subdivider import PlotSubdivider, GeneratedPlot
from .amenity_placer import AmenityPlacer, AmenityZone
from .layout_evaluator import LayoutEvaluator
from .layout_optimizer import LayoutOptimizer
from app.engine.constraint_validation_engine import constraint_validation_engine_instance, ValidationReport
from app.engine.layout_scorer import layout_scorer_instance, LayoutScoreBreakdown
from app.engine.buildable_area_engine import buildable_area_engine_instance

logger = logging.getLogger(__name__)


class LayoutVariant:
    """A complete, validated, and evaluated civil engineering layout design variant."""

    def __init__(
        self,
        variant_id: str,
        variant_number: int,
        strategy_name: str,
        land: ParsedLand,
        road_network: RoadNetwork,
        plots: List[GeneratedPlot],
        amenities: List[AmenityZone],
        evaluation: Optional[Dict[str, Any]] = None,
        validation_report: Optional[Dict[str, Any]] = None,
    ):
        self.id = variant_id
        self.variant_number = variant_number
        self.strategy_name = strategy_name
        self.land = land
        self.road_network = road_network
        self.plots = plots
        self.amenities = amenities
        self.evaluation = evaluation or {}
        self.validation_report = validation_report or {}

    @property
    def total_plots(self) -> int:
        return len(self.plots)

    @property
    def total_plot_area(self) -> float:
        return sum(p.area_sqft for p in self.plots)

    @property
    def total_road_area(self) -> float:
        return self.road_network.total_road_area_sqft

    @property
    def total_amenity_area(self) -> float:
        return sum(a.area_sqft for a in self.amenities)

    @property
    def utilization_percent(self) -> float:
        if self.land.total_area_sqft <= 0:
            return 0.0
        return (self.total_plot_area / self.land.total_area_sqft) * 100.0

    @property
    def statistics(self) -> dict:
        total = self.land.total_area_sqft
        avg_plot = self.total_plot_area / max(1, self.total_plots)
        corner_plots = sum(1 for p in self.plots if p.is_corner)
        return {
            "totalLandAreaSqft": round(total, 2),
            "totalPlots": self.total_plots,
            "cornerPlots": corner_plots,
            "averagePlotAreaSqft": round(avg_plot, 2),
            "totalPlotAreaSqft": round(self.total_plot_area, 2),
            "totalRoadAreaSqft": round(self.total_road_area, 2),
            "totalAmenityAreaSqft": round(self.total_amenity_area, 2),
            "roadCount": len(self.road_network.roads),
            "amenityCount": len(self.amenities),
            "utilizationPercent": round(self.utilization_percent, 1),
            "roadPercentage": round((self.total_road_area / max(1, total)) * 100.0, 1),
            "amenityPercentage": round((self.total_amenity_area / max(1, total)) * 100.0, 1),
            "compositeScore": self.evaluation.get("compositeScore", 0.0),
            "evaluation": self.evaluation,
            "validationReport": self.validation_report,
        }

    def to_layout_model(self) -> dict:
        """Produce the full layout model JSON compatible with frontend viewers and exports."""
        return {
            "variantId": self.id,
            "variantNumber": self.variant_number,
            "strategyName": self.strategy_name,
            "boundary": {
                "polygon": [p.to_dict() for p in self.land.boundary_polygon],
                "areaSqft": self.land.total_area_sqft,
                "lengthFt": self.land.length_ft,
                "breadthFt": self.land.breadth_ft,
                "bbox": self.land.bbox.to_dict(),
            },
            "entryPoints": [ep.to_dict() for ep in self.land.entry_points],
            "roads": [r.to_dict() for r in self.road_network.roads],
            "plots": [p.to_dict() for p in self.plots],
            "amenities": [a.to_dict() for a in self.amenities],
            "statistics": self.statistics,
            "evaluation": self.evaluation,
            "validation": self.validation_report,
        }

    def to_svg(self) -> str:
        """Generate high-precision layered vector SVG."""
        bbox = self.land.bbox
        margin = 35.0
        min_x = bbox.min_x - margin
        min_y = bbox.min_y - margin
        width = bbox.width + 2 * margin
        height = bbox.height + 2 * margin

        svg_parts = []
        svg_parts.append(
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{min_x:.1f} {min_y:.1f} {width:.1f} {height:.1f}" '
            f'width="100%" height="100%" '
            f'style="background: #090e17; font-family: Inter, system-ui, sans-serif;">'
        )

        # Defs & Grid pattern
        svg_parts.append("""
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        """)

        # Layer 1: Boundary
        b_pts = " ".join(f"{p.x:.1f},{p.y:.1f}" for p in self.land.boundary_polygon)
        svg_parts.append(
            f'<polygon points="{b_pts}" fill="rgba(30, 41, 59, 0.6)" '
            f'stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6,4"/>'
        )

        # Layer 2: Amenities / Parks
        for a in self.amenities:
            a_pts = " ".join(f"{p.x:.1f},{p.y:.1f}" for p in a.polygon)
            svg_parts.append(
                f'<polygon points="{a_pts}" fill="rgba(16, 185, 129, 0.25)" '
                f'stroke="#10b981" stroke-width="2"/>'
            )
            c = a.centroid
            svg_parts.append(
                f'<text x="{c.x:.1f}" y="{c.y:.1f}" fill="#10b981" font-size="10" '
                f'text-anchor="middle" font-weight="600">{a.name}</text>'
            )

        # Layer 3: Roads
        for r in self.road_network.roads:
            r_pts = " ".join(f"{p.x:.1f},{p.y:.1f}" for p in r.polygon)
            svg_parts.append(
                f'<polygon points="{r_pts}" fill="rgba(51, 65, 85, 0.85)" '
                f'stroke="#64748b" stroke-width="1.5"/>'
            )

        # Layer 4: Plots
        for p in self.plots:
            p_pts = " ".join(f"{pt.x:.1f},{pt.y:.1f}" for pt in p.polygon)
            fill_color = "rgba(16, 185, 129, 0.12)" if not p.is_corner else "rgba(245, 158, 11, 0.15)"
            stroke_color = "#10b981" if not p.is_corner else "#f59e0b"
            svg_parts.append(
                f'<polygon id="{p.plot_id}" points="{p_pts}" fill="{fill_color}" '
                f'stroke="{stroke_color}" stroke-width="1.2" class="landos-plot"/>'
            )
            c = p.centroid
            svg_parts.append(
                f'<text x="{c.x:.1f}" y="{c.y - 2:.1f}" fill="#f8fafc" font-size="9" '
                f'text-anchor="middle" font-weight="bold">{p.plot_number}</text>'
            )
            svg_parts.append(
                f'<text x="{c.x:.1f}" y="{c.y + 9:.1f}" fill="#94a3b8" font-size="7.5" '
                f'text-anchor="middle">{p.area_sqft:.0f} SQFT</text>'
            )

        svg_parts.append("</svg>")
        return "".join(svg_parts)


class LayoutGeneratorEngine:
    """Master orchestrator generating 4 optimized and civilly scored design variants."""

    def generate_all_variants(
        self,
        length_ft: float = 300.0,
        breadth_ft: float = 200.0,
        polygon_vertices: Optional[List[List[float]]] = None,
        entry_edges: Optional[List[Dict[str, Any]]] = None,
        target_plot_sqft: float = 1200.0,
        road_width_ft: float = 30.0,
        garden_percentage: float = 10.0,
        base_rate_per_sqft: float = 2500.0,
        setback_ft: float = 10.0,
    ) -> List[LayoutVariant]:
        land = LandParser.parse(
            length_ft=length_ft,
            breadth_ft=breadth_ft,
            polygon_vertices=polygon_vertices,
            entry_edges=entry_edges,
        )

        strategies = [
            ("Orthogonal Grid Layout", "grid", RoadNetworkGenerator.generate_orthogonal_grid),
            ("Arterial Spine Layout", "spine", RoadNetworkGenerator.generate_arterial_spine),
            ("Perimeter Loop Layout", "loop", RoadNetworkGenerator.generate_perimeter_loop),
            ("Cluster Courtyard Layout", "cluster", RoadNetworkGenerator.generate_cluster_courtyard),
        ]

        variants: List[LayoutVariant] = []

        for idx, (name, tag, strat_fn) in enumerate(strategies, start=1):
            try:
                roads, amenities, plots, eval_base = LayoutOptimizer.optimize_variant(
                    strategy_func=strat_fn,
                    land=land,
                    target_plot_sqft=target_plot_sqft,
                    road_width_ft=road_width_ft,
                    garden_percentage=garden_percentage,
                    base_rate_per_sqft=base_rate_per_sqft,
                    max_iterations=3,
                )

                if roads and plots:
                    # 1. Run 12-rule Geometric Constraint Validation
                    val_rep: ValidationReport = constraint_validation_engine_instance.validate_layout(
                        boundary_polygon=land.boundary_polygon,
                        plots=plots,
                        roads=[r.to_dict() for r in roads.roads],
                        green_spaces=[a.to_dict() for a in amenities],
                        min_plot_sqft=target_plot_sqft * 0.75,
                        min_frontage_ft=20.0,
                        min_road_width_ft=road_width_ft * 0.8,
                        setback_ft=setback_ft,
                    )
                    val_rep_dict = val_rep.to_dict()

                    # 2. Run Multi-Objective Layout Scoring
                    scorer_res: LayoutScoreBreakdown = layout_scorer_instance.score_layout(
                        gross_land_area_sqft=land.total_area_sqft,
                        plots=plots,
                        roads=roads.roads,
                        green_spaces=amenities,
                        validation_report=val_rep_dict,
                        target_plot_sqft=target_plot_sqft,
                        target_garden_pct=garden_percentage,
                    )
                    evaluation_dict = scorer_res.to_dict()
                    evaluation_dict["compliance"] = eval_base.get("compliance", {})
                    evaluation_dict["compliance"]["overallCompliant"] = val_rep.overall_compliant

                    variant = LayoutVariant(
                        variant_id=f"var-{tag}-{uuid.uuid4().hex[:8]}",
                        variant_number=idx,
                        strategy_name=name,
                        land=land,
                        road_network=roads,
                        plots=plots,
                        amenities=amenities,
                        evaluation=evaluation_dict,
                        validation_report=val_rep_dict,
                    )
                    variants.append(variant)
            except Exception as e:
                logger.warning(f"Error generating Strategy {name}: {e}")

        # Rank variants by composite score descending
        variants = layout_scorer_instance.rank_variants(variants, land.total_area_sqft)

        return variants
