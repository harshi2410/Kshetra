"""
LayoutOptimizer — Iterative Parameter Perturbation & Self-Improvement Optimization Loop.
Refines candidate layouts over K iterations to maximize civil engineering compliance and composite score.
"""

import copy
import logging
from typing import List, Dict, Any, Optional, Tuple

from .land_parser import LandParser, ParsedLand
from .road_network_generator import RoadNetworkGenerator, RoadNetwork
from .amenity_placer import AmenityPlacer, AmenityZone
from .plot_subdivider import PlotSubdivider, GeneratedPlot
from .layout_evaluator import LayoutEvaluator

logger = logging.getLogger(__name__)


class LayoutOptimizer:
    """Runs perturbation passes to converge on optimal layout geometry."""

    @classmethod
    def optimize_variant(
        cls,
        strategy_func,
        land: ParsedLand,
        target_plot_sqft: float,
        road_width_ft: float,
        garden_percentage: float,
        base_rate_per_sqft: float,
        max_iterations: int = 3
    ) -> Tuple[RoadNetwork, List[AmenityZone], List[GeneratedPlot], Dict[str, Any]]:
        best_roads = None
        best_amenities = None
        best_plots = None
        best_eval = {"compositeScore": -1.0}

        # Parameter perturbations: multipliers for road spacing and plot target
        perturbations = [
            {"spacing_mult": 1.0, "plot_w_mult": 1.0, "garden_pct": garden_percentage},
            {"spacing_mult": 1.15, "plot_w_mult": 0.95, "garden_pct": garden_percentage + 1.0},
            {"spacing_mult": 0.88, "plot_w_mult": 1.05, "garden_pct": garden_percentage},
        ]

        for it_idx, params in enumerate(perturbations[:max_iterations]):
            try:
                # 1. Generate road network
                roads = strategy_func(land, main_road_width=road_width_ft)

                # 2. Place amenities
                amenities = AmenityPlacer.place_amenities(
                    land, roads, params["garden_pct"], "Optimal"
                )

                # 3. Subdivide plots
                plots = PlotSubdivider.subdivide(
                    land,
                    roads,
                    amenities,
                    target_plot_sqft=target_plot_sqft,
                    min_plot_width_ft=25.0 * params["plot_w_mult"],
                    base_rate_per_sqft=base_rate_per_sqft
                )

                if not plots:
                    continue

                # Build mock dict for evaluation
                mock_dict = {
                    "boundary": {
                        "areaSqft": land.total_area_sqft,
                    },
                    "plots": [p.to_dict() for p in plots],
                    "roads": [r.to_dict() for r in roads.roads],
                    "amenities": [a.to_dict() for a in amenities],
                }

                evaluation = LayoutEvaluator.evaluate_layout(
                    mock_dict,
                    target_plot_sqft=target_plot_sqft,
                    target_garden_percentage=garden_percentage,
                    min_road_width_ft=road_width_ft
                )

                if evaluation["compositeScore"] > best_eval.get("compositeScore", -1.0):
                    best_eval = evaluation
                    best_roads = roads
                    best_amenities = amenities
                    best_plots = plots

            except Exception as e:
                logger.warning(f"Optimization iteration {it_idx} failed: {e}")

        return best_roads, best_amenities, best_plots, best_eval
