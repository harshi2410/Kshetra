"""
Layout Generation & Planning Norms API Endpoints (13A - 13O).

Endpoints:
GET  /api/v1/planning-norms/jurisdictions          — List Maharashtra Planning Authorities (13C)
POST /api/v1/planning-norms/evaluate               — Compute UDCPR statutory reservations & dimensions (13C, 13D)
POST /api/v1/projects/{project_id}/generate-layouts — Generate Best 2-3 genuine alternative layouts (13A, 13J)
GET  /api/v1/projects/{project_id}/variants        — List generated variants
GET  /api/v1/projects/{project_id}/variants/{vid}/svg  — Get SVG 2D plan for a variant (13K)
GET  /api/v1/projects/{project_id}/variants/{vid}/model — Get complete Model JSON for a variant
POST /api/v1/projects/{project_id}/variants/{vid}/select — Select active master layout
"""

import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.project import Project, GeneratedLayoutVariant, ProjectPlot
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine, render_svg_from_layout_model
from app.engine.layout_exporter import LayoutExporter
from app.engine.planning_norms_engine import planning_norms_engine_instance, DynamicPlanningNormsEvaluation

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────── Schemas ────────────────────────────────

class EntryPointInput(BaseModel):
    edge: str = Field("SOUTH", description="NORTH, SOUTH, EAST, WEST")
    offsetPercent: float = Field(50.0, description="Position along edge as percentage (0-100)")
    widthFt: Optional[float] = None


class EvaluatePlanningNormsRequest(BaseModel):
    jurisdictionId: Optional[str] = Field("IN_MH_PMC", description="Selected Maharashtra Planning Authority ID")
    landAreaSqm: Optional[float] = Field(None, description="Land area in square meters")
    landAreaSqft: Optional[float] = Field(None, description="Land area in square feet")
    landUse: str = Field("RESIDENTIAL", description="RESIDENTIAL | MIXED_USE | COMMERCIAL | AFFORDABLE")
    isCongested: bool = Field(False, description="Congested / Gaothan core area vs non-congested")


class GenerateLayoutsRequest(BaseModel):
    lengthFt: float = Field(..., description="Land length in feet", gt=0)
    breadthFt: float = Field(..., description="Land breadth in feet", gt=0)
    entryPoints: Optional[List[EntryPointInput]] = None
    polygonVertices: Optional[List[List[float]]] = None

    # Maharashtra Planning Jurisdiction & Rules (13C)
    jurisdictionId: Optional[str] = Field("IN_MH_PMC", description="Maharashtra Planning Authority")
    cityArea: Optional[str] = Field("Pune", description="City, Taluka or District")
    landUse: Optional[str] = Field("RESIDENTIAL", description="Residential, Mixed, Commercial")
    isCongested: Optional[bool] = Field(False, description="Is Gaothan/Congested Core")
    planningRegulation: Optional[str] = Field("UDCPR_2020", description="Applicable Regulation")

    # Optional Parameter Overrides
    targetPlotSqft: Optional[float] = Field(None, description="Desired plot area in sqft (default from norms)")
    roadWidthFt: Optional[float] = Field(None, description="Main road width in feet")
    gardenPercentage: Optional[float] = Field(None, description="Recreational open-space % override")
    setbackFt: Optional[float] = Field(None, description="Setback buffer override")


class VariantSummary(BaseModel):
    id: str
    variantNumber: int
    strategyName: str
    optionBadge: str  # OPTION 1 — BEST OVERALL | OPTION 2 — BEST ACCESS | OPTION 3 — BEST LAND UTILIZATION
    totalPlots: int
    averagePlotAreaSqft: float
    averagePlotAreaSqm: float
    totalRoadAreaSqft: float
    totalRoadAreaSqm: float
    totalOpenSpaceAreaSqft: float
    totalOpenSpaceAreaSqm: float
    totalAmenityAreaSqft: float
    totalAmenityAreaSqm: float
    utilizationPercent: float
    compositeScore: Optional[float] = 0.0
    complianceStatus: str = "PASS"
    evaluation: Optional[Dict[str, Any]] = None
    isSelected: bool


# ──────────────────────────────── Planning Norms Endpoints ────────────────────────────────

@router.get("/planning-norms/jurisdictions")
def get_planning_jurisdictions():
    """Returns all supported Maharashtra planning authorities and regulations (13C)."""
    authorities = planning_norms_engine_instance.list_maharashtra_authorities()
    presets = planning_norms_engine_instance.list_presets()
    return {
        "state": "Maharashtra",
        "primaryRegulation": "Unified Development Control and Promotion Regulations for Maharashtra State (UDCPR 2020)",
        "authorities": authorities,
        "presets": presets,
    }


