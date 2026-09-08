import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.project import LayoutSource, LayoutProcessingJob
from app.engine.pipeline_stages_a import PipelineStagesA
from app.engine.pipeline_stages_b import PipelineStagesB

logger = logging.getLogger(__name__)

class LayoutPipelineController(PipelineStagesA, PipelineStagesB):
    """
    Master Controller for the Layout Intelligence Engine Pipeline (TASK-038 through TASK-057 / Phases 1-12).
    Orchestrates sequential pipeline stages for both digital PDF and non-PDF raster image layout blueprints.
    Manages job state machine transitions (QUEUED -> PROCESSING -> COMPLETED / FAILED) in PostgreSQL.
    """

    def run_raster_pipeline(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        if not job or not layout: raise ValueError("Job or Layout not found")

        try:
            self.run_vision_context_stage(db, project_id, layout_id, job_id)
            self.run_image_preprocessing_stage(db, project_id, layout_id, job_id)
            self.run_semantic_segmentation_stage(db, project_id, layout_id, job_id)
            self.run_raster_vectorization_stage(db, project_id, layout_id, job_id)
            self.run_universal_primitive_stage(db, project_id, layout_id, job_id)
            self.run_geometry_relationship_stage(db, project_id, layout_id, job_id)
            self.run_road_detection_stage(db, project_id, layout_id, job_id)
            self.run_boundary_detection_stage(db, project_id, layout_id, job_id)
            self.run_plot_detection_stage(db, project_id, layout_id, job_id)
            self.run_ocr_text_extraction_stage(db, project_id, layout_id, job_id)
            self.run_label_association_stage(db, project_id, layout_id, job_id)
            self.run_buildable_area_stage(db, project_id, layout_id, job_id)
            rec_res = self.run_reconstruction_and_persister_stages(db, project_id, layout_id, job_id)

            logger.info(f"Raster pipeline completed successfully for job '{job_id}'")
            return rec_res

        except Exception as e:
            job.status = "FAILED"
            job.error_message = f"Raster pipeline execution failed: {str(e)}"
            db.commit()
            logger.error(f"Raster pipeline failed for job '{job_id}': {str(e)}")
            raise e

    def run_full_pipeline(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        if not job or not layout: raise ValueError("Job or Layout not found")

        if layout.file_type.upper() in ["PNG", "JPG", "JPEG", "TIFF", "WEBP", "BMP"]:
            return self.run_raster_pipeline(db, project_id, layout_id, job_id)

        try:
            self.run_inspection_stage(db, project_id, layout_id, job_id)
            self.run_extraction_stage(db, project_id, layout_id, job_id)
            self.run_normalization_stage(db, project_id, layout_id, job_id)
            self.run_universal_primitive_stage(db, project_id, layout_id, job_id)
            self.run_geometry_relationship_stage(db, project_id, layout_id, job_id)
            self.run_road_detection_stage(db, project_id, layout_id, job_id)
            self.run_boundary_detection_stage(db, project_id, layout_id, job_id)
            self.run_plot_detection_stage(db, project_id, layout_id, job_id)
            self.run_ocr_text_extraction_stage(db, project_id, layout_id, job_id)
            self.run_label_association_stage(db, project_id, layout_id, job_id)
            self.run_buildable_area_stage(db, project_id, layout_id, job_id)
            rec_res = self.run_reconstruction_and_persister_stages(db, project_id, layout_id, job_id)

            logger.info(f"Vector pipeline completed successfully for job '{job_id}'")
            return rec_res

        except Exception as e:
            job.status = "FAILED"
            job.error_message = f"Full pipeline execution failed: {str(e)}"
            db.commit()
            logger.error(f"Pipeline failed for job '{job_id}': {str(e)}")
            raise e

pipeline_controller_instance = LayoutPipelineController()
