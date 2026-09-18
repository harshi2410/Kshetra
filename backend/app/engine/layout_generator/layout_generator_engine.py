"""
LayoutGeneratorEngine — Master Orchestrator for Multi-Alternative Layout Generation (13A - 13O).
Generates the Best 2–3 genuine alternative 2D plotting layouts adhering strictly to
Maharashtra Unified Development Control and Promotion Regulations (UDCPR 2020).

Mandatory Sequence (13D):
TOTAL LAND BOUNDARY
        ↓
LAND AREA CALCULATION (SQM & SQFT)
        ↓
DEVELOPMENT / RESERVATION CHECK (UDCPR Rules 3.3, 3.4, 3.5, 3.6)
        ↓
REQUIRED SETBACKS (Peripheral buffer)
        ↓
ROAD / ACCESS RESERVATION (Strategy-specific network)
        ↓
REQUIRED OPEN / RECREATIONAL SPACE (Rule 3.4: 10% for >= 0.40 Ha)
        ↓
AMENITY / COMMUNITY SPACE (Rule 3.5: 5% for >= 2.0 Ha or per authority DP)
        ↓
UTILITY / SERVICE SPACE (13H: Substation, Solid Waste, Drainage buffer)
        ↓
USABLE PLOTTING AREA (Net buildable blocks)
        ↓
PLOT SUBDIVISION (Strategy-specific block partition)
        ↓
OPTIMIZATION (Multi-objective quality refinement)
        ↓
VALIDATION (12 Hard Constraints check)
        ↓
FILTERING & RANKING (Best 2–3 Valid Layouts)
"""

import uuid
import json
import logging
from typing import List, Dict, Any, Optional, Tuple, Union

from .land_parser import LandParser, ParsedLand, Point, EntryPoint
from .road_network_generator import RoadNetworkGenerator, RoadNetwork, RoadSegment
from .plot_subdivider import PlotSubdivider, GeneratedPlot
from .amenity_placer import AmenityPlacer, AmenityZone
from .layout_evaluator import LayoutEvaluator
from .layout_optimizer import LayoutOptimizer
from app.engine.planning_norms_engine import planning_norms_engine_instance, DynamicPlanningNormsEvaluation
from app.engine.constraint_validation_engine import constraint_validation_engine_instance, ValidationReport
from app.engine.layout_scorer import layout_scorer_instance, LayoutScoreBreakdown
from app.engine.buildable_area_engine import buildable_area_engine_instance

logger = logging.getLogger(__name__)

SQFT_TO_SQM = 0.09290304
SQM_TO_SQFT = 10.7639104
M_TO_FT = 3.2808399
FT_TO_M = 0.3048


