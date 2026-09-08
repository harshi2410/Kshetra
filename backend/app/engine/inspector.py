import os
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FileInspector:
    """
    Modular File Inspection Component of the Layout Intelligence Engine.
    Inspects stored binary blueprint files to determine format, file size,
    page count, vector path markers vs scanned raster image properties,
    and recommended downstream parsing engine.
    """

    def inspect_file(self, file_path_str: str) -> Dict[str, Any]:
        """
        Inspects layout blueprint file and returns technical inspection metadata.
        """
        base_dir = Path(__file__).resolve().parent.parent.parent
        p = Path(file_path_str)
        if not p.is_absolute():
            p = base_dir / file_path_str

        if not p.exists() or not p.is_file():
            raise FileNotFoundError(f"Layout blueprint file not found at path: {file_path_str}")

        file_size = p.stat().st_size
        ext = p.suffix.lower()

        inspection_result = {
            "filePath": file_path_str,
            "format": ext.replace(".", "").upper(),
            "fileSizeBytes": file_size,
            "pagesCount": 1,
            "hasVectorStream": False,
            "isScannedImage": False,
            "estimatedDpi": 300,
            "recommendedParser": "UNKNOWN"
        }

        # PDF Inspection
        if ext == ".pdf":
            try:
                with p.open("rb") as f:
                    content = f.read(1024 * 500) # Read first 500KB
                    # Check for PDF vector operators / font markers
                    has_fonts = b"/Font" in content or b"/Type /Font" in content or b"/BT" in content
                    has_images = b"/Subtype /Image" in content or b"/Filter /DCTDecode" in content


                    pages = content.count(b"/Type /Page") or 1
                    inspection_result["pagesCount"] = pages
                    inspection_result["hasVectorStream"] = has_fonts
                    inspection_result["isScannedImage"] = has_images and not has_fonts

                    if has_fonts:
                        inspection_result["recommendedParser"] = "DIGITAL_PDF_VECTOR_PARSER"
                    elif has_images:
                        inspection_result["recommendedParser"] = "RASTER_IMAGE_OPENCV_PARSER"
                    else:
                        inspection_result["recommendedParser"] = "GENERIC_DOCUMENT_PARSER"
            except Exception as e:
                logger.warning(f"Error inspecting PDF file: {str(e)}")
                inspection_result["recommendedParser"] = "GENERIC_DOCUMENT_PARSER"

        # Raster Image Inspection (PNG, JPG, JPEG, TIFF)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"]:
            inspection_result["isScannedImage"] = True
            inspection_result["hasVectorStream"] = False
            inspection_result["recommendedParser"] = "RASTER_IMAGE_OPENCV_PARSER"

        # CAD DXF Inspection
        elif ext in [".dxf", ".dwg"]:
            inspection_result["isScannedImage"] = False
            inspection_result["hasVectorStream"] = True
            inspection_result["recommendedParser"] = "CAD_DXF_PARSER"

        logger.info(f"FileInspector completed for {p.name}: {inspection_result['recommendedParser']}")
        return inspection_result

file_inspector_instance = FileInspector()
