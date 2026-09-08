import json
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.project import Project, LayoutSource, LayoutProcessingJob
from app.engine.inspector import file_inspector_instance
from app.engine.input_ingestion_engine import input_ingestion_engine_instance
from app.engine.clm_builder import clm_builder_instance
from app.engine.artifact_manager import artifact_manager_instance
from app.engine.pdf_reader import pdf_reader_instance
from app.engine.vector_path_extractor import vector_path_extractor_instance
from app.engine.geometry_normalizer import geometry_normalizer_instance
from app.engine.vision_engine import vision_engine_instance
from app.engine.image_preprocessor import image_preprocessor_instance
from app.engine.raster_vectorizer import raster_vectorizer_instance
from app.engine.cad_parser import cad_parser_instance

logger = logging.getLogger(__name__)

class PipelineStagesA:
    """Pipeline Stages 1 to 1.6 (Inspection, Ingestion, Extraction, Normalization, Vision Context, Image Preprocessing, Raster Vectorization, CAD DXF Extraction)."""

    def run_inspection_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        if not job or not layout: raise ValueError("Job or Layout not found")
        job.status, job.stage, job.progress_percentage = "PROCESSING", "INSPECTION", 10
        db.commit()

        # Ingestion & Stream Analysis
        ingest_res = input_ingestion_engine_instance.ingest_document(layout.file_path, layout.scale_ratio or "Not specified")
        artifact_manager_instance.save_artifact(db, project_id, job_id, "INGESTION_METADATA", ingest_res.to_dict())
        artifact_manager_instance.save_artifact(db, project_id, job_id, "SOURCE_DOCUMENT_SPEC", ingest_res.to_dict())

        insp_res = file_inspector_instance.inspect_file(layout.file_path)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "INSPECTION_METADATA", insp_res)
        clm_res = clm_builder_instance.build_canonical_layout_model(project_id, layout_id, insp_res)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "CANONICAL_LAYOUT_MODEL", clm_res)

        job.result_summary = json.dumps({
            "message": "Inspection & Ingestion completed",
            "fileType": layout.file_type,
            "sourceType": ingest_res.source_type,
            "pageCount": ingest_res.page_count
        })
        db.commit()
        return clm_res

    def run_extraction_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "EXTRACTION", 25
        db.commit()

        ftype = layout.file_type.upper()
        if ftype == "PDF":
            ext_res = pdf_reader_instance.read_pdf_streams(layout.file_path)
            art_type = "PDF_STREAM_OBJECTS"
        elif ftype in ["DXF", "DWG"]:
            ext_res = cad_parser_instance.parse_dxf(layout.file_path)
            art_type = "RAW_VECTOR_PRIMITIVES"
        else:
            ext_res = vector_path_extractor_instance.extract_vector_paths(layout.file_path)
            art_type = "RAW_VECTOR_PRIMITIVES"

        artifact_manager_instance.save_artifact(db, project_id, job_id, art_type, ext_res)
        job.result_summary = json.dumps({"message": "Extraction completed", "fileType": ftype})
        db.commit()
        return ext_res

    def run_normalization_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "NORMALIZATION", 75
        db.commit()

        raw_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "RAW_VECTOR_PRIMITIVES")
        raw_dict = json.loads(raw_art.content_json) if raw_art and raw_art.content_json else {}
        norm_res = geometry_normalizer_instance.normalize_primitives(raw_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "NORMALIZED_GEOMETRY_MODEL", norm_res)
        job.result_summary = json.dumps({"message": "Normalization completed"})
        db.commit()
        return norm_res

    def run_vision_context_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "VISION_CONTEXT", 15
        db.commit()

        vis_ctx = vision_engine_instance.analyze_vision_context(layout.file_path, layout.file_name or "", layout.mime_type or "")
        vis_res = vis_ctx.model_dump()
        artifact_manager_instance.save_artifact(db, project_id, job_id, "VISION_PROCESSING_CONTEXT", vis_res)
        job.result_summary = json.dumps({"message": "Vision context completed"})
        db.commit()
        return vis_res

    def run_image_preprocessing_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "IMAGE_PREPROCESSING", 25
        db.commit()

        prep_res = image_preprocessor_instance.preprocess_image(layout.file_path, layout.mime_type or "")
        artifact_manager_instance.save_artifact(db, project_id, job_id, "PREPROCESSED_IMAGE", prep_res)
        job.result_summary = json.dumps({"message": "Preprocessing completed"})
        db.commit()
        return prep_res

    def run_raster_vectorization_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "RASTER_VECTORIZATION", 35
        db.commit()

        prep_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PREPROCESSED_IMAGE")
        prep_dict = json.loads(prep_art.content_json) if prep_art and prep_art.content_json else {}
        rast_res = raster_vectorizer_instance.vectorize_raster_image(prep_dict)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "RASTER_VECTOR_PRIMITIVES", rast_res)
        job.result_summary = json.dumps({"message": "Raster vectorization completed"})
        db.commit()
        return rast_res

    def run_semantic_segmentation_stage(self, db: Session, project_id: str, layout_id: str, job_id: str) -> Dict[str, Any]:
        """Runs multi-scale deep learning / transformer semantic segmentation."""
        from app.engine.segmentation_engine import segmentation_engine_instance
        job = db.query(LayoutProcessingJob).filter(LayoutProcessingJob.id == job_id).first()
        layout = db.query(LayoutSource).filter(LayoutSource.id == layout_id).first()
        job.status, job.stage, job.progress_percentage = "PROCESSING", "SEMANTIC_SEGMENTATION", 40
        db.commit()

        prep_art = artifact_manager_instance.get_latest_artifact_by_type(db, job_id, "PREPROCESSED_IMAGE")
        prep_dict = json.loads(prep_art.content_json) if prep_art and prep_art.content_json else {}
        img_path = prep_dict.get("preprocessedFilePath") or layout.file_path

        seg_res = segmentation_engine_instance.run_semantic_segmentation(img_path)
        artifact_manager_instance.save_artifact(db, project_id, job_id, "SEMANTIC_SEGMENTATION_MASKS", seg_res)
        job.result_summary = json.dumps({"message": "Semantic segmentation completed", "model": seg_res.get("modelName")})
        db.commit()
        return seg_res

