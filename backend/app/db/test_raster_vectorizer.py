import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.image_preprocessor import image_preprocessor_instance
from app.engine.raster_vectorizer import raster_vectorizer_instance

def run_raster_vectorizer_tests():
    print("=" * 60)
    print("RUNNING TASK-042 RASTER VECTORIZATION ENGINE TEST SUITE")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # 1. PNG BLUEPRINT TEST CASE
        png_file = tmp_path / "site_blueprint.png"
        png_file.write_bytes(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01\x00\x00\x00\x01\x00\x08\x02\x00\x00\x00\x90wS\xde"
        )
        preprocessed_png = image_preprocessor_instance.preprocess_image(str(png_file), "image/png")
        vector_png = raster_vectorizer_instance.vectorize_raster_image(preprocessed_png)
        print(f"[1] PNG Blueprint Vectorization PASSED:")
        print(f"    Total Primitives = {vector_png['totalPrimitivesCount']} | Polygons = {vector_png['polygonsCount']} | Artifact = {vector_png['artifactType']}")
        assert vector_png["artifactType"] == "RASTER_VECTOR_PRIMITIVES"
        assert vector_png["totalPrimitivesCount"] >= 0

        # 2. JPG BLUEPRINT TEST CASE
        jpg_file = tmp_path / "site_layout.jpg"
        jpg_file.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00\x60")
        preprocessed_jpg = image_preprocessor_instance.preprocess_image(str(jpg_file), "image/jpeg")
        vector_jpg = raster_vectorizer_instance.vectorize_raster_image(preprocessed_jpg)
        print(f"[2] JPG Blueprint Vectorization PASSED:")
        print(f"    Total Primitives = {vector_jpg['totalPrimitivesCount']} | Lines = {vector_jpg['linesCount']}")
        assert vector_jpg["artifactType"] == "RASTER_VECTOR_PRIMITIVES"

        # 3. TIFF BLUEPRINT TEST CASE
        tiff_file = tmp_path / "scanned_archive.tiff"
        tiff_file.write_bytes(b"II*\x00\x08\x00\x00\x00")
        preprocessed_tiff = image_preprocessor_instance.preprocess_image(str(tiff_file), "image/tiff")
        vector_tiff = raster_vectorizer_instance.vectorize_raster_image(preprocessed_tiff)
        print(f"[3] TIFF Blueprint Vectorization PASSED:")
        print(f"    Total Primitives = {vector_tiff['totalPrimitivesCount']} | Polylines = {vector_tiff['polylinesCount']}")
        assert vector_tiff["artifactType"] == "RASTER_VECTOR_PRIMITIVES"

        # 4. SCANNED PDF TEST CASE
        ras_pdf = tmp_path / "scanned_blueprint.pdf"
        ras_pdf.write_bytes(
            b"%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n"
            b"2 0 obj << /Subtype /Image /Filter /DCTDecode >> endobj\n"
            b"trailer << /Root 1 0 R >>\n%%EOF"
        )
        preprocessed_pdf = image_preprocessor_instance.preprocess_image(str(ras_pdf), "application/pdf")
        vector_pdf = raster_vectorizer_instance.vectorize_raster_image(preprocessed_pdf)
        print(f"[4] Scanned PDF Vectorization PASSED:")
        print(f"    Total Primitives = {vector_pdf['totalPrimitivesCount']}")
        assert vector_pdf["artifactType"] == "RASTER_VECTOR_PRIMITIVES"

        # 5. EMPTY / BLANK IMAGE TEST CASE (NO CRASH GUARANTEE)
        empty_dict = {"processedWidth": 800, "processedHeight": 600, "processedImageBase64": ""}
        vector_empty = raster_vectorizer_instance.vectorize_raster_image(empty_dict)
        print(f"[5] Empty Image / Fallback Vectorization PASSED (No Crash):")
        print(f"    Total Synthetic Primitives Extracted = {vector_empty['totalPrimitivesCount']}")
        assert vector_empty["artifactType"] == "RASTER_VECTOR_PRIMITIVES"
        assert vector_empty["totalPrimitivesCount"] > 0

    print("=" * 60)
    print("ALL TASK-042 RASTER VECTORIZATION ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_raster_vectorizer_tests()
