import uuid
from sqlalchemy import Column, String, Text, Numeric, BigInteger, Integer, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Project(Base):
    __tablename__ = 'projects'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    developer_name = Column(String(255), nullable=False)
    project_type = Column(String(50), nullable=False)
    land_classification = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default='DRAFT', index=True)
    description = Column(Text, nullable=True)
    generation_mode = Column(String(50), nullable=False, default='AUTO_GENERATE')

    # Land generation & planning input fields
    land_length_ft = Column(Float, nullable=True)
    land_breadth_ft = Column(Float, nullable=True)
    land_polygon_json = Column(Text, nullable=True)
    entry_points_json = Column(Text, nullable=True)
    desired_plot_size_sqft = Column(Float, nullable=True, default=1200.0)
    min_plot_sqft = Column(Float, nullable=True, default=800.0)
    max_plot_sqft = Column(Float, nullable=True, default=4000.0)
    road_width_ft = Column(Float, nullable=True, default=30.0)
    setback_ft = Column(Float, nullable=True, default=10.0)
    garden_percentage = Column(Float, nullable=True, default=10.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    location = relationship("ProjectLocation", uselist=False, cascade="all, delete-orphan", back_populates="project")
    surveys = relationship("ProjectSurvey", cascade="all, delete-orphan", back_populates="project")
    commercial = relationship("ProjectCommercial", uselist=False, cascade="all, delete-orphan", back_populates="project")
    legal = relationship("ProjectLegal", uselist=False, cascade="all, delete-orphan", back_populates="project")
    layout_sources = relationship("LayoutSource", cascade="all, delete-orphan", back_populates="project")
    processing_jobs = relationship("LayoutProcessingJob", cascade="all, delete-orphan", back_populates="project")
    artifacts = relationship("LayoutProcessingArtifact", cascade="all, delete-orphan", back_populates="project")
    plots = relationship("ProjectPlot", cascade="all, delete-orphan", back_populates="project")
    generated_variants = relationship("GeneratedLayoutVariant", cascade="all, delete-orphan", back_populates="project")
    bookings = relationship("PlotBooking", cascade="all, delete-orphan", back_populates="project")



class ProjectLocation(Base):
    __tablename__ = 'project_locations'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), unique=True, nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    taluka = Column(String(100), nullable=False)
    city_village = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)

    project = relationship("Project", back_populates="location")


class ProjectSurvey(Base):
    __tablename__ = 'project_surveys'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    survey_number = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="surveys")


class ProjectCommercial(Base):
    __tablename__ = 'project_commercials'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), unique=True, nullable=False)
    gross_land_area = Column(Numeric(14, 4), nullable=False)
    area_unit = Column(String(20), nullable=False)
    base_rate_per_sqft = Column(Numeric(12, 2), nullable=True)
    min_price = Column(Numeric(14, 2), nullable=True)
    max_price = Column(Numeric(14, 2), nullable=True)
    launch_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)

    project = relationship("Project", back_populates="commercial")


class ProjectLegal(Base):
    __tablename__ = 'project_legal'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), unique=True, nullable=False)
    rera_number = Column(String(100), nullable=True)
    approval_authority = Column(String(150), nullable=True)

    project = relationship("Project", back_populates="legal")


class LayoutSource(Base):
    __tablename__ = 'layout_sources'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    scale_ratio = Column(String(50), default='Not specified')
    upload_status = Column(String(50), nullable=False, default='UPLOADED')
    layout_status = Column(String(50), nullable=False, default='DRAFT')
    layout_version = Column(Integer, nullable=False, default=1)
    geometry_revision = Column(Integer, nullable=False, default=1)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(150), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="layout_sources")
    processing_jobs = relationship("LayoutProcessingJob", cascade="all, delete-orphan", back_populates="layout_source")


class LayoutProcessingJob(Base):
    __tablename__ = 'layout_processing_jobs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    layout_source_id = Column(String(36), ForeignKey('layout_sources.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(50), nullable=False, default='QUEUED', index=True)
    stage = Column(String(50), nullable=False, default='INSPECTION')
    progress_percentage = Column(BigInteger, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="processing_jobs")
    layout_source = relationship("LayoutSource", back_populates="processing_jobs")
    artifacts = relationship("LayoutProcessingArtifact", cascade="all, delete-orphan", back_populates="job")


class LayoutProcessingArtifact(Base):
    __tablename__ = 'layout_processing_artifacts'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey('layout_processing_jobs.id', ondelete='CASCADE'), nullable=False, index=True)
    artifact_type = Column(String(100), nullable=False, index=True)
    mime_type = Column(String(100), nullable=False, default='application/json')
    content_json = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="artifacts")
    job = relationship("LayoutProcessingJob", back_populates="artifacts")


class ProjectPlot(Base):
    __tablename__ = 'project_plots'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    layout_source_id = Column(String(36), ForeignKey('layout_sources.id', ondelete='CASCADE'), nullable=True, index=True)
    plot_number = Column(String(100), nullable=False, index=True)
    polygon_geojson = Column(Text, nullable=False)
    calculated_area_sqft = Column(Numeric(14, 2), nullable=True)
    facing_direction = Column(String(50), nullable=True, default='NORTH')
    centroid_x = Column(Numeric(10, 2), nullable=True)
    centroid_y = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), nullable=False, default='AVAILABLE', index=True)
    base_price = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)
    customer_id = Column(String(36), nullable=True, index=True)
    reservation_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="plots")
    layout_source = relationship("LayoutSource")
    bookings = relationship("PlotBooking", cascade="all, delete-orphan", back_populates="plot", order_by="desc(PlotBooking.created_at)")


class GeneratedLayoutVariant(Base):
    """Stores auto-generated layout design variants."""
    __tablename__ = 'generated_layout_variants'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    variant_number = Column(Integer, nullable=False)
    strategy_name = Column(String(100), nullable=False)
    layout_model_json = Column(Text, nullable=False)
    svg_content = Column(Text, nullable=False)
    total_plots = Column(Integer, nullable=False, default=0)
    total_area_sqft = Column(Float, nullable=True)
    utilization_percent = Column(Float, nullable=True)
    is_selected = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="generated_variants")


class PlotBooking(Base):
    """Persistent booking and customer records tied to a specific project plot."""
    __tablename__ = 'plot_bookings'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    plot_id = Column(String(36), ForeignKey('project_plots.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=True)
    customer_address = Column(Text, nullable=True)
    booking_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    booking_amount = Column(Numeric(14, 2), nullable=False)
    paid_amount = Column(Numeric(14, 2), nullable=False, default=0)
    remaining_amount = Column(Numeric(14, 2), nullable=False, default=0)
    payment_status = Column(String(50), nullable=False, default='PARTIAL')  # PAID, PARTIAL, PENDING
    payment_method = Column(String(50), nullable=False, default='UPI')      # Cash, UPI, Bank Transfer, Cheque, Other
    transaction_id = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    booking_status = Column(String(50), nullable=False, default='BOOKED', index=True)  # BOOKED, CANCELLED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="bookings")
    plot = relationship("ProjectPlot", back_populates="bookings")





