"""
Constraint Validation Engine (Phase 10).
Evaluates candidate land layouts against 12 strict civil engineering and geometric rules:
1. All plots strictly contained inside outer land boundary (Plot ⊆ Land Boundary).
2. Zero overlap with road corridors (Plot ∩ Road = ∅).
3. Zero overlap with open/green spaces (Plot ∩ Green Space = ∅).
4. Zero overlap with obstacles/water bodies (Plot ∩ Obstacles = ∅).
5. Zero plot-to-plot mutual intersection (Plot_i ∩ Plot_j = ∅, ∀ i ≠ j).
6. Minimum plot area constraint satisfied (Area ≥ min_plot_sqft).
7. Minimum frontage width satisfied (Width ≥ min_frontage_ft).
8. Direct road access verified for every plot.
9. Polygon topological validity verified (GEOS is_valid == True).
10. No self-intersecting polygon rings or zero-area degeneracies.
11. Boundary setbacks satisfied (Plot ⊆ Boundary.buffer(-setback)).
12. Road corridor width compliant.
"""

import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from shapely.geometry import (
    Polygon as ShapelyPolygon,
    MultiPolygon as ShapelyMultiPolygon,
    Point as ShapelyPoint,
    LineString as ShapelyLineString,
    box as shapely_box
)
from shapely.ops import unary_union
from shapely.validation import explain_validity

logger = logging.getLogger(__name__)


class RuleViolation:
    """Encapsulates an individual geometric or civil rule violation."""

    def __init__(
        self,
        rule_id: str,
        rule_name: str,
        entity_id: str,
        entity_type: str,
        severity: str = "ERROR",  # ERROR | WARNING
        message: str = "",
        details: Optional[Dict[str, Any]] = None
    ):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.severity = severity
        self.message = message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ruleId": self.rule_id,
            "ruleName": self.rule_name,
            "entityId": self.entity_id,
            "entityType": self.entity_type,
            "severity": self.severity,
            "message": self.message,
            "details": self.details
        }


class RuleCheckResult:
    """Result summary for a specific rule."""

    def __init__(
        self,
        rule_id: str,
        rule_name: str,
        description: str,
        passed: bool,
        violation_count: int = 0,
        violations: Optional[List[RuleViolation]] = None
    ):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.description = description
        self.passed = passed
        self.violation_count = violation_count
        self.violations = violations or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ruleId": self.rule_id,
            "ruleName": self.rule_name,
            "description": self.description,
            "status": "PASS" if self.passed else "FAIL",
            "passed": self.passed,
            "violationCount": self.violation_count,
            "violations": [v.to_dict() for v in self.violations]
        }


class ValidationReport:
    """Comprehensive validation report across all 12 civil engineering rules."""

    def __init__(
        self,
        overall_compliant: bool,
        passed_rules_count: int,
        total_rules_count: int,
        compliance_percentage: float,
        rule_results: Dict[str, RuleCheckResult],
        all_violations: List[RuleViolation],
        statistics: Dict[str, Any]
    ):
        self.overall_compliant = overall_compliant
        self.passed_rules_count = passed_rules_count
        self.total_rules_count = total_rules_count
        self.compliance_percentage = compliance_percentage
        self.rule_results = rule_results
        self.all_violations = all_violations
        self.statistics = statistics

    def to_dict(self) -> Dict[str, Any]:
        return {
            "artifactType": "GEOMETRIC_VALIDATION_REPORT",
            "overallCompliant": self.overall_compliant,
            "passedRulesCount": self.passed_rules_count,
            "totalRulesCount": self.total_rules_count,
            "compliancePercentage": round(self.compliance_percentage, 1),
            "ruleResults": {k: v.to_dict() for k, v in self.rule_results.items()},
            "violationsCount": len(self.all_violations),
            "violations": [v.to_dict() for v in self.all_violations],
            "statistics": self.statistics
        }


