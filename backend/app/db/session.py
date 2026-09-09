from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.get_database_url if hasattr(settings, "get_database_url") else (settings.DATABASE_URL or "sqlite:///./landos.db")
if callable(db_url):
    db_url = db_url()

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency that provides a transactional database session per request.
    Automatically closes session upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
