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
        strategy_name: str,
        target_plot_sqft: float,
        min_plot_sqft: float,
        min_frontage_ft: float,
        main_road_width_ft: float,
        feeder_road_width_ft: float,
        open_space_percentage: float,
        amenity_percentage: float,
        utility_percentage: float,
        base_rate_per_sqft: float,
        setback_ft: float,
        max_iterations: int = 3
    ) -> Tuple[RoadNetwork, List[AmenityZone], List[GeneratedPlot], Dict[str, Any]]:
        best_roads = None
        best_amenities = None
        best_plots = None
        best_eval = {"compositeScore": -1.0}

        perturbations = [
            {"spacing_mult": 1.0, "plot_w_mult": 1.0},
            {"spacing_mult": 1.12, "plot_w_mult": 0.95},
            {"spacing_mult": 0.90, "plot_w_mult": 1.05},
        ]

        for it_idx, params in enumerate(perturbations[:max_iterations]):
            try:
                # 1. Generate road network
                roads = strategy_func(
                    land,
                    main_road_width=main_road_width_ft,
                    feeder_road_width=feeder_road_width_ft
                )

                # 2. Place dedicated non-plot space allocations (13D, 13F, 13G, 13H)
                amenities = AmenityPlacer.place_all_reservations(
                    land=land,
                    road_network=roads,
                    open_space_percentage=open_space_percentage,
                    amenity_percentage=amenity_percentage,
                    utility_percentage=utility_percentage,
                    strategy_name=strategy_name,
                    setback_ft=setback_ft,
                )

                # 3. Subdivide plots in usable domain
                plots = PlotSubdivider.subdivide(
                    land=land,
                    road_network=roads,
                    amenities=amenities,
                    target_plot_sqft=target_plot_sqft,
                    min_plot_sqft=min_plot_sqft,
                    min_plot_width_ft=min_frontage_ft * params["plot_w_mult"],
                    base_rate_per_sqft=base_rate_per_sqft,
                    setback_ft=setback_ft
                )

                if not plots:
                    continue

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
                    target_garden_percentage=open_space_percentage,
                    min_road_width_ft=feeder_road_width_ft
                )

                if evaluation.get("compositeScore", 0) > best_eval.get("compositeScore", -1.0):
                    best_eval = evaluation
                    best_roads = roads
                    best_amenities = amenities
                    best_plots = plots

            except Exception as e:
                logger.warning(f"Optimization iteration {it_idx} for '{strategy_name}' notice: {e}")

        return best_roads, best_amenities, best_plots, best_eval
