import sys
import os
import logging
from pathlib import Path
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import engine
from app.models import Base

logger = logging.getLogger(__name__)

def init_db():
    """
    Creates all PostgreSQL tables defined in SQLAlchemy models if they do not exist,
    and applies column migrations for project_plots.
    """
    logger.info("Initializing PostgreSQL database schema...")
    Base.metadata.create_all(bind=engine)

    # Migrate columns for project_plots & layout_sources if on PostgreSQL
    try:
        with engine.begin() as conn:
            if engine.dialect.name == "postgresql":
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
    except Exception as e:
        logger.warning(f"Note on column migration: {e}")

    logger.info("Database tables and column migrations completed successfully!")

if __name__ == "__main__":
    init_db()