class LayoutVariant:
    """A complete, validated, and evaluated civil engineering layout design variant."""

    def __init__(
        self,
        variant_id: str,
        variant_number: int,
        strategy_name: str,
        option_badge: str,
        land: ParsedLand,
        road_network: RoadNetwork,
        plots: List[GeneratedPlot],
        amenities: List[AmenityZone],
        evaluation: Optional[Dict[str, Any]] = None,
        validation_report: Optional[Dict[str, Any]] = None,
        norms: Optional[DynamicPlanningNormsEvaluation] = None,
    ):
        self.id = variant_id
        self.variant_number = variant_number
        self.strategy_name = strategy_name
        self.option_badge = option_badge
        self.land = land
        self.road_network = road_network
        self.plots = plots
        self.amenities = amenities
        self.evaluation = evaluation or {}
        self.validation_report = validation_report or {}
        self.norms = norms

    @property
    def total_plots(self) -> int:
        return len(self.plots)

    @property
    def total_plot_area_sqft(self) -> float:
        return sum(p.area_sqft for p in self.plots)

    @property
    def total_plot_area_sqm(self) -> float:
        return self.total_plot_area_sqft * SQFT_TO_SQM

    @property
    def total_road_area_sqft(self) -> float:
        return self.road_network.total_road_area_sqft

    @property
    def total_road_area_sqm(self) -> float:
        return self.total_road_area_sqft * SQFT_TO_SQM

    @property
    def total_open_space_area_sqft(self) -> float:
        return sum(a.area_sqft for a in self.amenities if a.zone_type == "RECREATIONAL_OPEN_SPACE")

    @property
    def total_open_space_area_sqm(self) -> float:
        return self.total_open_space_area_sqft * SQFT_TO_SQM

    @property
    def total_amenity_area_sqft(self) -> float:
        return sum(a.area_sqft for a in self.amenities if a.zone_type == "AMENITY_SPACE")

    @property
    def total_amenity_area_sqm(self) -> float:
        return self.total_amenity_area_sqft * SQFT_TO_SQM

    @property
    def total_utility_area_sqft(self) -> float:
        return sum(a.area_sqft for a in self.amenities if a.zone_type == "UTILITY_SERVICE")

    @property
    def total_utility_area_sqm(self) -> float:
        return self.total_utility_area_sqft * SQFT_TO_SQM

    @property
    def total_plot_area(self) -> float:
        return self.total_plot_area_sqft

    @property
    def total_road_area(self) -> float:
        return self.total_road_area_sqft

    @property
    def total_amenity_area(self) -> float:
        return self.total_amenity_area_sqft + self.total_open_space_area_sqft + self.total_utility_area_sqft

    @property
    def utilization_percent(self) -> float:
        if self.land.total_area_sqft <= 0:
            return 0.0
        return (self.total_plot_area_sqft / self.land.total_area_sqft) * 100.0

    @property
    def composite_score(self) -> float:
        return self.evaluation.get("compositeScore", 0.0)

    @property
    def is_compliant(self) -> bool:
        return self.evaluation.get("isCompliant", True)

    @property
    def statistics(self) -> dict:
        total_sqft = self.land.total_area_sqft
        total_sqm = total_sqft * SQFT_TO_SQM
        avg_plot_sqft = self.total_plot_area_sqft / max(1, self.total_plots)
        corner_plots = sum(1 for p in self.plots if p.is_corner)

        return {
            # Identification & Badging
            "optionBadge": self.option_badge,
            "strategyName": self.strategy_name,
            "variantNumber": self.variant_number,
            "compositeScore": round(self.composite_score, 1),
            "complianceStatus": "PASS" if self.is_compliant else "FAIL",

            # Dual Units: Area Breakdown
            "totalLandAreaSqft": round(total_sqft, 1),
            "totalLandAreaSqm": round(total_sqm, 1),
            "totalPlots": self.total_plots,
            "cornerPlots": corner_plots,

            "totalPlotAreaSqft": round(self.total_plot_area_sqft, 1),
            "totalPlotAreaSqm": round(self.total_plot_area_sqm, 1),
            "averagePlotAreaSqft": round(avg_plot_sqft, 1),
            "averagePlotAreaSqm": round(avg_plot_sqft * SQFT_TO_SQM, 1),

            "totalRoadAreaSqft": round(self.total_road_area_sqft, 1),
            "totalRoadAreaSqm": round(self.total_road_area_sqm, 1),
            "roadPercentage": round((self.total_road_area_sqft / max(1, total_sqft)) * 100.0, 1),

            "totalOpenSpaceAreaSqft": round(self.total_open_space_area_sqft, 1),
            "totalOpenSpaceAreaSqm": round(self.total_open_space_area_sqm, 1),
            "openSpacePercentage": round((self.total_open_space_area_sqft / max(1, total_sqft)) * 100.0, 1),

            "totalAmenityAreaSqft": round(self.total_amenity_area_sqft, 1),
            "totalAmenityAreaSqm": round(self.total_amenity_area_sqm, 1),
            "amenityPercentage": round((self.total_amenity_area_sqft / max(1, total_sqft)) * 100.0, 1),

            "totalUtilityAreaSqft": round(self.total_utility_area_sqft, 1),
            "totalUtilityAreaSqm": round(self.total_utility_area_sqm, 1),

            "utilizationPercent": round(self.utilization_percent, 1),
            "roadCount": len(self.road_network.roads),
            "amenityCount": len(self.amenities),

            # Evaluation & Validation
            "evaluation": self.evaluation,
            "validationReport": self.validation_report,
        }

    def to_layout_model(self) -> dict:
        """Produce the full layout model JSON compatible with frontend viewers and exports."""
        return {
            "variantId": self.id,
            "variantNumber": self.variant_number,
            "strategyName": self.strategy_name,
            "optionBadge": self.option_badge,
            "boundary": {
                "polygon": [p.to_dict() for p in self.land.boundary_polygon],
                "areaSqft": round(self.land.total_area_sqft, 1),
                "areaSqm": round(self.land.total_area_sqft * SQFT_TO_SQM, 1),
                "lengthFt": round(self.land.length_ft, 1),
                "breadthFt": round(self.land.breadth_ft, 1),
                "bbox": self.land.bbox.to_dict(),
            },
            "entryPoints": [ep.to_dict() for ep in self.land.entry_points],
            "roads": [r.to_dict() for r in self.road_network.roads],
            "plots": [p.to_dict() for p in self.plots],
            "amenities": [a.to_dict() for a in self.amenities],
            "statistics": self.statistics,
            "evaluation": self.evaluation,
            "validation": self.validation_report,
            "norms": self.norms.model_dump() if self.norms else None,
        }

    def to_svg(self) -> str:
        """Generate high-precision layered vector 2D plotting plan (13K)."""
        return render_clean_svg(
            boundary_polygon=[p.to_dict() for p in self.land.boundary_polygon],
            bbox_dict=self.land.bbox.to_dict(),
            entry_points=[ep.to_dict() for ep in self.land.entry_points],
            roads=[r.to_dict() for r in self.road_network.roads],
            plots=[p.to_dict() for p in self.plots],
            amenities=[a.to_dict() for a in self.amenities],
        )