@router.post("/planning-norms/evaluate")
def evaluate_planning_norms(req: EvaluatePlanningNormsRequest):
    """
    Computes statutory space allocations (setbacks, road widths, open space, amenity space, utilities)
    under Maharashtra UDCPR based on parcel size tiers (13C, 13D).
    """
    area_sqm = req.landAreaSqm
    if area_sqm is None:
        if req.landAreaSqft is not None:
            area_sqm = req.landAreaSqft * 0.09290304
        else:
            area_sqm = 10000.0

    eval_result: DynamicPlanningNormsEvaluation = planning_norms_engine_instance.calculate_applicable_norms(
        jurisdiction_id=req.jurisdictionId,
        land_area_sqm=area_sqm,
        land_use=req.landUse,
        is_congested=req.isCongested
    )

    return eval_result.model_dump()


# ──────────────────────────────── Layout Generation Endpoints ────────────────────────────────

@router.post("/projects/{project_id}/generate-layouts")
def generate_layouts(project_id: str, req: GenerateLayoutsRequest, db: Session = Depends(get_db)):
    """
    Trigger auto-layout generation for a project (13A - 13O).
    Generates the Best 2-3 genuine alternative design variants, applies Maharashtra UDCPR rules,
    enforces hard constraints, and scores candidates.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # Update project with land input params
    project.land_length_ft = req.lengthFt
    project.land_breadth_ft = req.breadthFt
    if req.targetPlotSqft:
        project.desired_plot_size_sqft = req.targetPlotSqft
    if req.roadWidthFt:
        project.road_width_ft = req.roadWidthFt
    if req.gardenPercentage is not None:
        project.garden_percentage = req.gardenPercentage
    if req.setbackFt is not None:
        project.setback_ft = req.setbackFt

    project.generation_mode = "AUTO_GENERATE"
    project.status = "GENERATING"

    if req.entryPoints:
        project.entry_points_json = json.dumps([ep.model_dump() for ep in req.entryPoints])
    if req.polygonVertices:
        project.land_polygon_json = json.dumps(req.polygonVertices)

    db.commit()

    # Clear previous variants for clean generation
    db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == project_id
    ).delete()
    db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).delete()
    db.commit()

    # Execute Master Engine Pipeline
    engine = LayoutGeneratorEngine()
    entry_edges = None
    if req.entryPoints:
        entry_edges = [
            {"edge": ep.edge, "offsetPercent": ep.offsetPercent, "widthFt": ep.widthFt or req.roadWidthFt}
            for ep in req.entryPoints
        ]

    variants, failure_reasons = engine.generate_all_variants(
        length_ft=req.lengthFt,
        breadth_ft=req.breadthFt,
        polygon_vertices=req.polygonVertices,
        entry_edges=entry_edges,
        jurisdiction_id=req.jurisdictionId,
        city_area=req.cityArea,
        land_use=req.landUse or "RESIDENTIAL",
        is_congested=bool(req.isCongested),
        planning_regulation=req.planningRegulation,
        target_plot_sqft=req.targetPlotSqft,
        road_width_ft=req.roadWidthFt,
        garden_percentage=req.gardenPercentage,
        setback_ft=req.setbackFt,
    )

    # Handle Section 13M: If no valid layout exists
    if not variants:
        project.status = "ACTIVE"
        db.commit()
        return {
            "projectId": project_id,
            "validOptionsCount": 0,
            "message": "No fully compliant layout could be generated under the selected planning constraints.",
            "failureReasons": failure_reasons,
            "variants": [],
        }

    # Save valid variants to database (13J: Best 2-3 layouts)
    saved_summaries: List[VariantSummary] = []
    for i, v in enumerate(variants):
        is_first = (i == 0)
        db_variant = GeneratedLayoutVariant(
            id=v.id,
            project_id=project_id,
            variant_number=v.variant_number,
            strategy_name=v.strategy_name,
            layout_model_json=json.dumps(v.to_layout_model()),
            svg_content=v.to_svg(),
            total_plots=v.total_plots,
            total_area_sqft=v.land.total_area_sqft,
            utilization_percent=v.utilization_percent,
            is_selected=is_first,
        )
        db.add(db_variant)

        stats = v.statistics
        saved_summaries.append(VariantSummary(
            id=v.id,
            variantNumber=v.variant_number,
            strategyName=v.strategy_name,
            optionBadge=v.option_badge,
            totalPlots=v.total_plots,
            averagePlotAreaSqft=stats.get("averagePlotAreaSqft", 0),
            averagePlotAreaSqm=stats.get("averagePlotAreaSqm", 0),
            totalRoadAreaSqft=stats.get("totalRoadAreaSqft", 0),
            totalRoadAreaSqm=stats.get("totalRoadAreaSqm", 0),
            totalOpenSpaceAreaSqft=stats.get("totalOpenSpaceAreaSqft", 0),
            totalOpenSpaceAreaSqm=stats.get("totalOpenSpaceAreaSqm", 0),
            totalAmenityAreaSqft=stats.get("totalAmenityAreaSqft", 0),
            totalAmenityAreaSqm=stats.get("totalAmenityAreaSqm", 0),
            utilizationPercent=v.utilization_percent,
            compositeScore=v.evaluation.get("compositeScore", 0.0),
            complianceStatus=stats.get("complianceStatus", "PASS"),
            evaluation=v.evaluation,
            isSelected=is_first,
        ))

        # If it's the first variant, persist plots to project_plots
        if is_first:
            for p in v.plots:
                poly_coords = [[pt.x, pt.y] for pt in p.polygon]
                if poly_coords and poly_coords[0] != poly_coords[-1]:
                    poly_coords.append(poly_coords[0])

                geojson = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [poly_coords],
                    },
                    "properties": {
                        "plotNumber": p.plot_number,
                        "areaSqft": p.area_sqft,
                        "areaSqm": p.area_sqm,
                        "facing": p.facing,
                        "dimensions": p.dimensions_display,
                        "isCorner": p.is_corner,
                    },
                }

                db_plot = ProjectPlot(
                    project_id=project_id,
                    plot_number=p.plot_number,
                    polygon_geojson=json.dumps(geojson),
                    calculated_area_sqft=p.area_sqft,
                    facing_direction=p.facing,
                    centroid_x=p.centroid.x,
                    centroid_y=p.centroid.y,
                    status=p.status,
                    base_price=p.estimated_price,
                    notes=f"{p.dimensions_display}, {p.road_name}",
                )
                db.add(db_plot)

    project.status = "ACTIVE"
    db.commit()

    return {
        "projectId": project_id,
        "validOptionsCount": len(saved_summaries),
        "message": f"Successfully generated {len(saved_summaries)} valid layout options under Maharashtra UDCPR norms.",
        "failureReasons": [],
        "variants": saved_summaries,
    }


@router.get("/projects/{project_id}/variants", response_model=List[VariantSummary])
def list_variants(project_id: str, db: Session = Depends(get_db)):
    """List all generated layout variants for a project (13J)."""
    variants = (
        db.query(GeneratedLayoutVariant)
        .filter(GeneratedLayoutVariant.project_id == project_id)
        .order_by(GeneratedLayoutVariant.variant_number)
        .all()
    )

    summaries = []
    for v in variants:
        try:
            model = json.loads(v.layout_model_json)
            stats = model.get("statistics", {})
            eval_dict = model.get("evaluation", {})
            badge = model.get("optionBadge") or stats.get("optionBadge") or f"OPTION {v.variant_number}"
        except Exception:
            stats = {}
            eval_dict = {}
            badge = f"OPTION {v.variant_number}"

        summaries.append(VariantSummary(
            id=v.id,
            variantNumber=v.variant_number,
            strategyName=v.strategy_name,
            optionBadge=badge,
            totalPlots=v.total_plots,
            averagePlotAreaSqft=stats.get("averagePlotAreaSqft", 0),
            averagePlotAreaSqm=stats.get("averagePlotAreaSqm", 0),
            totalRoadAreaSqft=stats.get("totalRoadAreaSqft", 0),
            totalRoadAreaSqm=stats.get("totalRoadAreaSqm", 0),
            totalOpenSpaceAreaSqft=stats.get("totalOpenSpaceAreaSqft", 0),
            totalOpenSpaceAreaSqm=stats.get("totalOpenSpaceAreaSqm", 0),
            totalAmenityAreaSqft=stats.get("totalAmenityAreaSqft", 0),
            totalAmenityAreaSqm=stats.get("totalAmenityAreaSqm", 0),
            utilizationPercent=v.utilization_percent or 0,
            compositeScore=stats.get("compositeScore", eval_dict.get("compositeScore", 0.0)),
            complianceStatus=stats.get("complianceStatus", "PASS"),
            evaluation=eval_dict,
            isSelected=v.is_selected,
        ))

    return summaries


@router.get("/projects/{project_id}/variants/{variant_id}/svg")
def get_variant_svg(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Get the rendered 2D vector SVG plan for a specific layout variant (13K)."""
    variant = (
        db.query(GeneratedLayoutVariant)
        .filter(
            GeneratedLayoutVariant.project_id == project_id,
            GeneratedLayoutVariant.id == variant_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    svg_content = variant.svg_content
    if variant.layout_model_json:
        try:
            model = json.loads(variant.layout_model_json)
            fresh_svg = render_svg_from_layout_model(model)
            if fresh_svg:
                svg_content = fresh_svg
                if variant.svg_content != fresh_svg:
                    variant.svg_content = fresh_svg
                    db.commit()
        except Exception as e:
            logger.warning(f"Error rendering fresh SVG: {e}")

    return {
        "projectId": project_id,
        "variantId": variant.id,
        "variantNumber": variant.variant_number,
        "strategyName": variant.strategy_name,
        "svgContent": svg_content,
    }


@router.get("/projects/{project_id}/variants/{variant_id}/model")
def get_variant_model(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Get the complete layout model JSON for a specific variant."""
    variant = (
        db.query(GeneratedLayoutVariant)
        .filter(
            GeneratedLayoutVariant.project_id == project_id,
            GeneratedLayoutVariant.id == variant_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    return json.loads(variant.layout_model_json)


@router.post("/projects/{project_id}/variants/{variant_id}/select")
def select_variant(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """
    Select a variant as the project's active layout (13N).
    Clears existing project_plots and repopulates them from the selected variant.
    """
    variants = (
        db.query(GeneratedLayoutVariant)
        .filter(GeneratedLayoutVariant.project_id == project_id)
        .all()
    )

    selected = None
    for v in variants:
        if v.id == variant_id:
            v.is_selected = True
            selected = v
        else:
            v.is_selected = False

    if not selected:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    # Repopulate project_plots from the selected variant
    db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).delete()

    model = json.loads(selected.layout_model_json)
    plots_data = model.get("plots", [])
    for p in plots_data:
        poly_pts = p.get("polygon", [])
        poly_coords = [[pt["x"], pt["y"]] for pt in poly_pts]
        if poly_coords and poly_coords[0] != poly_coords[-1]:
            poly_coords.append(poly_coords[0])

        geojson = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [poly_coords],
            },
            "properties": {
                "plotNumber": p.get("plotNumber"),
                "areaSqft": p.get("areaSqft"),
                "areaSqm": p.get("areaSqm"),
                "facing": p.get("facing"),
                "dimensions": p.get("dimensionsDisplay") or p.get("dimensions"),
                "isCorner": p.get("isCorner"),
            },
        }

        cx = sum(pt["x"] for pt in poly_pts) / max(1, len(poly_pts))
        cy = sum(pt["y"] for pt in poly_pts) / max(1, len(poly_pts))

        db_plot = ProjectPlot(
            project_id=project_id,
            plot_number=p.get("plotNumber", "P-000"),
            polygon_geojson=json.dumps(geojson),
            calculated_area_sqft=p.get("areaSqft"),
            facing_direction=p.get("facing", "NORTH"),
            centroid_x=cx,
            centroid_y=cy,
            status=p.get("status", "AVAILABLE"),
            base_price=p.get("estimatedPrice", 0),
            notes=f"{p.get('dimensionsDisplay', '')}, {p.get('roadName', '')}",
        )
        db.add(db_plot)

    db.commit()

    return {
        "projectId": project_id,
        "selectedVariantId": variant_id,
        "message": f"Variant '{selected.strategy_name}' selected as primary layout",
        "totalPlots": len(plots_data),
    }


@router.get("/projects/{project_id}/variants/{variant_id}/export/dxf")
def export_variant_dxf(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Export the layout variant to AutoCAD DXF format."""
    variant = db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == project_id,
        GeneratedLayoutVariant.id == variant_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    model = json.loads(variant.layout_model_json)
    dxf_bytes = LayoutExporter.export_dxf(model, project_name=f"Project_{project_id}")

    return Response(
        content=dxf_bytes,
        media_type="application/dxf",
        headers={"Content-Disposition": f"attachment; filename=layout_{variant_id}.dxf"}
    )


@router.get("/projects/{project_id}/variants/{variant_id}/export/geojson")
def export_variant_geojson(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Export the layout variant to RFC 7946 GeoJSON FeatureCollection."""
    variant = db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == project_id,
        GeneratedLayoutVariant.id == variant_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    model = json.loads(variant.layout_model_json)
    return LayoutExporter.export_geojson(model)


@router.get("/projects/{project_id}/variants/{variant_id}/export/csv")
def export_variant_csv(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Export the plot schedule and bill of quantities as CSV."""
    variant = db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == project_id,
        GeneratedLayoutVariant.id == variant_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found")

    model = json.loads(variant.layout_model_json)
    csv_str = LayoutExporter.export_csv_inventory(model)

    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=plot_schedule_{variant_id}.csv"}
    )
