import math
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.schemas.layout_ir import (
    CanonicalLayoutModel,
    CLMPolygon,
    CLMRoadCandidate,
    CLMPath,
    Point2D,
    BBox2D,
    SourceFileMetadata
)

logger = logging.getLogger(__name__)

class CLMPrimitiveBuilder:
    """
    Engine singleton responsible for classifying normalized vector primitives into 
    Canonical Layout Model (CLM / Layout IR) semantic entities (Boundaries, Roads, Plots, Amenities, Paths).
    """

    def __init__(self):
        pass

    def build_clm_primitives(
        self,
        normalized_artifact_data: Dict[str, Any],
        initial_clm_data: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Reads NORMALIZED_VECTOR_PRIMITIVES artifact payload and builds a populated CanonicalLayoutModel dictionary.
        
        Returns:
            Tuple[clm_json_dict, debug_statistics_dict]
        """
        primitives = normalized_artifact_data.get("primitives", [])
        file_path = normalized_artifact_data.get("filePath", "unknown.pdf")
        
        # 1. Compute overall page diagonal and page area bounds from primitives
        all_xs = []
        all_ys = []
        for p in primitives:
            pts = p.get("normalizedPoints") or p.get("points") or []
            for pt in pts:
                all_xs.append(float(pt.get("x", 0.0)))
                all_ys.append(float(pt.get("y", 0.0)))

        min_x = min(all_xs) if all_xs else 0.0
        max_x = max(all_xs) if all_xs else 612.0
        min_y = min(all_ys) if all_ys else 0.0
        max_y = max(all_ys) if all_ys else 792.0

        page_width = max(max_x - min_x, 100.0)
        page_height = max(max_y - min_y, 100.0)
        page_area = page_width * page_height
        page_diagonal = math.hypot(page_width, page_height)

        boundaries: List[CLMPolygon] = []
        roads: List[CLMRoadCandidate] = []
        closed_polygons: List[CLMPolygon] = []
        paths: List[CLMPath] = []

        plot_count = 0
        road_count = 0
        boundary_count = 0
        amenity_count = 0
        unclassified_count = 0

        # 2. Iterate and classify each primitive
        for idx, prim in enumerate(primitives):
            prim_id = prim.get("id", f"norm_prim_{idx}")
            prim_type = prim.get("primitiveType", "LINE")
            pts_data = prim.get("normalizedPoints") or prim.get("points") or []
            points_2d = [Point2D(x=round(float(p["x"]), 2), y=round(float(p["y"]), 2)) for p in pts_data]
            
            is_closed = prim.get("closed", False) or prim_type in ["RECTANGLE", "CLOSED_POLYGON"]
            bbox_data = prim.get("boundingBox", {})
            area = float(prim.get("area") or bbox_data.get("area") or 0.0)
            w = float(bbox_data.get("width", 0.0))
            h = float(bbox_data.get("height", 0.0))
            
            if w > 0 and h > 0:
                aspect_ratio = w / h
            elif w > 0 and h == 0:
                aspect_ratio = 999.0
            elif h > 0 and w == 0:
                aspect_ratio = 0.001
            else:
                aspect_ratio = float(prim.get("aspectRatio") or 1.0)

            length = float(prim.get("length") or 0.0)
            if not length and len(points_2d) >= 2:
                seg_len = 0.0
                for k in range(len(points_2d) - 1):
                    seg_len += math.hypot(points_2d[k+1].x - points_2d[k].x, points_2d[k+1].y - points_2d[k].y)
                length = seg_len

            # Calculate polygon area ratio relative to total page area
            area_ratio = area / page_area if page_area > 0 else 0.0


            if is_closed and len(points_2d) >= 3:
                # Classify Closed Shapes
                if area_ratio >= 0.40:
                    # Boundary Candidate (covers > 40% of page area)
                    boundary_count += 1
                    poly = CLMPolygon(
                        id=f"bound-{boundary_count:03d}",
                        vertices=points_2d,
                        calculatedAreaSqFt=round(area, 2),
                        entityType="BOUNDARY",
                        labelHint="Project Boundary"
                    )
                    boundaries.append(poly)
                elif 0.001 <= area_ratio < 0.25 and 0.15 <= aspect_ratio <= 6.5:
                    # Plot Candidate
                    plot_count += 1
                    poly = CLMPolygon(
                        id=f"plot-{plot_count:03d}",
                        vertices=points_2d,
                        calculatedAreaSqFt=round(area, 2),
                        entityType="PLOT",
                        labelHint=f"Plot-{plot_count}"
                    )
                    closed_polygons.append(poly)
                elif area_ratio >= 0.25:
                    # Amenity / Common Area Candidate
                    amenity_count += 1
                    poly = CLMPolygon(
                        id=f"amenity-{amenity_count:03d}",
                        vertices=points_2d,
                        calculatedAreaSqFt=round(area, 2),
                        entityType="AMENITY",
                        labelHint="Open Space / Amenity"
                    )
                    closed_polygons.append(poly)
                else:
                    unclassified_count += 1
                    poly = CLMPolygon(
                        id=f"closed-{unclassified_count:03d}",
                        vertices=points_2d,
                        calculatedAreaSqFt=round(area, 2),
                        entityType="UNCLASSIFIED"
                    )
                    closed_polygons.append(poly)
            else:
                # Open Lines, Polylines, Curves
                if (aspect_ratio > 5.0 or aspect_ratio < 0.2) and length > (0.10 * page_diagonal):
                    # Road Candidate Corridor
                    road_count += 1
                    road = CLMRoadCandidate(
                        id=f"road-{road_count:03d}",
                        polyline=points_2d,
                        widthMeters=9.0,
                        roadName=f"Road {road_count}"
                    )
                    roads.append(road)
                else:
                    # Decorative Path / Line
                    path_obj = CLMPath(
                        id=f"path-{idx:04d}",
                        points=points_2d,
                        isClosed=False,
                        strokeWidth=float(prim.get("strokeWidth", 1.0)),
                        color=prim.get("strokeColor") or "#000000"
                    )
                    paths.append(path_obj)

        # 3. Construct source file metadata
        file_name = file_path.split("/")[-1]
        source_meta = SourceFileMetadata(
            fileName=file_name,
            format="PDF" if file_name.lower().endswith(".pdf") else "IMAGE",
            fileSizeBytes=normalized_artifact_data.get("fileSizeBytes", 0),
            pagesCount=normalized_artifact_data.get("statistics", {}).get("pages", 1),
            hasVectorStream=True,
            isScannedImage=False,
            recommendedParser="DIGITAL_PDF_VECTOR_PARSER"
        )

        # 4. Construct Pydantic CanonicalLayoutModel
        clm_model = CanonicalLayoutModel(
            version="1.0.0",
            sourceMetadata=source_meta,
            boundaries=boundaries,
            roads=roads,
            closedPolygons=closed_polygons,
            paths=paths,
            labels=[],
            symbols=[],
            dimensions=[],
            referencePoints=[]
        )

        clm_dict = clm_model.dict()

        statistics = {
            "totalPrimitivesProcessed": len(primitives),
            "classifiedBoundariesCount": boundary_count,
            "classifiedRoadsCount": road_count,
            "classifiedPlotsCount": plot_count,
            "classifiedAmenitiesCount": amenity_count,
            "unclassifiedClosedCount": unclassified_count,
            "decorativePathsCount": len(paths),
            "pageDimensionsPt": f"{page_width:.1f} x {page_height:.1f}"
        }

        logger.info(f"CLM Primitive Builder completed: {plot_count} plots, {road_count} roads, {boundary_count} boundaries.")
        return clm_dict, statistics

# Engine singleton instance
clm_primitive_builder_instance = CLMPrimitiveBuilder()