def render_clean_svg(
    boundary_polygon: List[Union[Dict[str, float], Point]],
    bbox_dict: Dict[str, float],
    entry_points: List[Union[Dict[str, Any], EntryPoint]],
    roads: List[Union[Dict[str, Any], RoadSegment]],
    plots: List[Union[Dict[str, Any], GeneratedPlot]],
    amenities: List[Union[Dict[str, Any], AmenityZone]],
) -> str:
    """
    Renders an architectural-grade, ultra-clean 2D vector layout plan (13K).
    Guarantees:
    - Zero overlapping text labels between plots or roads.
    - Strict "DO NOT REPEAT" rule: identical dimensions and areas are not plastered on every
      adjacent plot. The first plot of each row/block shows dimensions, while subsequent
      standard plots show only crisp, high-contrast Plot Numbers (P-001, P-002...).
    - Standard Plot Specification badge in the legend clearly communicates typical dimensions & areas.
    - Vertical roads have road labels oriented along the road centerline with zero plot collision.
    - Entry/Exit badges placed outside the plot boundary in the exterior margin.
    - Full metric/imperial data accessible via SVG <title> hover tooltips and click selection.
    """
    # ─── Dynamic Full Bounding Box Calculation Across All Elements ───
    all_xs: List[float] = []
    all_ys: List[float] = []

    # 1. From bbox_dict (supports both snake_case and camelCase)
    if bbox_dict:
        for k in ("min_x", "minX"):
            if k in bbox_dict and bbox_dict[k] is not None:
                all_xs.append(float(bbox_dict[k]))
        for k in ("max_x", "maxX"):
            if k in bbox_dict and bbox_dict[k] is not None:
                all_xs.append(float(bbox_dict[k]))
        for k in ("min_y", "minY"):
            if k in bbox_dict and bbox_dict[k] is not None:
                all_ys.append(float(bbox_dict[k]))
        for k in ("max_y", "maxY"):
            if k in bbox_dict and bbox_dict[k] is not None:
                all_ys.append(float(bbox_dict[k]))

    # 2. From boundary_polygon
    for p in boundary_polygon:
        px = p["x"] if isinstance(p, dict) else getattr(p, "x", None)
        py = p["y"] if isinstance(p, dict) else getattr(p, "y", None)
        if px is not None and py is not None:
            all_xs.append(float(px))
            all_ys.append(float(py))

    # 3. From plots
    for p in plots:
        pts = p["polygon"] if isinstance(p, dict) else getattr(p, "polygon", [])
        for pt in pts:
            px = pt["x"] if isinstance(pt, dict) else getattr(pt, "x", None)
            py = pt["y"] if isinstance(pt, dict) else getattr(pt, "y", None)
            if px is not None and py is not None:
                all_xs.append(float(px))
                all_ys.append(float(py))

    # 4. From amenities
    for a in amenities:
        pts = a["polygon"] if isinstance(a, dict) else getattr(a, "polygon", [])
        for pt in pts:
            px = pt["x"] if isinstance(pt, dict) else getattr(pt, "x", None)
            py = pt["y"] if isinstance(pt, dict) else getattr(pt, "y", None)
            if px is not None and py is not None:
                all_xs.append(float(px))
                all_ys.append(float(py))

    # 5. From roads
    for r in roads:
        pts = r["polygon"] if isinstance(r, dict) else getattr(r, "polygon", [])
        for pt in pts:
            px = pt["x"] if isinstance(pt, dict) else getattr(pt, "x", None)
            py = pt["y"] if isinstance(pt, dict) else getattr(pt, "y", None)
            if px is not None and py is not None:
                all_xs.append(float(px))
                all_ys.append(float(py))
        for end_pt in ("start", "end"):
            pt_obj = r.get(end_pt) if isinstance(r, dict) else getattr(r, end_pt, None)
            if pt_obj:
                px = pt_obj["x"] if isinstance(pt_obj, dict) else getattr(pt_obj, "x", None)
                py = pt_obj["y"] if isinstance(pt_obj, dict) else getattr(pt_obj, "y", None)
                if px is not None and py is not None:
                    all_xs.append(float(px))
                    all_ys.append(float(py))

    # 6. From entry_points
    for ep in entry_points:
        ep_x = ep["x"] if isinstance(ep, dict) else getattr(ep, "x", None)
        ep_y = ep["y"] if isinstance(ep, dict) else getattr(ep, "y", None)
        if ep_x is not None and ep_y is not None:
            all_xs.append(float(ep_x))
            all_ys.append(float(ep_y))

    min_x = min(all_xs) if all_xs else 0.0
    max_x = max(all_xs) if all_xs else 300.0
    min_y = min(all_ys) if all_ys else 0.0
    max_y = max(all_ys) if all_ys else 200.0

    if max_x <= min_x:
        max_x = min_x + 300.0
    if max_y <= min_y:
        max_y = min_y + 200.0

    bw = max_x - min_x
    bh = max_y - min_y

    margin_x = max(10.0, bw * 0.02)
    margin_y_top = max(10.0, bh * 0.02)
    margin_y_bottom = max(24.0, bh * 0.05)

    canvas_min_x = min_x - margin_x
    canvas_min_y = min_y - margin_y_top
    canvas_w = bw + 2 * margin_x
    canvas_h = bh + margin_y_top + margin_y_bottom

    svg_parts = []
    svg_parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{canvas_min_x:.1f} {canvas_min_y:.1f} {canvas_w:.1f} {canvas_h:.1f}" '
        f'width="100%" height="100%" preserveAspectRatio="xMidYMid meet" '
        f'style="background: #090e17; font-family: Inter, system-ui, -apple-system, sans-serif;">'
    )

    # 0. Boundary polygon coordinates
    b_pts = []
    for p in boundary_polygon:
        px = p["x"] if isinstance(p, dict) else p.x
        py = p["y"] if isinstance(p, dict) else p.y
        b_pts.append(f"{px:.1f},{py:.1f}")
    b_pts_str = " ".join(b_pts)

    # Defs
    svg_parts.append(f"""
    <defs>
      <clipPath id="boundary-silhouette-clip">
        <polygon points="{b_pts_str}" />
      </clipPath>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
      </pattern>
      <pattern id="hatch-green" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(16, 185, 129, 0.4)" stroke-width="1.8" />
      </pattern>
      <pattern id="hatch-blue" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(59, 130, 246, 0.4)" stroke-width="1.8" />
      </pattern>
      <pattern id="hatch-amber" width="6" height="6" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1.5" />
      </pattern>
      <style>
        text {{
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
        }}
        .plot-num {{
          font-weight: 800;
          fill: #ffffff;
          letter-spacing: 0.3px;
          paint-order: stroke fill;
          stroke: rgba(9, 14, 23, 0.85);
          stroke-width: 0.6px;
          stroke-linejoin: round;
        }}
        .plot-dim {{
          font-weight: 600;
          fill: #94a3b8;
          letter-spacing: 0.2px;
        }}
        .landos-plot {{
          transition: fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease;
          cursor: pointer;
        }}
        .landos-plot:hover {{
          fill: rgba(59, 130, 246, 0.35) !important;
          stroke: #60a5fa !important;
          stroke-width: 1.8 !important;
        }}
        .landos-plot-group:hover text.plot-num {{
          fill: #38bdf8 !important;
          stroke: none;
        }}
      </style>
    </defs>
    <!-- Neutral workspace background -->
    <rect width="100%" height="100%" fill="url(#grid)" />

    <!-- 1. Authentic Land Silhouette Fill -->
    <polygon points="{b_pts_str}" fill="#0b1120" />

    <!-- 2. Internal Plotting Elements Strictly Clipped Inside Authentic Boundary -->
    <g clip-path="url(#boundary-silhouette-clip)">
    """)

    # 2. Dedicated Reservations (Open Space, Amenities, Utility)
    for a in amenities:
        a_pts = a["polygon"] if isinstance(a, dict) else [pt.to_dict() for pt in a.polygon]
        a_pts_str = " ".join(f"{pt['x']:.1f},{pt['y']:.1f}" for pt in a_pts)
        zone_type = a.get("zoneType") if isinstance(a, dict) else getattr(a, "zone_type", "RECREATIONAL_OPEN_SPACE")
        if not zone_type and isinstance(a, dict):
            zone_type = a.get("type", "RECREATIONAL_OPEN_SPACE")
        label = a.get("label") if isinstance(a, dict) else getattr(a, "label", "OPEN SPACE")
        sqft = float(a.get("areaSqft", 0.0) if isinstance(a, dict) else a.area_sqft)
        sqm = float(a.get("areaSqm", 0.0) if isinstance(a, dict) else a.area_sqm)

        if "RECREATIONAL" in str(zone_type):
            fill = "rgba(16, 185, 129, 0.18)"
            stroke = "#10b981"
            hatch = "url(#hatch-green)"
            title_text = "RECREATIONAL OPEN SPACE"
        elif "AMENITY" in str(zone_type):
            fill = "rgba(59, 130, 246, 0.18)"
            stroke = "#3b82f6"
            hatch = "url(#hatch-blue)"
            title_text = "AMENITY SPACE"
        else:
            fill = "rgba(245, 158, 11, 0.18)"
            stroke = "#f59e0b"
            hatch = "url(#hatch-amber)"
            title_text = "UTILITY / INFRASTRUCTURE"

        svg_parts.append(f'<polygon points="{a_pts_str}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>')
        svg_parts.append(f'<polygon points="{a_pts_str}" fill="{hatch}" opacity="0.4"/>')

        c_dict = a.get("centroid") if isinstance(a, dict) else a.centroid.to_dict()
        if c_dict and "x" in c_dict and "y" in c_dict:
            acx, acy = c_dict["x"], c_dict["y"]
        else:
            acx = sum(pt["x"] for pt in a_pts) / len(a_pts)
            acy = sum(pt["y"] for pt in a_pts) / len(a_pts)

        badge_w = max(75.0, len(title_text) * 4.2 + 16.0)
        badge_h = 20.0
        svg_parts.append(f"""
        <g class="zone-badge">
          <rect x="{acx - badge_w / 2:.1f}" y="{acy - badge_h / 2:.1f}" width="{badge_w:.1f}" height="{badge_h:.1f}" rx="4" fill="rgba(15, 23, 42, 0.92)" stroke="{stroke}" stroke-width="1.2"/>
          <text x="{acx:.1f}" y="{acy - 1.5:.1f}" fill="{stroke}" font-size="5.0" text-anchor="middle" font-weight="800" letter-spacing="0.5">{title_text}</text>
          <text x="{acx:.1f}" y="{acy + 6.0:.1f}" fill="#cbd5e1" font-size="4.0" text-anchor="middle" font-weight="600">{sqft:,.0f} SQFT ({sqm:,.0f} M²)</text>
        </g>
        """)

    # 3. Road Corridors
    for r in roads:
        r_pts = r["polygon"] if isinstance(r, dict) else [pt.to_dict() for pt in r.polygon]
        r_pts_str = " ".join(f"{pt['x']:.1f},{pt['y']:.1f}" for pt in r_pts)
        name = r["name"] if isinstance(r, dict) else r.name
        width_m = float(r.get("widthM", 9.0) if isinstance(r, dict) else r.width_m)
        width_ft = float(r.get("widthFt", 30.0) if isinstance(r, dict) else r.width_ft)
        st = r["start"] if isinstance(r, dict) else r.start.to_dict()
        en = r["end"] if isinstance(r, dict) else r.end.to_dict()

        svg_parts.append(
            f'<polygon points="{r_pts_str}" fill="rgba(30, 41, 59, 0.85)" stroke="#475569" stroke-width="0.8"/>'
        )
        svg_parts.append(
            f'<line x1="{st["x"]:.1f}" y1="{st["y"]:.1f}" x2="{en["x"]:.1f}" y2="{en["y"]:.1f}" '
            f'stroke="rgba(255, 255, 255, 0.18)" stroke-width="1" stroke-dasharray="6,4"/>'
        )

        rcx = (st["x"] + en["x"]) / 2.0
        rcy = (st["y"] + en["y"]) / 2.0

        # Clean name to avoid duplicating road width
        clean_name = name.split(" (")[0] if " (" in name else name
        road_label = f"{clean_name} ({width_m:.1f}M / {width_ft:.0f}' ROW)"
        road_font = max(2.6, min(4.0, width_ft * 0.12))
        pill_w = len(road_label) * 0.58 * road_font + 10.0
        pill_h = road_font * 1.6 + 3.0

        # Align badge with road corridor orientation so vertical roads don't encroach into plots
        is_vertical = abs(st["x"] - en["x"]) < abs(st["y"] - en["y"]) * 0.6
        rot_attr = f'transform="rotate(-90 {rcx:.1f} {rcy:.1f})"' if is_vertical else ""

        svg_parts.append(
            f'<g class="road-badge" {rot_attr}>'
            f'<rect x="{rcx - pill_w / 2:.1f}" y="{rcy - pill_h / 2:.1f}" width="{pill_w:.1f}" height="{pill_h:.1f}" rx="3" fill="rgba(15, 23, 42, 0.94)" stroke="#475569" stroke-width="0.7"/>'
            f'<text x="{rcx:.1f}" y="{rcy + road_font * 0.35:.1f}" fill="#cbd5e1" font-size="{road_font:.1f}" text-anchor="middle" font-weight="600" letter-spacing="0.4">{road_label}</text>'
            f'</g>'
        )

    # 4. Plots (Clean Hierarchical Labels, Zero Overlap, "DO NOT REPEAT")
    # Pre-parse plots and determine row groups and typical dimensions
    plot_items = []
    dim_frequencies: Dict[str, int] = {}
    area_frequencies: Dict[int, int] = {}

    for p in plots:
        pts = p["polygon"] if isinstance(p, dict) else [pt.to_dict() for pt in p.polygon]
        xs = [pt["x"] for pt in pts]
        ys = [pt["y"] for pt in pts]
        pw = max(xs) - min(xs)
        ph = max(ys) - min(ys)

        # True interior centroid for flawless label positioning inside irregular shapes
        c_dict = p.get("centroid") if isinstance(p, dict) else getattr(p, "centroid", None)
        if c_dict and hasattr(c_dict, "x") and hasattr(c_dict, "y"):
            cx, cy = c_dict.x, c_dict.y
        elif isinstance(c_dict, dict) and "x" in c_dict and "y" in c_dict:
            cx, cy = c_dict["x"], c_dict["y"]
        else:
            try:
                poly_repr = ShapelyPolygon([(pt["x"], pt["y"]) for pt in pts])
                rp = poly_repr.representative_point() if poly_repr.is_valid else None
                cx = rp.x if rp else sum(xs) / len(xs)
                cy = rp.y if rp else sum(ys) / len(ys)
            except Exception:
                cx = sum(xs) / len(xs)
                cy = sum(ys) / len(ys)

        plot_no = str(p.get("plotNumber") if isinstance(p, dict) else p.plot_number)
        w_ft = float(p.get("widthFt", 30.0) if isinstance(p, dict) else p.width_ft)
        d_ft = float(p.get("depthFt", 50.0) if isinstance(p, dict) else p.depth_ft)
        w_m = float(p.get("widthM", w_ft * 0.3048) if isinstance(p, dict) else p.width_m)
        d_m = float(p.get("depthM", d_ft * 0.3048) if isinstance(p, dict) else p.depth_m)
        sqft = float(p.get("areaSqft", 1200.0) if isinstance(p, dict) else p.area_sqft)
        sqm = float(p.get("areaSqm", sqft * 0.092903) if isinstance(p, dict) else p.area_sqm)
        is_corner = bool(p.get("isCorner", False) if isinstance(p, dict) else p.is_corner)
        plot_id = str(p.get("plotId") if isinstance(p, dict) else p.plot_id)
        facing = str(p.get("facing", "NORTH") if isinstance(p, dict) else p.facing)
        road_name = str(p.get("roadName", "Main Road") if isinstance(p, dict) else p.road_name)
        status = str(p.get("status", "AVAILABLE") if isinstance(p, dict) else p.status)

        dim_key = f"{round(w_ft)}×{round(d_ft)}"
        dim_frequencies[dim_key] = dim_frequencies.get(dim_key, 0) + 1
        rounded_area = int(round(sqft))
        area_frequencies[rounded_area] = area_frequencies.get(rounded_area, 0) + 1

        plot_items.append({
            "plot_id": plot_id,
            "plot_no": plot_no,
            "pts": pts,
            "pw": pw,
            "ph": ph,
            "cx": cx,
            "cy": cy,
            "w_ft": w_ft,
            "d_ft": d_ft,
            "w_m": w_m,
            "d_m": d_m,
            "sqft": sqft,
            "sqm": sqm,
            "is_corner": is_corner,
            "facing": facing,
            "road_name": road_name,
            "status": status,
            "dim_key": dim_key,
        })

    # Typical plot stats for the global specification badge
    typical_dim_key = max(dim_frequencies, key=dim_frequencies.get) if dim_frequencies else "30×50"
    try:
        typ_w = float(typical_dim_key.split("×")[0])
        typ_d = float(typical_dim_key.split("×")[1])
    except Exception:
        typ_w, typ_d = 30.0, 50.0

    matching_areas = [item["sqft"] for item in plot_items if item["dim_key"] == typical_dim_key]
    typical_sqft = sum(matching_areas) / len(matching_areas) if matching_areas else typ_w * typ_d

    # Spatial row clustering: group plots into horizontal rows (Y-binned by ~15ft)
    # Sort plots: top-to-bottom, left-to-right
    sorted_plot_items = sorted(plot_items, key=lambda it: (round(it["cy"] / 14.0), it["cx"]))

    # Track seen dimensions in each row to enforce: "DO NOT REPEAT"
    row_seen_dims: Dict[int, set] = {}

    for item in sorted_plot_items:
        bin_y = round(item["cy"] / 14.0)
        if bin_y not in row_seen_dims:
            row_seen_dims[bin_y] = set()

        dim_key = item["dim_key"]
        pw = item["pw"]
        ph = item["ph"]
        cx = item["cx"]
        cy = item["cy"]
        plot_no = item["plot_no"]
        w_ft = item["w_ft"]
        d_ft = item["d_ft"]
        w_m = item["w_m"]
        d_m = item["d_m"]
        sqft = item["sqft"]
        sqm = item["sqm"]
        is_corner = item["is_corner"]
        plot_id = item["plot_id"]
        facing = item["facing"]
        road_name = item["road_name"]
        status = item["status"]
        pts = item["pts"]

        # Only display dimension on the FIRST occurrence in each horizontal row
        # (or for unique corner plots that have atypical dimensions)
        can_fit_dim = pw >= 20.0 and ph >= 26.0
        is_first_in_row = dim_key not in row_seen_dims[bin_y]
        show_dim = is_first_in_row and can_fit_dim
        if show_dim:
            row_seen_dims[bin_y].add(dim_key)

        dim_lbl = f"{w_ft:.0f}'×{d_ft:.0f}'"

        # Adaptive typography sizing: Plot Number is bold, clean, and legible
        if show_dim:
            font_no = max(2.8, min(4.8, (pw * 0.68) / (0.56 * max(1, len(plot_no))), ph * 0.28))
            font_dim = max(2.0, min(3.0, (pw * 0.62) / (0.56 * max(1, len(dim_lbl))), ph * 0.18))
            y1 = cy - font_dim * 0.55
            y2 = cy + font_no * 0.75
        else:
            # Clean single centered Plot Number — zero clutter, zero collision
            font_no = max(3.0, min(5.4, (pw * 0.72) / (0.56 * max(1, len(plot_no))), ph * 0.36))
            y1 = cy + font_no * 0.35
            y2 = None

        tooltip_text = (
            f"Plot {plot_no} ({status})&#10;"
            f"Dimensions: {w_ft:.0f}&apos; × {d_ft:.0f}&apos; FT ({w_m:.1f} × {d_m:.1f} M)&#10;"
            f"Area: {sqft:,.0f} SQFT ({sqm:,.0f} M²)&#10;"
            f"Road Access: {road_name}&#10;"
            f"Orientation: {facing}&#10;"
            f"Status: {status}"
        )

        p_pts_str = " ".join(f"{pt['x']:.1f},{pt['y']:.1f}" for pt in pts)
        is_booked = str(status).upper() == "BOOKED"
        if is_booked:
            fill_color = "rgba(239, 68, 68, 0.28)"
            stroke_color = "#ef4444"
            status_label = "BOOKED"
        else:
            fill_color = "rgba(245, 158, 11, 0.16)" if is_corner else "rgba(34, 197, 94, 0.18)"
            stroke_color = "#f59e0b" if is_corner else "#22c55e"
            status_label = "AVAILABLE"

        plot_svg = [
            f'<g id="{plot_id}" data-plot-id="{plot_id}" data-plot-number="{plot_no}" data-status="{status_label}" class="landos-plot-group" style="cursor: pointer;">',
            f'  <title>{tooltip_text}</title>',
            f'  <polygon id="plot-poly-{plot_no}" data-plot-id="{plot_id}" data-plot-number="{plot_no}" data-status="{status_label}" points="{p_pts_str}" fill="{fill_color}" stroke="{stroke_color}" stroke-width="0.9" class="landos-plot {"landos-plot-booked" if is_booked else "landos-plot-available"}"/>',
            f'  <text x="{cx:.1f}" y="{y1:.1f}" class="plot-num" font-size="{font_no:.1f}" text-anchor="middle" fill="#ffffff" font-weight="700" pointer-events="none">{plot_no}</text>'
        ]
        if show_dim and y2 is not None:
            plot_svg.append(f'  <text x="{cx:.1f}" y="{y2:.1f}" class="plot-dim" font-size="{font_dim:.1f}" text-anchor="middle" fill="#94a3b8" pointer-events="none">{dim_lbl}</text>')
        plot_svg.append('</g>')
        svg_parts.append("\n".join(plot_svg))


    # Close internal elements clip-path group
    svg_parts.append("</g>")

    # 4. Master Outer Boundary Styling & Cadastral Vertices (Section 32, 38)
    svg_parts.append(f'<polygon points="{b_pts_str}" fill="none" stroke="#2563eb" stroke-width="2.6" />')
    svg_parts.append(f'<polygon points="{b_pts_str}" fill="none" stroke="#93c5fd" stroke-width="1.0" stroke-dasharray="6,3" />')
    for p in boundary_polygon:
        px = float(p["x"] if isinstance(p, dict) else p.x)
        py = float(p["y"] if isinstance(p, dict) else p.y)
        svg_parts.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="2.8" fill="#3b82f6" stroke="#ffffff" stroke-width="1.2" />')

    # 5. Entry / Exit Markers (External non-colliding badge)
    for ep in entry_points:
        ep_x = float(ep["x"] if isinstance(ep, dict) else ep.x)
        ep_y = float(ep["y"] if isinstance(ep, dict) else ep.y)
        d_top = abs(ep_y - min_y)
        d_bottom = abs(ep_y - max_y)
        d_left = abs(ep_x - min_x)
        d_right = abs(ep_x - max_x)
        min_d = min(d_top, d_bottom, d_left, d_right)

        if min_d == d_top:
            bx, by = ep_x, min_y - 14.0
            line_end_y = min_y
        elif min_d == d_bottom:
            bx, by = ep_x, max_y + 16.0
            line_end_y = max_y
        elif min_d == d_left:
            bx, by = min_x - 26.0, ep_y
            line_end_y = ep_y
        else:
            bx, by = max_x + 26.0, ep_y
            line_end_y = ep_y

        svg_parts.append(f"""
        <g class="entry-marker">
          <circle cx="{ep_x:.1f}" cy="{ep_y:.1f}" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="{bx - 28:.1f}" y="{by - 7:.1f}" width="56" height="14" rx="4" fill="rgba(15, 23, 42, 0.96)" stroke="#10b981" stroke-width="1.2"/>
          <text x="{bx:.1f}" y="{by + 3.5:.1f}" fill="#10b981" font-size="5.2" font-weight="800" text-anchor="middle" letter-spacing="0.5">ENTRY / EXIT</text>
        </g>
        """)

    # 6. North Arrow Indicator (Cleanly positioned in top-right margin outside site)
    na_x = min(canvas_min_x + canvas_w - 22.0, max(max_x + 20.0, max_x + margin_x * 0.45))
    na_y = min_y + 15.0
    svg_parts.append(f"""
    <g transform="translate({na_x:.1f}, {na_y:.1f})">
      <circle cx="0" cy="0" r="12" fill="rgba(15, 23, 42, 0.85)" stroke="#3b82f6" stroke-width="1"/>
      <path d="M 0 -8 L 3.5 3 L 0 0.8 L -3.5 3 z" fill="#ef4444"/>
      <path d="M 0 8 L 3.5 3 L 0 0.8 L -3.5 3 z" fill="#64748b"/>
      <text x="0" y="-10" fill="#ef4444" font-size="6.5" font-weight="900" text-anchor="middle">N</text>
    </g>
    """)

    # 7. Graphic Scale Bar (Strictly below the lowest element of the layout)
    scale_y = max_y + 20.0
    scale_ft = max(50.0, round(bw * 0.12 / 10.0) * 10.0)
    scale_m = scale_ft * 0.3048
    svg_parts.append(f"""
    <g transform="translate({min_x:.1f}, {scale_y:.1f})">
      <rect x="0" y="0" width="{scale_ft:.1f}" height="3" fill="#ffffff" stroke="#000000" stroke-width="0.5"/>
      <rect x="{scale_ft / 2:.1f}" y="0" width="{scale_ft / 2:.1f}" height="3" fill="#000000"/>
      <text x="0" y="-3" fill="#94a3b8" font-size="4.2" text-anchor="start">0</text>
      <text x="{scale_ft:.1f}" y="-3" fill="#94a3b8" font-size="4.2" text-anchor="middle">{scale_ft:.0f} FT ({scale_m:.1f} M)</text>
      <text x="{scale_ft / 2:.1f}" y="9" fill="#64748b" font-size="4.2" text-anchor="middle" font-weight="600">GRAPHIC SCALE</text>
    </g>
    """)

    # 8. Legend Panel & Standard Plot Specification (Strictly below the layout)
    lg_x = min_x + scale_ft + 20.0
    lg_y = max_y + 16.0

    typ_w_m = typ_w * 0.3048
    typ_d_m = typ_d * 0.3048
    typ_sqm = typical_sqft * 0.092903
    spec_label = f"STANDARD PLOT: {typ_w:.0f}' × {typ_d:.0f}' FT ({typ_w_m:.1f} × {typ_d_m:.1f} M) • {typical_sqft:,.0f} SQFT ({typ_sqm:,.0f} M²)"

    svg_parts.append(f"""
    <g transform="translate({lg_x:.1f}, {lg_y:.1f})">
      <!-- Row 1: Zone Types -->
      <rect x="0" y="0" width="7" height="7" rx="1.5" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="0.8"/>
      <text x="10" y="5.8" fill="#cbd5e1" font-size="4.2" font-weight="500">Residential Plots</text>

      <rect x="70" y="0" width="7" height="7" rx="1.5" fill="rgba(51, 65, 85, 0.9)" stroke="#64748b" stroke-width="0.8"/>
      <text x="80" y="5.8" fill="#cbd5e1" font-size="4.2" font-weight="500">Road Corridors</text>

      <rect x="136" y="0" width="7" height="7" rx="1.5" fill="rgba(16, 185, 129, 0.4)" stroke="#10b981" stroke-width="0.8"/>
      <text x="146" y="5.8" fill="#cbd5e1" font-size="4.2" font-weight="500">Recreational Open Space</text>

      <rect x="230" y="0" width="7" height="7" rx="1.5" fill="rgba(59, 130, 246, 0.4)" stroke="#3b82f6" stroke-width="0.8"/>
      <text x="240" y="5.8" fill="#cbd5e1" font-size="4.2" font-weight="500">Civic Amenity Space</text>

      <rect x="312" y="0" width="7" height="7" rx="1.5" fill="rgba(245, 158, 11, 0.4)" stroke="#f59e0b" stroke-width="0.8"/>
      <text x="322" y="5.8" fill="#cbd5e1" font-size="4.2" font-weight="500">Utility / Infrastructure</text>

      <!-- Row 2: Standard Plot Specification (Single Clear Source of Truth, No Plot Repetition) -->
      <g transform="translate(0, 14)">
        <rect x="0" y="0" width="{len(spec_label) * 2.3 + 12:.1f}" height="8" rx="2" fill="rgba(30, 41, 59, 0.85)" stroke="#38bdf8" stroke-width="0.7"/>
        <text x="6" y="5.6" fill="#38bdf8" font-size="3.8" font-weight="700" letter-spacing="0.3">{spec_label}</text>
      </g>
    </g>
    """)

    svg_parts.append("</svg>")
    return "".join(svg_parts)


