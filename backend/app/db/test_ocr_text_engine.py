import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.ocr_text_engine import ocr_text_engine_instance, OCRTextSanitizer
from app.engine.label_association_engine import label_association_engine_instance


def test_ocr_sanitizer_and_token_parser():
    # 1. OCR character confusion corrections
    assert OCRTextSanitizer.sanitize_text("PLOT 1O") == "PLOT 10"
    assert OCRTextSanitizer.sanitize_text("P-l0") == "P-10"
    assert OCRTextSanitizer.sanitize_text("3O X 4O") == "30 x 40"
    assert OCRTextSanitizer.sanitize_text("15OO SQFT") == "1500 SQFT"
    assert OCRTextSanitizer.sanitize_text("~PLOT 25|") == "PLOT 25"

    # 2. Structured Dimension Parsing
    dim_res = OCRTextSanitizer.parse_tokens("30'0\" x 45'0\"")
    assert dim_res["classification"] == "DIMENSION"
    assert dim_res["structuredData"]["width"] == 30.0
    assert dim_res["structuredData"]["length"] == 45.0
    assert dim_res["structuredData"]["unit"] == "ft"

    # 3. Structured Area Parsing
    area_res = OCRTextSanitizer.parse_tokens("1200 SQ. FT.")
    assert area_res["classification"] == "AREA"
    assert area_res["structuredData"]["areaValue"] == 1200.0
    assert area_res["structuredData"]["unit"] == "sqft"

    # 4. Road Label Parsing
    road_res = OCRTextSanitizer.parse_tokens("40 FT WIDE ROAD")
    assert road_res["classification"] == "ROAD_LABEL"
    assert road_res["structuredData"]["roadWidth"] == 40.0

    # 5. Plot Label Parsing
    plot_res = OCRTextSanitizer.parse_tokens("PLOT NO. 14B")
    assert plot_res["classification"] == "PLOT_LABEL"
    assert plot_res["structuredData"]["plotNumber"] == "14B"


def test_empty_input_zero_fake_data():
    empty_dict = {}
    res_empty = ocr_text_engine_instance.extract_text_elements(empty_dict, empty_dict)
    assert res_empty["artifactType"] == "OCR_TEXT_ELEMENTS"
    assert res_empty["totalTextElementsCount"] == 0
    assert len(res_empty["textElements"]) == 0


def test_label_association_with_shapely():
    plots_data = {
        "plots": [
            {
                "plotId": "plot-001",
                "geometry": [[100, 100], [200, 100], [200, 200], [100, 200]],
                "centroid": [150.0, 150.0],
                "boundingBox": [100, 100, 200, 200]
            }
        ]
    }
    roads_data = {
        "roads": [
            {
                "roadId": "road-001",
                "centerline": [[0, 50], [300, 50]],
                "width": 30.0
            }
        ]
    }
    boundary_data = {"boundaryId": "boundary-001"}
    ocr_data = {
        "textElements": [
            {
                "id": "ocr-1",
                "text": "PLOT 1O",
                "cleanedText": "PLOT 10",
                "classification": "PLOT_LABEL",
                "structuredData": {"plotNumber": "10", "formattedLabel": "PLOT-10"},
                "center": [150, 150],
                "boundingBox": [140, 140, 160, 160]
            },
            {
                "id": "ocr-2",
                "text": "30' ROAD",
                "cleanedText": "30' ROAD",
                "classification": "ROAD_LABEL",
                "structuredData": {"roadName": "30' ROAD", "roadWidth": 30.0},
                "center": [150, 50],
                "boundingBox": [130, 40, 170, 60]
            }
        ]
    }

    res = label_association_engine_instance.associate_labels(plots_data, roads_data, boundary_data, ocr_data)
    assert res["artifactType"] == "LABELED_LAYOUT"
    assert len(res["plots"]) == 1
    assert res["plots"][0]["plotNumber"] == "PLOT-10"
    assert res["plots"][0]["nearestRoadId"] == "road-001"
    assert res["roads"][0]["roadName"] == "30' ROAD"
    assert res["totalOcrAssignmentsCount"] == 2


if __name__ == "__main__":
    test_ocr_sanitizer_and_token_parser()
    test_empty_input_zero_fake_data()
    test_label_association_with_shapely()
    print("ALL OCR AND LABEL ASSOCIATION TESTS PASSED SUCCESSFULLY!")
