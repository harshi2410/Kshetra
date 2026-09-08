"""
Layout Generation API Endpoints.

POST /api/v1/projects/{project_id}/generate-layouts  — Trigger layout generation
GET  /api/v1/projects/{project_id}/variants           — List generated variants
GET  /api/v1/projects/{project_id}/variants/{vid}/svg  — Get SVG for a variant
GET  /api/v1/projects/{project_id}/variants/{vid}/model — Get Model JSON for a variant
POST /api/v1/projects/{project_id}/variants/{vid}/select — Select a variant
"""

import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.project import Project, GeneratedLayoutVariant, ProjectPlot
from app.engine.layout_generator.layout_generator_engine import LayoutGeneratorEngine
from app.engine.layout_exporter import LayoutExporter

logger = logging.getLogger(__name__)
router = APIRouter()


# ──────────────────────────────── Schemas ────────────────────────────────

class EntryPointInput(BaseModel):
    edge: str = Field("SOUTH", description="NORTH, SOUTH, EAST, WEST")
    offsetPercent: float = Field(50.0, description="Position along edge as percentage (0-100)")
    widthFt: Optional[float] = None


class GenerateLayoutsRequest(BaseModel):
    lengthFt: float = Field(..., description="Land length in feet", gt=0)
    breadthFt: float = Field(..., description="Land breadth in feet", gt=0)
    entryPoints: Optional[List[EntryPointInput]] = None
    polygonVertices: Optional[List[List[float]]] = None
    targetPlotSqft: float = Field(1200.0, description="Desired plot area in sqft", gt=0)
    roadWidthFt: float = Field(30.0, description="Road width in feet", gt=0)
    gardenPercentage: float = Field(10.0, description="Garden/open-space percentage", ge=0, le=50)


class VariantSummary(BaseModel):
    id: str
    variantNumber: int
    strategyName: str
    totalPlots: int
    averagePlotAreaSqft: float
    totalRoadAreaSqft: float
    utilizationPercent: float
    compositeScore: Optional[float] = 0.0
    evaluation: Optional[Dict[str, Any]] = None
    isSelected: bool


# ──────────────────────────────── Endpoints ────────────────────────────────

@router.post("/projects/{project_id}/generate-layouts")
def generate_layouts(project_id: str, req: GenerateLayoutsRequest, db: Session = Depends(get_db)):
    """
    Trigger auto-layout generation for a project.
    Generates 4 distinct design variants with different road strategies,
    evaluates them against civil engineering criteria, stores them in the database,
    and returns scored variant summaries.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # Update project with land input params
    project.land_length_ft = req.lengthFt
    project.land_breadth_ft = req.breadthFt
    project.desired_plot_size_sqft = req.targetPlotSqft
    project.road_width_ft = req.roadWidthFt
    project.garden_percentage = req.gardenPercentage
    project.generation_mode = "AUTO_GENERATE"
    project.status = "GENERATING"

    if req.entryPoints:
        project.entry_points_json = json.dumps([ep.dict() for ep in req.entryPoints])
    if req.polygonVertices:
        project.land_polygon_json = json.dumps(req.polygonVertices)

    db.commit()

    # Delete old variants for this project
    db.query(GeneratedLayoutVariant).filter(
        GeneratedLayoutVariant.project_id == project_id
    ).delete()
    db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).delete()
    db.commit()

    # Generate layouts
    engine = LayoutGeneratorEngine()
    entry_edges = None
    if req.entryPoints:
        entry_edges = [{"edge": ep.edge, "offsetPercent": ep.offsetPercent, "widthFt": ep.widthFt or req.roadWidthFt} for ep in req.entryPoints]

    variants = engine.generate_all_variants(
        length_ft=req.lengthFt,
        breadth_ft=req.breadthFt,
        polygon_vertices=req.polygonVertices,
        entry_edges=entry_edges,
        target_plot_sqft=req.targetPlotSqft,
        road_width_ft=req.roadWidthFt,
        garden_percentage=req.gardenPercentage,
    )

    if not variants:
        raise HTTPException(status_code=500, detail="Failed to generate layout variants")

    # Save all variants to database
    saved_summaries = []
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
            totalPlots=v.total_plots,
            averagePlotAreaSqft=stats.get("averagePlotAreaSqft", 0),
            totalRoadAreaSqft=stats.get("totalRoadAreaSqft", 0),
            utilizationPercent=v.utilization_percent,
            compositeScore=v.evaluation.get("compositeScore", 0.0),
            evaluation=v.evaluation,
            isSelected=is_first,
        ))

        # If it's the first variant, also persist its plots to project_plots
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
                        "facing": p.facing,
                        "dimensions": f"{p.width_ft:.0f} × {p.depth_ft:.0f} FT",
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
                    notes=f"{p.width_ft:.0f}×{p.depth_ft:.0f} FT, {p.road_name}",
                )
                db.add(db_plot)

    project.status = "ACTIVE"
    db.commit()

    return {
        "projectId": project_id,
        "message": f"Successfully generated {len(variants)} layout variants",
        "variants": saved_summaries,
    }


@router.get("/projects/{project_id}/variants", response_model=List[VariantSummary])
def list_variants(project_id: str, db: Session = Depends(get_db)):
    """List all generated layout variants for a project."""
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
        except Exception:
            stats = {}

        summaries.append(VariantSummary(
            id=v.id,
            variantNumber=v.variant_number,
            strategyName=v.strategy_name,
            totalPlots=v.total_plots,
            averagePlotAreaSqft=stats.get("averagePlotAreaSqft", 0),
            totalRoadAreaSqft=stats.get("totalRoadAreaSqft", 0),
            utilizationPercent=v.utilization_percent or 0,
            compositeScore=stats.get("compositeScore", 0.0),
            evaluation=stats.get("evaluation", {}),
            isSelected=v.is_selected,
        ))

    return summaries


@router.get("/projects/{project_id}/variants/{variant_id}/svg")
def get_variant_svg(project_id: str, variant_id: str, db: Session = Depends(get_db)):
    """Get the rendered SVG string for a specific layout variant."""
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

    return {
        "projectId": project_id,
        "variantId": variant.id,
        "variantNumber": variant.variant_number,
        "strategyName": variant.strategy_name,
        "svgContent": variant.svg_content,
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
    Select a variant as the project's active layout.
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
                "facing": p.get("facing"),
                "dimensions": p.get("dimensions"),
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
            notes=f"{p.get('dimensions', '')}, {p.get('roadName', '')}",
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
