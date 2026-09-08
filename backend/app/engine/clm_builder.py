import logging
from typing import Dict, Any
from app.schemas.layout_ir import CanonicalLayoutModel, SourceFileMetadata

logger = logging.getLogger(__name__)

class CLMBuilder:
    """
    Builder component for the LandOS Canonical Layout Model (CLM).
    Initializes a valid CLM document from inspection metadata and provides helpers
    for parser engines (PDF, OpenCV, OCR) to populate intermediate layout structures.
    """

    def build_initial_clm(self, inspection_result: Dict[str, Any], file_name: str) -> CanonicalLayoutModel:
        """
        Constructs an initial CanonicalLayoutModel IR document from FileInspector metadata.
        """
        source_meta = SourceFileMetadata(
            fileName=file_name,
            format=inspection_result.get("format", "PDF"),
            fileSizeBytes=inspection_result.get("fileSizeBytes", 0),
            pagesCount=inspection_result.get("pagesCount", 1),
            hasVectorStream=inspection_result.get("hasVectorStream", False),
            isScannedImage=inspection_result.get("isScannedImage", False),
            recommendedParser=inspection_result.get("recommendedParser", "UNKNOWN")
        )

        clm = CanonicalLayoutModel(
            version="1.0.0",
            sourceMetadata=source_meta,
            boundaries=[],
            roads=[],
            closedPolygons=[],
            paths=[],
            labels=[],
            symbols=[],
            dimensions=[],
            referencePoints=[]
        )

        logger.info(f"Initialized CanonicalLayoutModel (CLM) for '{file_name}' (Parser: {source_meta.recommendedParser})")
        return clm

    def build_canonical_layout_model(self, project_id: str, layout_id: str, inspection_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Builds Canonical Layout Model dictionary for pipeline stages.
        """
        clm = self.build_initial_clm(inspection_result, inspection_result.get("filePath", "blueprint"))
        return clm.model_dump()

clm_builder_instance = CLMBuilder()
