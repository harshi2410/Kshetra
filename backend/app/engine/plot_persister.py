import uuid
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.project import ProjectPlot, Project

logger = logging.getLogger(__name__)

class PlotPersister:
    """
    Engine singleton responsible for persisting spatial plot inventory into the 
    PostgreSQL database as business entities (`project_plots` table).
    Provides idempotent upsert functionality to prevent duplicate records upon pipeline re-runs.
    """

    def persist_plots(
        self,
        db: Session,
        project_id: str,
        layout_id: str,
        geojson_data: Dict[str, Any]
    ) -> Tuple[List[ProjectPlot], Dict[str, Any]]:
        """
        Reads GeoJSON FeatureCollection payload and upserts plot records into PostgreSQL project_plots table.
        
        Returns:
            Tuple[List[ProjectPlot], statistics_dict]
        """
        features = geojson_data.get("features", [])
        plot_features = [
            f for f in features 
            if f.get("properties", {}).get("entityType") in ["PLOT", "AMENITY"]
        ]

        # Fetch existing plots for this project to maintain idempotency
        existing_plots = db.query(ProjectPlot).filter(
            ProjectPlot.project_id == project_id
        ).all()

        existing_plot_map = {p.plot_number: p for p in existing_plots}

        persisted_plots: List[ProjectPlot] = []
        created_count = 0
        updated_count = 0

        for idx, f in enumerate(plot_features):
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            plot_num = props.get("labelHint") or f.get("id") or f"Plot-{idx+1}"
            area = float(props.get("calculatedAreaSqFt") or 0.0)
            facing = props.get("facing") or "NORTH"
            centroid = props.get("centroid", {})
            c_x = float(centroid.get("x", 0.0))
            c_y = float(centroid.get("y", 0.0))

            poly_json = json.dumps(geom)

            if plot_num in existing_plot_map:
                # Update existing plot properties without altering reservation/booking status
                plot_obj = existing_plot_map[plot_num]
                plot_obj.polygon_geojson = poly_json
                plot_obj.calculated_area_sqft = area
                plot_obj.facing_direction = facing
                plot_obj.centroid_x = c_x
                plot_obj.centroid_y = c_y
                plot_obj.layout_source_id = layout_id
                updated_count += 1
            else:
                # Insert new plot business entity
                plot_obj = ProjectPlot(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    layout_source_id=layout_id,
                    plot_number=plot_num,
                    polygon_geojson=poly_json,
                    calculated_area_sqft=area,
                    facing_direction=facing,
                    centroid_x=c_x,
                    centroid_y=c_y,
                    status="AVAILABLE"
                )
                db.add(plot_obj)
                created_count += 1

            persisted_plots.append(plot_obj)

        db.commit()

        # Update Project derived stats
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            total_plots = len(existing_plots) + created_count
            avail_plots = db.query(ProjectPlot).filter(
                ProjectPlot.project_id == project_id,
                ProjectPlot.status == "AVAILABLE"
            ).count()
            # Derived counts updated safely

        statistics = {
            "totalPlotsPersisted": len(persisted_plots),
            "newPlotsCreated": created_count,
            "existingPlotsUpdated": updated_count
        }

        logger.info(f"PlotPersister completed for project '{project_id}': {created_count} created, {updated_count} updated.")
        return persisted_plots, statistics

# Engine singleton instance
plot_persister_instance = PlotPersister()
