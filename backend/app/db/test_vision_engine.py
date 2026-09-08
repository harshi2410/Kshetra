import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.vision_engine import vision_engine_instance, VisionProcessingContext

def run_vision_engine_tests():
    print("=" * 60)
    print("RUNNING EPIC-AI-01 VISION ENGINE INTAKE & ROUTING TEST SUITE")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # 1. VECTOR PDF TEST CASE
        # Standard synthetic vector PDF containing /Font stream markers
        vec_pdf_file = tmp_path / "test_vector_blueprint.pdf"
        vec_pdf_file.write_bytes(
            b"%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n"
            b"2 0 obj << /Font << /F1 3 0 R >> >> endobj\n"
            b"trailer << /Root 1 0 R >>\n%%EOF"
        )
        ctx_vec_pdf = vision_engine_instance.analyze_vision_context(
            file_path_str=str(vec_pdf_file),
            file_name="test_vector_blueprint.pdf",
            mime_type="application/pdf"
        )
        print(f"[1] Vector PDF Context Analysis:")
        print(f"    File Type = {ctx_vec_pdf.fileType} | Is Vector = {ctx_vec_pdf.isVector} | Strategy = {ctx_vec_pdf.strategy}")
        assert ctx_vec_pdf.fileType == "PDF"
        assert ctx_vec_pdf.isVector is True
        assert ctx_vec_pdf.isSupported is True
        assert ctx_vec_pdf.strategy == "VECTOR_PDF_PIPELINE"
        assert ctx_vec_pdf.recommendedPreprocessing == []
        print("    --> Vector PDF Routing PASSED!")

        # 2. RASTER PDF TEST CASE
        # PDF with image stream markers and no font vector streams
        ras_pdf_file = tmp_path / "test_scanned_blueprint.pdf"
        ras_pdf_file.write_bytes(
            b"%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n"
            b"2 0 obj << /Subtype /Image /Filter /DCTDecode >> endobj\n"
            b"trailer << /Root 1 0 R >>\n%%EOF"
        )
        ctx_ras_pdf = vision_engine_instance.analyze_vision_context(
            file_path_str=str(ras_pdf_file),
            file_name="test_scanned_blueprint.pdf",
            mime_type="application/pdf"
        )
        print(f"[2] Raster PDF Context Analysis:")
        print(f"    File Type = {ctx_ras_pdf.fileType} | Is Vector = {ctx_ras_pdf.isVector} | Strategy = {ctx_ras_pdf.strategy}")
        assert ctx_ras_pdf.fileType == "PDF"
        assert ctx_ras_pdf.isVector is False
        assert ctx_ras_pdf.isSupported is True
        assert ctx_ras_pdf.strategy == "RASTER_PDF_PIPELINE"
        assert "DESKEW" in ctx_ras_pdf.recommendedPreprocessing
        print("    --> Raster PDF Routing PASSED!")

        # 3. PNG RASTER IMAGE TEST CASE
        png_file = tmp_path / "site_layout_photo.png"
        png_file.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01")
        ctx_png = vision_engine_instance.analyze_vision_context(
            file_path_str=str(png_file),
            file_name="site_layout_photo.png",
            mime_type="image/png"
        )
        print(f"[3] PNG Image Context Analysis:")
        print(f"    File Type = {ctx_png.fileType} | Is Vector = {ctx_png.isVector} | Strategy = {ctx_png.strategy}")
        assert ctx_png.fileType == "PNG"
        assert ctx_png.isVector is False
        assert ctx_png.isSupported is True
        assert ctx_png.strategy == "IMAGE_RASTER_PIPELINE"
        assert "DESKEW" in ctx_png.recommendedPreprocessing
        print("    --> PNG Image Routing PASSED!")

        # 4. JPG RASTER IMAGE TEST CASE
        jpg_file = tmp_path / "scanned_layout.jpg"
        jpg_file.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00\x60")
        ctx_jpg = vision_engine_instance.analyze_vision_context(
            file_path_str=str(jpg_file),
            file_name="scanned_layout.jpg",
            mime_type="image/jpeg"
        )
        print(f"[4] JPG Image Context Analysis:")
        print(f"    File Type = {ctx_jpg.fileType} | Is Vector = {ctx_jpg.isVector} | Strategy = {ctx_jpg.strategy}")
        assert ctx_jpg.fileType == "JPG"
        assert ctx_jpg.isVector is False
        assert ctx_jpg.isSupported is True
        assert ctx_jpg.strategy == "IMAGE_RASTER_PIPELINE"
        print("    --> JPG Image Routing PASSED!")

        # 5. UNSUPPORTED DWG / CAD FORMAT TEST CASE
        dwg_file = tmp_path / "master_blueprint.dwg"
        dwg_file.write_bytes(b"AC1032\x00\x00\x00\x00")
        ctx_dwg = vision_engine_instance.analyze_vision_context(
            file_path_str=str(dwg_file),
            file_name="master_blueprint.dwg",
            mime_type="application/acad"
        )
        print(f"[5] DWG CAD Context Analysis:")
        print(f"    File Type = {ctx_dwg.fileType} | Is Supported = {ctx_dwg.isSupported} | Strategy = {ctx_dwg.strategy}")
        assert ctx_dwg.fileType == "DWG"
        assert ctx_dwg.isSupported is False
        assert ctx_dwg.strategy == "UNSUPPORTED_FORMAT"
        print("    --> DWG CAD Rejection & Routing PASSED!")

    print("=" * 60)
    print("ALL EPIC-AI-01 VISION ENGINE ROUTING TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_vision_engine_tests()
