import sys
import os
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import engine, SessionLocal
from app.models import (
    Base, Project, ProjectLocation, ProjectSurvey, ProjectCommercial, ProjectLegal
)

logger = logging.getLogger(__name__)

def migrate_columns():
    """
    Applies non-destructive schema migrations for existing SQLite and PostgreSQL databases.
    Adds any missing columns to projects, project_plots, and layout_sources tables.
    """
    dialect = engine.dialect.name
    logger.info(f"Checking database schema migrations for dialect: {dialect}...")

    with engine.begin() as conn:
        if dialect == "sqlite":
            # 1. Projects table
            try:
                existing_proj_cols = {
                    row[1] for row in conn.execute(text("PRAGMA table_info(projects)")).fetchall()
                }
                project_col_defs = {
                    "generation_mode": "VARCHAR(50) DEFAULT 'AUTO_GENERATE'",
                    "land_length_ft": "REAL",
                    "land_breadth_ft": "REAL",
                    "land_polygon_json": "TEXT",
                    "entry_points_json": "TEXT",
                    "desired_plot_size_sqft": "REAL DEFAULT 1200.0",
                    "min_plot_sqft": "REAL DEFAULT 800.0",
                    "max_plot_sqft": "REAL DEFAULT 4000.0",
                    "road_width_ft": "REAL DEFAULT 30.0",
                    "setback_ft": "REAL DEFAULT 10.0",
                    "garden_percentage": "REAL DEFAULT 10.0",
                    "satellite_coords_json": "TEXT",
                }
                for col_name, col_type in project_col_defs.items():
                    if col_name not in existing_proj_cols:
                        conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type};"))
                        logger.info(f"SQLite migration: Added column 'projects.{col_name}'")
            except Exception as e:
                logger.warning(f"Note on SQLite projects migration: {e}")

            # 2. Project_plots table
            try:
                existing_plot_cols = {
                    row[1] for row in conn.execute(text("PRAGMA table_info(project_plots)")).fetchall()
                }
                plot_col_defs = {
                    "notes": "TEXT",
                    "customer_id": "VARCHAR(36)",
                    "reservation_date": "TIMESTAMP",
                }
                for col_name, col_type in plot_col_defs.items():
                    if col_name not in existing_plot_cols:
                        conn.execute(text(f"ALTER TABLE project_plots ADD COLUMN {col_name} {col_type};"))
                        logger.info(f"SQLite migration: Added column 'project_plots.{col_name}'")
            except Exception as e:
                logger.warning(f"Note on SQLite project_plots migration: {e}")

            # 3. Layout_sources table
            try:
                existing_layout_cols = {
                    row[1] for row in conn.execute(text("PRAGMA table_info(layout_sources)")).fetchall()
                }
                layout_col_defs = {
                    "layout_status": "VARCHAR(50) DEFAULT 'DRAFT'",
                    "layout_version": "INTEGER DEFAULT 1",
                    "geometry_revision": "INTEGER DEFAULT 1",
                    "approved_at": "TIMESTAMP",
                    "approved_by": "VARCHAR(150)",
                }
                for col_name, col_type in layout_col_defs.items():
                    if col_name not in existing_layout_cols:
                        conn.execute(text(f"ALTER TABLE layout_sources ADD COLUMN {col_name} {col_type};"))
                        logger.info(f"SQLite migration: Added column 'layout_sources.{col_name}'")
            except Exception as e:
                logger.warning(f"Note on SQLite layout_sources migration: {e}")

        elif dialect == "postgresql":
            try:
                conn.execute(text("ALTER TABLE project_plots ADD COLUMN IF NOT EXISTS notes TEXT;"))
                conn.execute(text("ALTER TABLE project_plots ADD COLUMN IF NOT EXISTS customer_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE project_plots ADD COLUMN IF NOT EXISTS reservation_date TIMESTAMP WITH TIME ZONE;"))
                conn.execute(text("ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS layout_status VARCHAR(50) DEFAULT 'DRAFT';"))
                conn.execute(text("ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS layout_version INTEGER DEFAULT 1;"))
                conn.execute(text("ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS geometry_revision INTEGER DEFAULT 1;"))
                conn.execute(text("ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;"))
                conn.execute(text("ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150);"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(50) DEFAULT 'AUTO_GENERATE';"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_length_ft DOUBLE PRECISION;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_breadth_ft DOUBLE PRECISION;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_polygon_json TEXT;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS entry_points_json TEXT;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS desired_plot_size_sqft DOUBLE PRECISION DEFAULT 1200.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS min_plot_sqft DOUBLE PRECISION DEFAULT 800.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_plot_sqft DOUBLE PRECISION DEFAULT 4000.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS road_width_ft DOUBLE PRECISION DEFAULT 30.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS setback_ft DOUBLE PRECISION DEFAULT 10.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS garden_percentage DOUBLE PRECISION DEFAULT 10.0;"))
                conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS satellite_coords_json TEXT;"))
            except Exception as e:
                logger.warning(f"Note on PostgreSQL column migration: {e}")