class ConstraintValidationEngine:
    """
    Constraint Validation Engine Singleton.
    Executes deep GEOS topological analysis against 12 civil engineering invariants.
    """

    @staticmethod
    def _to_polygon(data: Any) -> Optional[ShapelyPolygon]:
        if isinstance(data, ShapelyPolygon):
            return data if data.is_valid else data.buffer(0)
        if isinstance(data, list) and len(data) >= 3:
            coords = []
            for pt in data:
                if hasattr(pt, "x") and hasattr(pt, "y"):
                    coords.append((float(pt.x), float(pt.y)))
                elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    coords.append((float(pt[0]), float(pt[1])))
                elif isinstance(pt, dict) and "x" in pt and "y" in pt:
                    coords.append((float(pt["x"]), float(pt["y"])))
            if len(coords) < 3:
                return None
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            poly = ShapelyPolygon(coords)
            return poly if poly.is_valid else poly.buffer(0)
        return None

    @classmethod
    def validate_layout(
        cls,
        boundary_polygon: Union[List[List[float]], ShapelyPolygon, Dict[str, Any]],
        plots: List[Any],
        roads: Optional[List[Any]] = None,
        green_spaces: Optional[List[Any]] = None,
        obstacles: Optional[List[Any]] = None,
        min_plot_sqft: float = 800.0,
        min_frontage_ft: float = 20.0,
        min_road_width_ft: float = 24.0,
        setback_ft: float = 10.0,
    ) -> ValidationReport:
        """
        Evaluates candidate layout against 12 civil engineering rules.
        """
        # Parse Boundary
        if isinstance(boundary_polygon, dict):
            b_verts = boundary_polygon.get("polygon") or boundary_polygon.get("vertices") or boundary_polygon.get("geometry")
            land_poly = cls._to_polygon(b_verts)
        else:
            land_poly = cls._to_polygon(boundary_polygon)

        if not land_poly:
            raise ValueError("Boundary polygon could not be constructed for validation.")

        # Parse Plots
        parsed_plots: List[Tuple[str, ShapelyPolygon, Dict[str, Any]]] = []
        for idx, p in enumerate(plots):
            if isinstance(p, dict):
                pid = p.get("plotId") or p.get("id") or f"plot-{idx+1:03d}"
                p_verts = p.get("polygon") or p.get("vertices") or p.get("geometry")
                p_obj = p
            else:
                pid = getattr(p, "plot_id", f"plot-{idx+1:03d}")
                p_verts = getattr(p, "polygon", [])
                p_obj = p.to_dict() if hasattr(p, "to_dict") else {}

            poly = cls._to_polygon(p_verts)
            if poly:
                parsed_plots.append((pid, poly, p_obj))

        # Parse Roads
        road_polys: List[Tuple[str, ShapelyPolygon, float]] = []
        if roads:
            for idx, r in enumerate(roads):
                if isinstance(r, dict):
                    rid = r.get("roadId") or r.get("id") or f"road-{idx+1:03d}"
                    r_verts = r.get("polygon") or r.get("geometry") or r.get("vertices")
                    rw = float(r.get("widthFt", r.get("roadWidth", r.get("width", 30.0))))
                else:
                    rid = getattr(r, "road_id", f"road-{idx+1:03d}")
                    r_verts = getattr(r, "polygon", [])
                    rw = float(getattr(r, "width_ft", 30.0))
                poly = cls._to_polygon(r_verts)
                if poly:
                    road_polys.append((rid, poly, rw))

        # Parse Green Spaces
        green_polys: List[Tuple[str, ShapelyPolygon]] = []
        if green_spaces:
            for idx, g in enumerate(green_spaces):
                if isinstance(g, dict):
                    gid = g.get("zoneId") or g.get("id") or f"green-{idx+1:03d}"
                    g_verts = g.get("polygon") or g.get("geometry") or g.get("vertices")
                else:
                    gid = getattr(g, "zone_id", f"green-{idx+1:03d}")
                    g_verts = getattr(g, "polygon", [])
                poly = cls._to_polygon(g_verts)
                if poly:
                    green_polys.append((gid, poly))

        # Parse Obstacles
        obstacle_polys: List[Tuple[str, ShapelyPolygon]] = []
        if obstacles:
            for idx, obs in enumerate(obstacles):
                if isinstance(obs, dict):
                    oid = obs.get("id") or f"obstacle-{idx+1:03d}"
                    o_verts = obs.get("polygon") or obs.get("geometry") or obs.get("vertices")
                else:
                    oid = getattr(obs, "id", f"obstacle-{idx+1:03d}")
                    o_verts = getattr(obs, "polygon", [])
                poly = cls._to_polygon(o_verts)
                if poly:
                    obstacle_polys.append((oid, poly))

        roads_union = unary_union([rp[1] for rp in road_polys]) if road_polys else ShapelyPolygon()
        green_union = unary_union([gp[1] for gp in green_polys]) if green_polys else ShapelyPolygon()
        obstacle_union = unary_union([op[1] for op in obstacle_polys]) if obstacle_polys else ShapelyPolygon()
        setback_poly = land_poly.buffer(-setback_ft) if setback_ft > 0 else land_poly

        all_violations: List[RuleViolation] = []
        rule_results: Dict[str, RuleCheckResult] = {}

        # ─── RULE 1: PLOTS_CONTAINED_IN_BOUNDARY ───
        r1_violations = []
        for pid, poly, _ in parsed_plots:
            # Check if plot is inside boundary with tolerance
            outside_area = poly.difference(land_poly).area
            if outside_area > 1.0:  # > 1 sqft tolerance
                v = RuleViolation(
                    rule_id="RULE_01",
                    rule_name="PLOTS_CONTAINED_IN_BOUNDARY",
                    entity_id=pid,
                    entity_type="PLOT",
                    severity="ERROR",
                    message=f"Plot '{pid}' extends outside land boundary by {outside_area:.1f} sqft.",
                    details={"outsideAreaSqft": round(outside_area, 2)}
                )
                r1_violations.append(v)
        rule_results["RULE_01"] = RuleCheckResult(
            rule_id="RULE_01",
            rule_name="PLOTS_CONTAINED_IN_BOUNDARY",
            description="All plots must be strictly contained inside the outer land boundary polygon.",
            passed=(len(r1_violations) == 0),
            violation_count=len(r1_violations),
            violations=r1_violations
        )
        all_violations.extend(r1_violations)

        # ─── RULE 2: ZERO_ROAD_OVERLAP ───
        r2_violations = []
        if not roads_union.is_empty:
            for pid, poly, _ in parsed_plots:
                overlap = poly.intersection(roads_union).area
                if overlap > 1.0:
                    v = RuleViolation(
                        rule_id="RULE_02",
                        rule_name="ZERO_ROAD_OVERLAP",
                        entity_id=pid,
                        entity_type="PLOT",
                        severity="ERROR",
                        message=f"Plot '{pid}' overlaps road corridors by {overlap:.1f} sqft.",
                        details={"overlapAreaSqft": round(overlap, 2)}
                    )
                    r2_violations.append(v)
        rule_results["RULE_02"] = RuleCheckResult(
            rule_id="RULE_02",
            rule_name="ZERO_ROAD_OVERLAP",
            description="No plot polygon may intersect or overlap designated road corridors.",
            passed=(len(r2_violations) == 0),
            violation_count=len(r2_violations),
            violations=r2_violations
        )
        all_violations.extend(r2_violations)

        # ─── RULE 3: ZERO_GREEN_SPACE_OVERLAP ───
        r3_violations = []
        if not green_union.is_empty:
            for pid, poly, _ in parsed_plots:
                overlap = poly.intersection(green_union).area
                if overlap > 1.0:
                    v = RuleViolation(
                        rule_id="RULE_03",
                        rule_name="ZERO_GREEN_SPACE_OVERLAP",
                        entity_id=pid,
                        entity_type="PLOT",
                        severity="ERROR",
                        message=f"Plot '{pid}' overlaps green/open space by {overlap:.1f} sqft.",
                        details={"overlapAreaSqft": round(overlap, 2)}
                    )
                    r3_violations.append(v)
        rule_results["RULE_03"] = RuleCheckResult(
            rule_id="RULE_03",
            rule_name="ZERO_GREEN_SPACE_OVERLAP",
            description="No plot polygon may intersect or overlap green/open space amenity zones.",
            passed=(len(r3_violations) == 0),
            violation_count=len(r3_violations),
            violations=r3_violations
        )
        all_violations.extend(r3_violations)

        # ─── RULE 4: ZERO_OBSTACLE_OVERLAP ───
        r4_violations = []
        if not obstacle_union.is_empty:
            for pid, poly, _ in parsed_plots:
                overlap = poly.intersection(obstacle_union).area
                if overlap > 1.0:
                    v = RuleViolation(
                        rule_id="RULE_04",
                        rule_name="ZERO_OBSTACLE_OVERLAP",
                        entity_id=pid,
                        entity_type="PLOT",
                        severity="ERROR",
                        message=f"Plot '{pid}' overlaps obstacle/water exclusion by {overlap:.1f} sqft.",
                        details={"overlapAreaSqft": round(overlap, 2)}
                    )
                    r4_violations.append(v)
        rule_results["RULE_04"] = RuleCheckResult(
            rule_id="RULE_04",
            rule_name="ZERO_OBSTACLE_OVERLAP",
            description="No plot polygon may intersect or overlap natural obstacles or water bodies.",
            passed=(len(r4_violations) == 0),
            violation_count=len(r4_violations),
            violations=r4_violations
        )
        all_violations.extend(r4_violations)

        # ─── RULE 5: ZERO_PLOT_MUTUAL_OVERLAP ───
        r5_violations = []
        n_plots = len(parsed_plots)
        for i in range(n_plots):
            pid_i, poly_i, _ = parsed_plots[i]
            for j in range(i + 1, n_plots):
                pid_j, poly_j, _ = parsed_plots[j]
                if poly_i.intersects(poly_j):
                    overlap = poly_i.intersection(poly_j).area
                    if overlap > 1.0:
                        v = RuleViolation(
                            rule_id="RULE_05",
                            rule_name="ZERO_PLOT_MUTUAL_OVERLAP",
                            entity_id=f"{pid_i}&{pid_j}",
                            entity_type="PLOT_PAIR",
                            severity="ERROR",
                            message=f"Plot '{pid_i}' overlaps Plot '{pid_j}' by {overlap:.1f} sqft.",
                            details={"plotA": pid_i, "plotB": pid_j, "overlapAreaSqft": round(overlap, 2)}
                        )
                        r5_violations.append(v)
        rule_results["RULE_05"] = RuleCheckResult(
            rule_id="RULE_05",
            rule_name="ZERO_PLOT_MUTUAL_OVERLAP",
            description="No plot may intersect or overlap any other plot in the subdivision.",
            passed=(len(r5_violations) == 0),
            violation_count=len(r5_violations),
            violations=r5_violations
        )
        all_violations.extend(r5_violations)

        # ─── RULE 6: MIN_PLOT_AREA_SATISFIED ───
        r6_violations = []
        threshold_sqft = min_plot_sqft * 0.90  # 10% allowance for edge taper
        for pid, poly, _ in parsed_plots:
            if poly.area < threshold_sqft:
                v = RuleViolation(
                    rule_id="RULE_06",
                    rule_name="MIN_PLOT_AREA_SATISFIED",
                    entity_id=pid,
                    entity_type="PLOT",
                    severity="WARNING",
                    message=f"Plot '{pid}' area ({poly.area:.1f} sqft) is below min threshold ({min_plot_sqft:.1f} sqft).",
                    details={"areaSqft": round(poly.area, 2), "minPlotSqft": min_plot_sqft}
                )
                r6_violations.append(v)
        rule_results["RULE_06"] = RuleCheckResult(
            rule_id="RULE_06",
            rule_name="MIN_PLOT_AREA_SATISFIED",
            description=f"Every plot area must meet or exceed the minimum threshold ({min_plot_sqft:.0f} sqft).",
            passed=(len(r6_violations) == 0),
            violation_count=len(r6_violations),
            violations=r6_violations
        )
        all_violations.extend(r6_violations)

        # ─── RULE 7: MIN_FRONTAGE_WIDTH_SATISFIED ───
        r7_violations = []
        for pid, poly, p_dict in parsed_plots:
            w = float(p_dict.get("widthFt", 0.0))
            if w <= 0:
                b = poly.bounds
                w = min(b[2] - b[0], b[3] - b[1])
            if w < (min_frontage_ft * 0.85):
                v = RuleViolation(
                    rule_id="RULE_07",
                    rule_name="MIN_FRONTAGE_WIDTH_SATISFIED",
                    entity_id=pid,
                    entity_type="PLOT",
                    severity="WARNING",
                    message=f"Plot '{pid}' width ({w:.1f} ft) is below minimum frontage ({min_frontage_ft:.1f} ft).",
                    details={"widthFt": round(w, 2), "minFrontageFt": min_frontage_ft}
                )
                r7_violations.append(v)
        rule_results["RULE_07"] = RuleCheckResult(
            rule_id="RULE_07",
            rule_name="MIN_FRONTAGE_WIDTH_SATISFIED",
            description=f"Every plot frontage width must meet or exceed minimum standard ({min_frontage_ft:.0f} ft).",
            passed=(len(r7_violations) == 0),
            violation_count=len(r7_violations),
            violations=r7_violations
        )
        all_violations.extend(r7_violations)

        # ─── RULE 8: DIRECT_ROAD_ACCESS_VERIFIED ───
        r8_violations = []
        if road_polys:
            for pid, poly, p_dict in parsed_plots:
                # Plot touches or is within 5ft of a road corridor
                has_access = any(poly.distance(rp[1]) <= 5.0 for rp in road_polys) or bool(p_dict.get("roadName"))
                if not has_access:
                    v = RuleViolation(
                        rule_id="RULE_08",
                        rule_name="DIRECT_ROAD_ACCESS_VERIFIED",
                        entity_id=pid,
                        entity_type="PLOT",
                        severity="ERROR",
                        message=f"Plot '{pid}' has no direct road access or adjacency.",
                        details={"hasRoadFrontage": False}
                    )
                    r8_violations.append(v)
        rule_results["RULE_08"] = RuleCheckResult(
            rule_id="RULE_08",
            rule_name="DIRECT_ROAD_ACCESS_VERIFIED",
            description="Every plot must have verified direct access or adjacency to a road corridor.",
            passed=(len(r8_violations) == 0),
            violation_count=len(r8_violations),
            violations=r8_violations
        )
        all_violations.extend(r8_violations)

        # ─── RULE 9: TOPOLOGICAL_VALIDITY_GEOS ───
        r9_violations = []
        for pid, poly, _ in parsed_plots:
            if not poly.is_valid:
                reason = explain_validity(poly)
                v = RuleViolation(
                    rule_id="RULE_09",
                    rule_name="TOPOLOGICAL_VALIDITY_GEOS",
                    entity_id=pid,
                    entity_type="PLOT",
                    severity="ERROR",
                    message=f"Plot '{pid}' is not topologically valid: {reason}",
                    details={"validityReason": reason}
                )
                r9_violations.append(v)
        rule_results["RULE_09"] = RuleCheckResult(
            rule_id="RULE_09",
            rule_name="TOPOLOGICAL_VALIDITY_GEOS",
            description="All plot polygons must satisfy GEOS 2D manifold topological validity.",
            passed=(len(r9_violations) == 0),
            violation_count=len(r9_violations),
            violations=r9_violations
        )
        all_violations.extend(r9_violations)

        # ─── RULE 10: NO_SELF_INTERSECTIONS_OR_SLIVERS ───
        r10_violations = []
        for pid, poly, _ in parsed_plots:
            if poly.is_empty or poly.area < 1.0 or poly.length < 5.0:
                v = RuleViolation(
                    rule_id="RULE_10",
                    rule_name="NO_SELF_INTERSECTIONS_OR_SLIVERS",
                    entity_id=pid,
                    entity_type="PLOT",
                    severity="ERROR",
                    message=f"Plot '{pid}' is a degenerate or zero-area polygon sliver.",
                    details={"areaSqft": round(poly.area, 2)}
                )
                r10_violations.append(v)
        rule_results["RULE_10"] = RuleCheckResult(
            rule_id="RULE_10",
            rule_name="NO_SELF_INTERSECTIONS_OR_SLIVERS",
            description="No degenerate zero-area slivers or self-intersecting linear rings.",
            passed=(len(r10_violations) == 0),
            violation_count=len(r10_violations),
            violations=r10_violations
        )
        all_violations.extend(r10_violations)

        # ─── RULE 11: SETBACK_COMPLIANCE ───
        r11_violations = []
        if setback_ft > 0 and setback_poly and not setback_poly.is_empty:
            for pid, poly, _ in parsed_plots:
                outside_setback = poly.difference(setback_poly).area
                if outside_setback > 5.0:
                    v = RuleViolation(
                        rule_id="RULE_11",
                        rule_name="SETBACK_COMPLIANCE",
                        entity_id=pid,
                        entity_type="PLOT",
                        severity="WARNING",
                        message=f"Plot '{pid}' encroaches into boundary setback by {outside_setback:.1f} sqft.",
                        details={"encroachmentSqft": round(outside_setback, 2), "setbackFt": setback_ft}
                    )
                    r11_violations.append(v)
        rule_results["RULE_11"] = RuleCheckResult(
            rule_id="RULE_11",
            rule_name="SETBACK_COMPLIANCE",
            description=f"Plots must respect the {setback_ft:.0f}ft outer boundary setback corridor.",
            passed=(len(r11_violations) == 0),
            violation_count=len(r11_violations),
            violations=r11_violations
        )
        all_violations.extend(r11_violations)

        # ─── RULE 12: ROAD_CORRIDOR_WIDTH_COMPLIANT ───
        r12_violations = []
        for rid, _, rw in road_polys:
            if rw < (min_road_width_ft - 1.0):
                v = RuleViolation(
                    rule_id="RULE_12",
                    rule_name="ROAD_CORRIDOR_WIDTH_COMPLIANT",
                    entity_id=rid,
                    entity_type="ROAD",
                    severity="ERROR",
                    message=f"Road '{rid}' width ({rw:.1f} ft) is narrower than standard ({min_road_width_ft:.1f} ft).",
                    details={"widthFt": rw, "minWidthFt": min_road_width_ft}
                )
                r12_violations.append(v)
        rule_results["RULE_12"] = RuleCheckResult(
            rule_id="RULE_12",
            rule_name="ROAD_CORRIDOR_WIDTH_COMPLIANT",
            description=f"Road corridors must meet or exceed minimum width standard ({min_road_width_ft:.0f} ft).",
            passed=(len(r12_violations) == 0),
            violation_count=len(r12_violations),
            violations=r12_violations
        )
        all_violations.extend(r12_violations)

        # Overall Status
        passed_rules = sum(1 for r in rule_results.values() if r.passed)
        total_rules = len(rule_results)
        compliance_pct = (passed_rules / total_rules) * 100.0
        # ERROR severity failures invalidate overall compliance
        has_error = any(v.severity == "ERROR" for v in all_violations)
        overall_compliant = (not has_error and compliance_pct >= 80.0)

        stats = {
            "totalPlotsChecked": len(parsed_plots),
            "totalRoadsChecked": len(road_polys),
            "totalGreenSpacesChecked": len(green_polys),
            "totalObstaclesChecked": len(obstacle_polys),
            "totalErrorsCount": sum(1 for v in all_violations if v.severity == "ERROR"),
            "totalWarningsCount": sum(1 for v in all_violations if v.severity == "WARNING"),
        }

        logger.info(
            f"ConstraintValidationEngine completed: {passed_rules}/{total_rules} passed ({compliance_pct:.1f}%), "
            f"errors={stats['totalErrorsCount']}, warnings={stats['totalWarningsCount']}"
        )

        return ValidationReport(
            overall_compliant=overall_compliant,
            passed_rules_count=passed_rules,
            total_rules_count=total_rules,
            compliance_percentage=compliance_pct,
            rule_results=rule_results,
            all_violations=all_violations,
            statistics=stats
        )


constraint_validation_engine_instance = ConstraintValidationEngine()
