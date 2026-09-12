"""
Real-World Scale Calibration Engine.
Calibrates pixel dimensions to physical survey measurements (feet / meters) without arbitrary assumptions.
Supports:
1. Known reference distance between two points: (x1, y1) -> (x2, y2) = D meters/feet
2. Known total gross land area calibration: Polygon Area (px²) -> Total Gross Area (Acres/SqFt/Sqm)
3. Direct scale ratio (e.g., 1:500 at specified DPI)
4. Uncalibrated / Proportional fallback with statutory research disclaimer:
   "Conceptual / proportional layout — real-world dimensions require scale or survey data."
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

SQM_TO_SQFT = 10.7639
ACRES_TO_SQFT = 43560.0
GUNTHA_TO_SQFT = 1089.0  # Common Indian land measure (1 Acre = 40 Gunthas)
HECTARE_TO_SQFT = 107639.1


class ScaleCalibrationResult(BaseModel):
    isCalibrated: bool
    calibrationMethod: str  # TWO_POINT | GROSS_AREA | RATIO_DPI | PROPORTIONAL_FALLBACK
    pixelsPerFoot: float
    pixelsPerMeter: float
    feetPerPixel: float
    metersPerPixel: float
    referenceDistancePhysical: Optional[float] = None
    referenceUnit: str = "FEET"
    displayScaleRatio: str
    statusMessage: str
    isProportionalOnly: bool = False
    disclaimer: str = (
        "Conceptual / proportional layout — real-world dimensions require scale or survey data."
    )


class ScaleCalibrationEngine:
    """Scale Calibration Engine Singleton."""

    DEFAULT_ASSUMED_DENSITY_SQFT_PER_PX = 1.0

    @classmethod
    def calibrate_from_two_points(
        cls,
        point_a: Tuple[float, float],
        point_b: Tuple[float, float],
        known_distance: float,
        unit: str = "FEET"
    ) -> ScaleCalibrationResult:
        """
        Calibrates scale using two selected pixel points and user-entered known distance.
        """
        if known_distance <= 0:
            return cls.get_proportional_fallback("Known distance must be greater than zero.")

        dx = float(point_b[0]) - float(point_a[0])
        dy = float(point_b[1]) - float(point_a[1])
        pixel_distance = math.hypot(dx, dy)

        if pixel_distance < 1.0:
            return cls.get_proportional_fallback("Selected points are too close for meaningful calibration.")

        if unit.upper() in ["METERS", "METER", "M"]:
            px_per_m = pixel_distance / known_distance
            px_per_ft = px_per_m / 3.28084
        else:
            px_per_ft = pixel_distance / known_distance
            px_per_m = px_per_ft * 3.28084

        ft_per_px = 1.0 / max(px_per_ft, 1e-6)
        m_per_px = 1.0 / max(px_per_m, 1e-6)

        return ScaleCalibrationResult(
            isCalibrated=True,
            calibrationMethod="TWO_POINT",
            pixelsPerFoot=round(px_per_ft, 4),
            pixelsPerMeter=round(px_per_m, 4),
            feetPerPixel=round(ft_per_px, 4),
            metersPerPixel=round(m_per_px, 4),
            referenceDistancePhysical=known_distance,
            referenceUnit=unit.upper(),
            displayScaleRatio=f"1 px = {ft_per_px:.2f} ft ({m_per_px:.2f} m)",
            statusMessage=f"Calibrated from 2-point reference baseline ({known_distance} {unit})",
            isProportionalOnly=False,
            disclaimer="Calibrated from user reference distance. Verification by licensed surveyor recommended."
        )

    @classmethod
    def calibrate_from_gross_area(
        cls,
        polygon_pixel_area: float,
        gross_area_value: float,
        area_unit: str = "Acres"
    ) -> ScaleCalibrationResult:
        """
        Calibrates physical scale by equating the polygon area in pixels² to known gross land area.
        """
        if polygon_pixel_area <= 100.0 or gross_area_value <= 0:
            return cls.get_proportional_fallback("Insufficient boundary polygon area or invalid gross area value.")

        unit_clean = area_unit.strip().lower()
        if "acre" in unit_clean:
            target_sqft = gross_area_value * ACRES_TO_SQFT
        elif "guntha" in unit_clean:
            target_sqft = gross_area_value * GUNTHA_TO_SQFT
        elif "hectare" in unit_clean:
            target_sqft = gross_area_value * HECTARE_TO_SQFT
        elif "sqm" in unit_clean or "meter" in unit_clean:
            target_sqft = gross_area_value * SQM_TO_SQFT
        else:
            target_sqft = gross_area_value  # Sq Ft

        # Area ratio: Area_px / Area_ft² = (px / ft)²
        sqft_per_px_sq = target_sqft / polygon_pixel_area
        ft_per_px = math.sqrt(max(sqft_per_px_sq, 1e-6))
        px_per_ft = 1.0 / max(ft_per_px, 1e-6)
        m_per_px = ft_per_px / 3.28084
        px_per_m = px_per_ft * 3.28084

        return ScaleCalibrationResult(
            isCalibrated=True,
            calibrationMethod="GROSS_AREA",
            pixelsPerFoot=round(px_per_ft, 4),
            pixelsPerMeter=round(px_per_m, 4),
            feetPerPixel=round(ft_per_px, 4),
            metersPerPixel=round(m_per_px, 4),
            referenceDistancePhysical=target_sqft,
            referenceUnit="SQFT",
            displayScaleRatio=f"1 px = {ft_per_px:.2f} ft (Total Area: {gross_area_value} {area_unit})",
            statusMessage=f"Calibrated from total gross area ({gross_area_value} {area_unit})",
            isProportionalOnly=False,
            disclaimer="Area-derived physical scale. Survey verification required for legal execution."
        )

    @classmethod
    def get_proportional_fallback(cls, reason: str = "") -> ScaleCalibrationResult:
        """
        Safe default when real-world scale is unknown.
        Treats layout as proportional/conceptual and issues prominent statutory warning.
        """
        # Default proportional baseline: 1 unit = 1 ft in model space
        return ScaleCalibrationResult(
            isCalibrated=False,
            calibrationMethod="PROPORTIONAL_FALLBACK",
            pixelsPerFoot=1.0,
            pixelsPerMeter=3.28084,
            feetPerPixel=1.0,
            metersPerPixel=0.3048,
            referenceDistancePhysical=None,
            referenceUnit="PROPORTIONAL_UNITS",
            displayScaleRatio="1:1 (Proportional / Unscaled)",
            statusMessage=f"Real-world scale unavailable: {reason}".strip(),
            isProportionalOnly=True,
            disclaimer="Conceptual / proportional layout — real-world dimensions require scale or survey data."
        )


scale_calibration_engine_instance = ScaleCalibrationEngine()