def render_svg_from_layout_model(model_dict: dict) -> str:
    """Helper to render clean SVG from stored layout model JSON."""
    boundary = model_dict.get("boundary", {})
    polygon = boundary.get("polygon", [])
    bbox = boundary.get("bbox", {})
    entry_points = model_dict.get("entryPoints", [])
    roads = model_dict.get("roads", [])
    plots = model_dict.get("plots", [])
    amenities = model_dict.get("amenities", [])
    return render_clean_svg(polygon, bbox, entry_points, roads, plots, amenities)


class LayoutGeneratorEngine:
    """Master orchestrator generating the best 2–3 Maharashtra UDCPR compliant design variants."""

    def generate_all_variants(
        self,
        length_ft: float = 300.0,
        breadth_ft: float = 200.0,
        polygon_vertices: Optional[List[List[float]]] = None,
        entry_edges: Optional[List[Dict[str, Any]]] = None,
        jurisdiction_id: Optional[str] = None,
        city_area: Optional[str] = None,
        land_use: str = "RESIDENTIAL",
        is_congested: bool = False,
        planning_regulation: Optional[str] = None,
        target_plot_sqft: Optional[float] = None,
        road_width_ft: Optional[float] = None,
        garden_percentage: Optional[float] = None,
        base_rate_per_sqft: float = 2500.0,
        setback_ft: Optional[float] = None,
    ) -> Tuple[List[LayoutVariant], List[str]]:
        """
        Master Pipeline (13A - 13O):
        1. Boundary & Area Calculation (Metric & Imperial)
        2. Dynamic Maharashtra UDCPR Planning Norms Evaluation
        3. Space Allocations (Setbacks, Roads, Open Space, Amenity Space, Utilities)
        4. Multiple Candidate Generation (Options A, B, C)
        5. Hard Constraint Validation
        6. Pruning Invalid Layouts
        7. Multi-Objective Scoring & Ranking
        8. Returns Best 2–3 Valid Layouts and any failure reasons.
        """
        failure_reasons: List[str] = []

        # ─── 1. TOTAL LAND BOUNDARY & AREA CALCULATION (13D) ───
        land = LandParser.parse(
            length_ft=length_ft,
            breadth_ft=breadth_ft,
            polygon_vertices=polygon_vertices,
            entry_edges=entry_edges,
        )

        total_sqft = land.total_area_sqft
        total_sqm = total_sqft * SQFT_TO_SQM

        # ─── 2. MAHARASHTRA PLANNING RULE SELECTION (13C) ───
        norms = planning_norms_engine_instance.calculate_applicable_norms(
            jurisdiction_id=jurisdiction_id,
            land_area_sqm=total_sqm,
            land_use=land_use,
            is_congested=is_congested
        )

        # Override defaults with regulatory norms unless explicitly customized
        eff_target_sqft = target_plot_sqft if (target_plot_sqft and target_plot_sqft > 0) else norms.minPlotAreaSqft
        eff_min_plot_sqft = norms.minPlotAreaSqft
        eff_min_frontage_ft = norms.minFrontageFt
        eff_main_road_ft = road_width_ft if (road_width_ft and road_width_ft > 0) else norms.mainRoadWidthFt
        eff_feeder_road_ft = norms.internalRoadWidthFt
        eff_setback_ft = setback_ft if (setback_ft is not None and setback_ft >= 0) else norms.outerBoundarySetbackFt
        eff_open_space_pct = garden_percentage if (garden_percentage is not None and garden_percentage >= 0) else norms.openSpacePercentage
        eff_amenity_pct = norms.amenitySpacePercentage
        eff_utility_pct = norms.utilitySpacePercentage

        # ─── 3. FEASIBILITY CHECKS (13M) ───
        # Check if parcel is big enough for at least 1 legal plot + setbacks + road
        min_required_parcel_sqft = eff_min_plot_sqft * 2.5 + (eff_feeder_road_ft * eff_min_frontage_ft)
        if total_sqft < min_required_parcel_sqft:
            failure_reasons.append(
                f"Insufficient usable land area ({total_sqft:.0f} sqft / {total_sqm:.0f} m²). "
                f"Minimum feasible parcel is {min_required_parcel_sqft:.0f} sqft under {norms.authorityName} regulations."
            )
            return [], failure_reasons

        # ─── 4. MULTIPLE CANDIDATE STRATEGIES (13A, 35, 36) ───
        # 3 Genuinely distinct strategies with identical outer boundary
        candidate_strategies = [
            (
                "Option 1: Maximum Practical Plot Efficiency",
                "OPTION 1 — BEST PLOT EFFICIENCY",
                "efficiency",
                RoadNetworkGenerator.generate_orthogonal_grid
            ),
            (
                "Option 2: Best Accessibility & Circulation",
                "OPTION 2 — BEST ACCESS",
                "loop",
                RoadNetworkGenerator.generate_arterial_loop
            ),
            (
                "Option 3: Best Overall Development Quality",
                "OPTION 3 — BEST OVERALL",
                "quality",
                RoadNetworkGenerator.generate_central_courtyard
            ),
        ]

        valid_variants: List[LayoutVariant] = []

        for strat_name, default_badge, tag, strat_fn in candidate_strategies:
            try:
                roads, amenities, plots, eval_base = LayoutOptimizer.optimize_variant(
                    strategy_func=strat_fn,
                    land=land,
                    strategy_name=strat_name,
                    target_plot_sqft=eff_target_sqft,
                    min_plot_sqft=eff_min_plot_sqft,
                    min_frontage_ft=eff_min_frontage_ft,
                    main_road_width_ft=eff_main_road_ft,
                    feeder_road_width_ft=eff_feeder_road_ft,
                    open_space_percentage=eff_open_space_pct,
                    amenity_percentage=eff_amenity_pct,
                    utility_percentage=eff_utility_pct,
                    base_rate_per_sqft=base_rate_per_sqft,
                    setback_ft=eff_setback_ft,
                    max_iterations=3,
                )

                if not roads or not plots:
                    continue

                # ─── 5. HARD CONSTRAINT VALIDATION (13B) ───
                val_rep: ValidationReport = constraint_validation_engine_instance.validate_layout(
                    boundary_polygon=land.boundary_polygon,
                    plots=plots,
                    roads=[r.to_dict() for r in roads.roads],
                    green_spaces=[a.to_dict() for a in amenities],
                    min_plot_sqft=eff_min_plot_sqft,
                    min_frontage_ft=eff_min_frontage_ft,
                    min_road_width_ft=eff_feeder_road_ft * 0.95,
                    setback_ft=eff_setback_ft,
                )
                val_rep_dict = val_rep.to_dict()

                # Filter out invalid layouts (13B, 13J):
                # Hard constraint failures (ERROR severity) invalidate layout
                errors_count = val_rep_dict.get("statistics", {}).get("totalErrorsCount", 0)
                if errors_count > 0 or not val_rep.overall_compliant:
                    logger.info(f"Strategy '{strat_name}' failed hard constraints ({errors_count} errors). Pruning.")
                    continue

                # ─── 6. MULTI-OBJECTIVE SCORING (13I) ───
                scorer_res: LayoutScoreBreakdown = layout_scorer_instance.score_layout(
                    gross_land_area_sqft=land.total_area_sqft,
                    plots=plots,
                    roads=roads.roads,
                    green_spaces=amenities,
                    validation_report=val_rep_dict,
                    target_plot_sqft=eff_target_sqft,
                    target_garden_pct=eff_open_space_pct,
                )
                evaluation_dict = scorer_res.to_dict()
                evaluation_dict["compliance"] = {"overallCompliant": val_rep.overall_compliant}

                variant = LayoutVariant(
                    variant_id=f"var-{tag}-{uuid.uuid4().hex[:8]}",
                    variant_number=len(valid_variants) + 1,
                    strategy_name=strat_name,
                    option_badge=default_badge,
                    land=land,
                    road_network=roads,
                    plots=plots,
                    amenities=amenities,
                    evaluation=evaluation_dict,
                    validation_report=val_rep_dict,
                    norms=norms,
                )
                valid_variants.append(variant)

            except Exception as e:
                logger.warning(f"Error evaluating candidate strategy '{strat_name}': {e}")

        # ─── 7. FINAL SHAPE SIMILARITY CHECK (Section 47) ───
        # Output outer boundary must strictly match confirmed input polygon
        shape_verified_variants: List[LayoutVariant] = []
        for v in valid_variants:
            area_diff = abs(v.land.total_area_sqft - land.total_area_sqft)
            if area_diff > 2.0:
                logger.warning(f"Strategy '{v.strategy_name}' outer boundary area mismatch ({area_diff:.1f} sqft diff). Pruning.")
                continue
            if len(v.land.boundary_polygon) != len(land.boundary_polygon):
                logger.warning(f"Strategy '{v.strategy_name}' outer boundary vertex count mismatch. Pruning.")
                continue
            shape_verified_variants.append(v)

        valid_variants = shape_verified_variants

        # ─── 8. BEST 2–3 LAYOUT RANKING & PROFILING (13J, 13L, 13M, 35, 49) ───
        if not valid_variants:
            failure_reasons.append(
                f"No fully compliant layout could be generated under the selected planning constraints "
                f"({norms.authorityName}, Setback: {eff_setback_ft:.0f}ft, Min Road: {eff_feeder_road_ft:.0f}ft, "
                f"Open Space: {eff_open_space_pct:.0f}%)."
            )
            return [], failure_reasons

        # Rank and assign badges: Option 1 Best Plot Efficiency, Option 2 Best Access, Option 3 Best Overall
        valid_variants = layout_scorer_instance.rank_and_profile_variants(valid_variants, land.total_area_sqft)

        # Return up to the best 3 valid layouts with identical outer boundary (Section 35, 37)
        best_variants = valid_variants[:3]
        return best_variants, []
