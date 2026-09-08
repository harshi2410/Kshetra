import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.engine.inspector import file_inspector_instance

logger = logging.getLogger(__name__)

class VisionProcessingContext(BaseModel):
    """
    Unified Vision Context object encapsulating intake analysis and processing strategy
    for any uploaded blueprint layout format across LandOS.
    """
    fileName: str
    fileType: str           # "PDF", "PNG", "JPG", "JPEG", "TIFF", "DWG", "DXF", "UNKNOWN"
    mimeType: str
    isVector: bool
    isSupported: bool
    strategy: str           # "VECTOR_PDF_PIPELINE", "RASTER_PDF_PIPELINE", "IMAGE_RASTER_PIPELINE", "UNSUPPORTED_FORMAT"
    recommendedPreprocessing: List[str]
    pageCount: int = 1
    fileSizeBytes: int = 0

class VisionEngine:
    """
    Vision Engine Singleton (EPIC-AI-01)
    Responsibility: Unified intake classification, vector vs raster detection,
    format verification, and processing strategy determination.
    """

    SUPPORTED_RASTER_EXTS = {".png", ".jpg", ".jpeg", ".tiff", ".tif"}
    UNSUPPORTED_CAD_EXTS = {".dwg", ".dxf"}

    def analyze_vision_context(
        self,
        file_path_str: str,
        file_name: str = "",
        mime_type: str = ""
    ) -> VisionProcessingContext:
        """
        Analyzes uploaded file path and constructs a VisionProcessingContext strategy.
        """
        base_dir = Path(__file__).resolve().parent.parent.parent
        p = Path(file_path_str)
        if not p.is_absolute():
            p = base_dir / file_path_str

        actual_file_name = file_name or p.name
        ext = p.suffix.lower()
        file_size = p.stat().st_size if p.exists() and p.is_file() else 0

        # Run base file inspector logic
        inspection = file_inspector_instance.inspect_file(str(p)) if p.exists() else {}

        if ext == ".pdf":
            has_vector = inspection.get("hasVectorStream", True)
            if has_vector:
                strategy = "VECTOR_PDF_PIPELINE"
                is_vector = True
                preprocessing = []
            else:
                strategy = "RASTER_PDF_PIPELINE"
                is_vector = False
                preprocessing = ["PDF_RASTERIZATION", "DESKEW", "NOISE_REMOVAL"]

            return VisionProcessingContext(
                fileName=actual_file_name,
                fileType="PDF",
                mimeType=mime_type or "application/pdf",
                isVector=is_vector,
                isSupported=True,
                strategy=strategy,
                recommendedPreprocessing=preprocessing,
                pageCount=inspection.get("pagesCount", 1),
                fileSizeBytes=file_size
            )

        elif ext in self.SUPPORTED_RASTER_EXTS:
            clean_type = ext.replace(".", "").upper()
            if clean_type == "TIF":
                clean_type = "TIFF"

            return VisionProcessingContext(
                fileName=actual_file_name,
                fileType=clean_type,
                mimeType=mime_type or f"image/{clean_type.lower()}",
                isVector=False,
                isSupported=True,
                strategy="IMAGE_RASTER_PIPELINE",
                recommendedPreprocessing=["DESKEW", "NOISE_REMOVAL", "CONTRAST_ENHANCEMENT"],
                pageCount=1,
                fileSizeBytes=file_size
            )

        elif ext == ".dxf":
            return VisionProcessingContext(
                fileName=actual_file_name,
                fileType="DXF",
                mimeType=mime_type or "application/dxf",
                isVector=True,
                isSupported=True,
                strategy="CAD_DXF_PIPELINE",
                recommendedPreprocessing=["DXF_ENTITY_EXTRACTION", "COORDINATE_NORMALIZATION"],
                pageCount=1,
                fileSizeBytes=file_size
            )

        elif ext == ".dwg":
            return VisionProcessingContext(
                fileName=actual_file_name,
                fileType="DWG",
                mimeType=mime_type or "application/acad",
                isVector=True,
                isSupported=False,
                strategy="UNSUPPORTED_FORMAT",
                recommendedPreprocessing=[],
                pageCount=1,
                fileSizeBytes=file_size
            )

        else:
            return VisionProcessingContext(
                fileName=actual_file_name,
                fileType="UNKNOWN",
                mimeType=mime_type or "application/octet-stream",
                isVector=False,
                isSupported=False,
                strategy="UNSUPPORTED_FORMAT",
                recommendedPreprocessing=[],
                pageCount=1,
                fileSizeBytes=file_size
            )

# Vision Engine Singleton Instance
vision_engine_instance = VisionEngine()
