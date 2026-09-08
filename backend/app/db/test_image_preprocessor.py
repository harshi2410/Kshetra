import os
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.image_preprocessor import image_preprocessor_instance

def run_image_preprocessor_tests():
    print("=" * 60)
    print("RUNNING TASK-041 IMAGE PREPROCESSING ENGINE TEST SUITE")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # 1. VECTOR PDF PREPROCESSING TEST CASE
        vec_pdf = tmp_path / "vector_layout.pdf"
        vec_pdf.write_bytes(
            b"%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n"
            b"2 0 obj << /Font << /F1 3 0 R >> >> endobj\n"
            b"trailer << /Root 1 0 R >>\n%%EOF"
        )
        res_vec_pdf = image_preprocessor_instance.preprocess_image(str(vec_pdf), "application/pdf")
        print(f"[1] Vector PDF Preprocessing PASSED:")
        print(f"    Dimensions = {res_vec_pdf['originalWidth']}x{res_vec_pdf['originalHeight']} | Artifact = {res_vec_pdf['artifactType']}")
        assert res_vec_pdf["artifactType"] == "PREPROCESSED_IMAGE"
        assert res_vec_pdf["originalWidth"] > 0
        assert res_vec_pdf["originalHeight"] > 0
        assert "processedImageBase64Length" in res_vec_pdf

        # 2. RASTER PDF PREPROCESSING TEST CASE
        ras_pdf = tmp_path / "scanned_blueprint.pdf"
        ras_pdf.write_bytes(
            b"%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n"
            b"2 0 obj << /Subtype /Image /Filter /DCTDecode >> endobj\n"
            b"trailer << /Root 1 0 R >>\n%%EOF"
        )
        res_ras_pdf = image_preprocessor_instance.preprocess_image(str(ras_pdf), "application/pdf")
        print(f"[2] Raster PDF Preprocessing PASSED:")
        print(f"    Deskew Angle = {res_ras_pdf['deskewAngleDegrees']}° | Threshold = {res_ras_pdf['thresholdMethod']}")
        assert res_ras_pdf["artifactType"] == "PREPROCESSED_IMAGE"
        assert res_ras_pdf["thresholdMethod"] == "ADAPTIVE_GAUSSIAN"

        # 3. PNG RASTER IMAGE PREPROCESSING TEST CASE
        png_file = tmp_path / "site_blueprint.png"
        png_file.write_bytes(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01\x00\x00\x00\x01\x00\x08\x02\x00\x00\x00\x90wS\xde"
        )
        res_png = image_preprocessor_instance.preprocess_image(str(png_file), "image/png")
        print(f"[3] PNG Image Preprocessing PASSED:")
        print(f"    Dimensions = {res_png['originalWidth']}x{res_png['originalHeight']} | CLAHE Contrast = {res_png['contrastMethod']}")
        assert res_png["artifactType"] == "PREPROCESSED_IMAGE"
        assert res_png["contrastMethod"] == "CLAHE"

        # 4. JPG RASTER IMAGE PREPROCESSING TEST CASE
        jpg_file = tmp_path / "site_photo.jpg"
        jpg_file.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00\x60")
        res_jpg = image_preprocessor_instance.preprocess_image(str(jpg_file), "image/jpeg")
        print(f"[4] JPG Image Preprocessing PASSED:")
        print(f"    Artifact Type = {res_jpg['artifactType']} | Denoise = {res_jpg['denoiseMethod']}")
        assert res_jpg["artifactType"] == "PREPROCESSED_IMAGE"
        assert res_jpg["denoiseMethod"] == "GAUSSIAN_BLUR"

        # 5. TIFF RASTER IMAGE PREPROCESSING TEST CASE
        tiff_file = tmp_path / "scanned_archive.tiff"
        tiff_file.write_bytes(b"II*\x00\x08\x00\x00\x00")
        res_tiff = image_preprocessor_instance.preprocess_image(str(tiff_file), "image/tiff")
        print(f"[5] TIFF Image Preprocessing PASSED:")
        print(f"    Artifact Type = {res_tiff['artifactType']} | Base64 Length = {res_tiff['processedImageBase64Length']}")
        assert res_tiff["artifactType"] == "PREPROCESSED_IMAGE"
        assert res_tiff["processedImageBase64Length"] > 0

    print("=" * 60)
    print("ALL TASK-041 IMAGE PREPROCESSING ENGINE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_image_preprocessor_tests()