def seed_initial_data_if_empty():
    """
    Seeds default demonstration projects (including satellite boundary ready for plot generation)
    if the database has zero projects.
    """
    db = SessionLocal()
    try:
        count = db.query(Project).count()
        if count == 0:
            logger.info("Database is empty — seeding initial demonstration projects...")

            # 1. Sunrise Villa (Satellite Boundary ready for Google Maps & Plot Generation)
            proj_sat = Project(
                id="1546616c-35d3-4d48-94db-1e956b4919d6",
                name="Sunrise Villa",
                developer_name="Sunrise Infra Developers",
                project_type="Residential",
                land_classification="N.A. Residential",
                status="ACTIVE",
                description="Prime residential plotted development with Google satellite boundary and UDCPR plot generator support.",
                generation_mode="AUTO_GENERATE",
                land_length_ft=357.2,
                land_breadth_ft=250.3,
                land_polygon_json='[[58.4, 266.9], [-49.2, 164.4], [48.2, 20.0], [308.0, 16.6], [244.4, 266.9], [58.4, 266.9]]',
                satellite_coords_json='[[21.151522, 79.08283], [21.15107, 79.082717], [21.150845, 79.0828], [21.150887, 79.083232], [21.151522, 79.083377]]',
                desired_plot_size_sqft=1200.0,
                min_plot_sqft=800.0,
                max_plot_sqft=4000.0,
                road_width_ft=30.0,
                setback_ft=10.0,
                garden_percentage=10.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(proj_sat)

            loc_sat = ProjectLocation(
                id=str(uuid.uuid4()),
                project_id=proj_sat.id,
                state="Maharashtra",
                district="Nagpur",
                taluka="Nagpur",
                city_village="Nagpur",
                pincode="440001",
                latitude=21.1512,
                longitude=79.0830
            )
            db.add(loc_sat)

            survey_sat = ProjectSurvey(
                id=str(uuid.uuid4()),
                project_id=proj_sat.id,
                survey_number="Gut 121/2"
            )
            db.add(survey_sat)

            comm_sat = ProjectCommercial(
                id=str(uuid.uuid4()),
                project_id=proj_sat.id,
                gross_land_area=2.5,
                area_unit="Acres",
                base_rate_per_sqft=1500.0,
                min_price=1800000.0,
                max_price=6000000.0
            )
            db.add(comm_sat)

            # 2. Pune Green Enclave
            proj_pune = Project(
                id="0afafa25-c1e0-4d8a-924d-d5353db9fb3c",
                name="Pune Green Enclave",
                developer_name="LandOS Townships",
                project_type="Plotted Development",
                land_classification="Residential NA",
                status="ACTIVE",
                description="Model township in Pune with UDCPR 2020 regulatory compliance.",
                generation_mode="AUTO_GENERATE",
                land_length_ft=300.0,
                land_breadth_ft=200.0,
                desired_plot_size_sqft=1200.0,
                min_plot_sqft=800.0,
                max_plot_sqft=4000.0,
                road_width_ft=30.0,
                setback_ft=10.0,
                garden_percentage=10.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(proj_pune)

            loc_pune = ProjectLocation(
                id=str(uuid.uuid4()),
                project_id=proj_pune.id,
                state="Maharashtra",
                district="Pune",
                taluka="Haveli",
                city_village="Pune",
                pincode="411001",
                latitude=18.5204,
                longitude=73.8567
            )
            db.add(loc_pune)

            survey_pune = ProjectSurvey(
                id=str(uuid.uuid4()),
                project_id=proj_pune.id,
                survey_number="Survey 45/1A"
            )
            db.add(survey_pune)

            comm_pune = ProjectCommercial(
                id=str(uuid.uuid4()),
                project_id=proj_pune.id,
                gross_land_area=2.0,
                area_unit="Acres",
                base_rate_per_sqft=2200.0,
                min_price=2500000.0,
                max_price=8000000.0
            )
            db.add(comm_pune)

            db.commit()
            logger.info("Successfully seeded demonstration projects!")
    except Exception as e:
        db.rollback()
        logger.warning(f"Note on initial seed data: {e}")
    finally:
        db.close()

def init_db():
    """
    Initializes database tables, runs column migrations, and seeds initial data.
    Safe to run repeatedly on startup across any developer machine.
    """
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    migrate_columns()
    seed_initial_data_if_empty()
    logger.info("Database initialization and schema checks completed successfully!")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
