import os
import re
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Provider Availability Checks
try:
    import pymupdf as fitz  # PyMuPDF modern import
    HAS_FITZ = True
except ImportError:
    try:
        import fitz
        HAS_FITZ = True
    except ImportError:
        HAS_FITZ = False

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

try:
    import easyocr
    HAS_EASYOCR = True
    _EASYOCR_READER = None
except ImportError:
    HAS_EASYOCR = False
    _EASYOCR_READER = None


class OCRTextSanitizer:
    """
    Regex and heuristic sanitization engine for architectural blueprints and land layouts.
    Corrects common OCR character confusions ('O' -> '0', 'l'/'I' -> '1', 'S' -> '5')
    and extracts structured engineering attributes (dimensions, areas, plot IDs, road widths).
    """

    @classmethod
    def sanitize_text(cls, raw_text: str) -> str:
        if not raw_text:
            return ""

        text = raw_text.strip()
        # Remove noisy standalone OCR artifact characters
        text = re.sub(r"^[|\_~^\{\}\\`\-]+", "", text)
        text = re.sub(r"[|\_~^\{\}\\`\-]+$", "", text)

        # Fix token-level numeric patterns (e.g. 15OO -> 1500, 3O -> 30, P-l0 -> P-10)
        tokens = text.split()
        cleaned_tokens = []
        for tok in tokens:
            # If token starts with digits and contains O/o (e.g. 15OO, 3O)
            if re.match(r"^\d+[Oo0-9\.,']+$", tok):
                tok = tok.replace("O", "0").replace("o", "0")
            # If token starts with digits and contains l/I (e.g. 1I00, 1l0)
            if re.match(r"^\d+[lI0-9\.,']+$", tok):
                tok = tok.replace("l", "1").replace("I", "1")
            # If token is prefixed by letter-dash and has OCR error (e.g. P-1O, P-l0)
            prefix_match = re.match(r"^([A-Za-z]+-)([Oo0-9lI]+)$", tok)
            if prefix_match:
                prefix, num_part = prefix_match.group(1), prefix_match.group(2)
                num_part = num_part.replace("O", "0").replace("o", "0").replace("l", "1").replace("I", "1")
                tok = f"{prefix}{num_part}"
            # If token is PLOT 1O or similar
            if tok.upper() == "1O" or tok.upper() == "2O" or tok.upper() == "3O" or tok.upper() == "4O" or tok.upper() == "5O":
                tok = tok[0] + "0"
            cleaned_tokens.append(tok)

        text = " ".join(cleaned_tokens)

        # Standardize dimension multiplier symbols (e.g. 30'0" X 40'0" -> 30'0" x 40'0")
        text = re.sub(r"\s*[×\*X]\s*", " x ", text)

        return text.strip()

    @classmethod
    def parse_tokens(cls, text: str) -> Dict[str, Any]:
        """
        Parses architectural and land-planning tokens into structured attributes.
        Returns:
            classification: PLOT_LABEL | DIMENSION | AREA | ROAD_LABEL | BOUNDARY_OR_GLOBAL | OTHER
            structuredData: dict with parsed values
        """
        if not text:
            return {"classification": "OTHER", "structuredData": {}}

        clean = cls.sanitize_text(text)
        upper_text = clean.upper()

        # 1. Dimension Pattern (e.g. 30' x 40', 30 x 40, 12.5m x 15m, 30'0" x 45'0", 30'-0" x 45'-0")
        dim_match = re.search(
            r"(\d+(?:\.\d+)?)\s*(?:'|ft|feet|m|mtr|meters)?(?:\s*[-–]?\s*(\d+(?:\.\d+)?)(?:\"|''|in)?)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:'|ft|feet|m|mtr|meters)?(?:\s*[-–]?\s*(\d+(?:\.\d+)?)(?:\"|''|in)?)?",
            clean,
            re.IGNORECASE
        )
        if dim_match and not re.search(r"(?:ROAD|STREET|AVENUE|LANE)", upper_text):
            w = float(dim_match.group(1))
            if dim_match.group(2):
                w += float(dim_match.group(2)) / 12.0
            l = float(dim_match.group(3))
            if dim_match.group(4):
                l += float(dim_match.group(4)) / 12.0
            unit = "m" if ("M" in upper_text or "MTR" in upper_text) else "ft"
            return {
                "classification": "DIMENSION",
                "structuredData": {
                    "width": round(w, 2),
                    "length": round(l, 2),
                    "unit": unit,
                    "areaApprox": round(w * l, 2)
                }
            }

        # 2. Area Pattern (e.g. 1200 SQFT, 1500 SQ. FT., 120 SQ.M, 2.5 ACRES, 5 CENTS, 10 GUNTHAS)
        area_match = re.search(
            r"(\d+(?:\.\d+)?)\s*(?:SQ\.?\s*FT|SQFT|SQ\.?\s*M|SQM|SQUARE\s*FEET|ACRES|HECTARES|CENTS|GUNTHAS?)",
            upper_text
        )
        if area_match:
            val = float(area_match.group(1))
            unit = "sqft"
            if "SQ.M" in upper_text or "SQM" in upper_text:
                unit = "sqm"
            elif "ACRE" in upper_text:
                unit = "acres"
            elif "CENT" in upper_text:
                unit = "cents"
            elif "GUNTHA" in upper_text:
                unit = "guntha"
            return {
                "classification": "AREA",
                "structuredData": {
                    "areaValue": val,
                    "unit": unit
                }
            }

        # 3. Road / Corridor Width & Name Pattern (e.g. 30' WIDE ROAD, 40 FT ROAD, 12M ROAD, MAIN ROAD)
        road_match = re.search(
            r"(\d+(?:\.\d+)?)\s*(?:'|FT|M|MTR|FEET|METERS)?\s*(?:WIDE|W)?\s*(?:ROAD|STREET|AVENUE|LANE|R\.?O\.?W\.?|PATHWAY)",
            upper_text
        )
        if road_match or "ROAD" in upper_text or "STREET" in upper_text or "AVENUE" in upper_text:
            width = None
            if road_match:
                width = float(road_match.group(1))
            return {
                "classification": "ROAD_LABEL",
                "structuredData": {
                    "roadName": clean,
                    "roadWidth": width,
                    "unit": "m" if ("M" in upper_text and "SQ" not in upper_text) else "ft"
                }
            }

        # 4. Plot Number Pattern (e.g. PLOT NO. 10, PLOT-12, P-10, SITE 45, NO. 12, P12, 102)
        plot_match = re.search(
            r"(?:PLOT\s*(?:NO\.?|#)?\s*|SITE\s*(?:NO\.?|#)?\s*|P\.?\s*NO\.?\s*|P\s*[-#]?\s*)(\d+[A-Za-z]?)",
            upper_text
        )
        if plot_match:
            plot_num = plot_match.group(1)
            return {
                "classification": "PLOT_LABEL",
                "structuredData": {
                    "plotNumber": plot_num,
                    "formattedLabel": f"PLOT-{plot_num}"
                }
            }

        # Standalone numeric string (e.g. "12", "101") if short
        if re.match(r"^\d{1,4}[A-Za-z]?$", clean):
            return {
                "classification": "PLOT_LABEL",
                "structuredData": {
                    "plotNumber": clean,
                    "formattedLabel": f"PLOT-{clean}"
                }
            }

        # 5. Boundary & Global Annotations (NORTH, SURVEY NO, S.NO, KEY PLAN, LEGEND)
        if any(k in upper_text for k in ["NORTH", "SURVEY", "S.NO", "SY.NO", "KHASRA", "VILLAGE", "DISTRICT", "TALUK", "KEY PLAN"]):
            return {
                "classification": "BOUNDARY_OR_GLOBAL",
                "structuredData": {
                    "category": "PROJECT_METADATA",
                    "text": clean
                }
            }

        return {
            "classification": "GENERAL_TEXT",
            "structuredData": {
                "text": clean
            }
        }


class OCRTextEngine:
    """
    Production Optical Character Recognition (OCR) Engine (TASK-054)
    Extracts authentic text elements, plot labels, road names, and dimensions from
    Vector PDFs and Raster layout images using PyMuPDF, PyTesseract, and EasyOCR.
    Applies regex sanitization and structured engineering parsing.
    Strict Rule: Returns 0 text elements if no text is detected. Never fabricates labels.
    """

    def __init__(self):
        self.sanitizer = OCRTextSanitizer()

    def _get_easyocr_reader(self):
        global _EASYOCR_READER
        if HAS_EASYOCR and _EASYOCR_READER is None:
            try:
                _EASYOCR_READER = easyocr.Reader(['en'], gpu=False)
            except Exception as e:
                logger.warning(f"Failed to initialize EasyOCR reader: {e}")
                _EASYOCR_READER = False
        return _EASYOCR_READER if _EASYOCR_READER is not False else None

    def extract_text_elements(
        self,
        vision_context_dict: Dict[str, Any],
        preprocessed_image_dict: Dict[str, Any],
        source_file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extracts real text elements from vector streams or raster layout images.
        Confidence scores are derived directly from the underlying OCR engine.
        Enriches all text elements with sanitized text and structured token data.
        """
        import cv2

        is_vector = vision_context_dict.get("isVector", False)
        elements: List[Dict[str, Any]] = []
        source_pipeline = "VECTOR" if is_vector else "RASTER"

        # --------------------------------------------------------------------
        # STAGE 1: Vector PDF Text Extraction via PyMuPDF (fitz)
        # --------------------------------------------------------------------
        target_path = source_file_path or preprocessed_image_dict.get("originalFilePath", "")
        if is_vector and target_path and Path(target_path).exists() and HAS_FITZ and target_path.lower().endswith(".pdf"):
            try:
                doc = fitz.open(target_path)
                for page_idx, page in enumerate(doc):
                    words = page.get_text("words")  # returns list of (x0, y0, x1, y1, word, block_no, line_no, word_no)
                    for w_idx, w in enumerate(words):
                        text = str(w[4]).strip()
                        if not text or len(text) < 1:
                            continue
                        x0, y0, x1, y1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
                        w_val, h_val = round(x1 - x0, 2), round(y1 - y0, 2)
                        cx, cy = round((x0 + x1) / 2.0, 2), round((y0 + y1) / 2.0, 2)

                        cleaned_text = self.sanitizer.sanitize_text(text)
                        parsed = self.sanitizer.parse_tokens(cleaned_text)

                        elements.append({
                            "id": f"ocr-vec-{page_idx+1:02d}-{w_idx+1:04d}",
                            "text": text,
                            "cleanedText": cleaned_text,
                            "classification": parsed["classification"],
                            "structuredData": parsed["structuredData"],
                            "confidence": 1.0,  # Vector text extraction has 100% precision
                            "boundingBox": [x0, y0, x1, y1],
                            "center": [cx, cy],
                            "width": w_val,
                            "height": h_val,
                            "rotation": 0.0,
                            "pageNumber": page_idx + 1,
                            "sourcePipeline": "VECTOR"
                        })
                doc.close()
            except Exception as pdf_err:
                logger.warning(f"PyMuPDF vector text extraction failed: {pdf_err}")

        # --------------------------------------------------------------------
        # STAGE 2: Raster Image OCR Processing (PyTesseract / EasyOCR)
        # --------------------------------------------------------------------
        if not elements:
            source_pipeline = "RASTER"
            img_path = preprocessed_image_dict.get("preprocessedImagePath", "") or preprocessed_image_dict.get("originalFilePath", "")
            img_gray = None

            if img_path and Path(img_path).exists():
                img_gray = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)

            if img_gray is not None:
                # Provider 1: PyTesseract (Primary fast OCR)
                if HAS_PYTESSERACT:
                    try:
                        data = pytesseract.image_to_data(img_gray, output_type=pytesseract.Output.DICT)
                        n_boxes = len(data["text"])
                        for i in range(n_boxes):
                            raw_txt = str(data["text"][i]).strip()
                            conf_val = float(data["conf"][i])
                            if not raw_txt or conf_val <= 0:
                                continue

                            x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
                            x0, y0, x1, y1 = float(x), float(y), float(x + w), float(y + h)
                            cx, cy = round((x0 + x1) / 2.0, 2), round((y0 + y1) / 2.0, 2)
                            real_conf = round(conf_val / 100.0, 3)

                            cleaned_text = self.sanitizer.sanitize_text(raw_txt)
                            parsed = self.sanitizer.parse_tokens(cleaned_text)

                            elements.append({
                                "id": f"ocr-tess-{i+1:04d}",
                                "text": raw_txt,
                                "cleanedText": cleaned_text,
                                "classification": parsed["classification"],
                                "structuredData": parsed["structuredData"],
                                "confidence": real_conf,
                                "boundingBox": [x0, y0, x1, y1],
                                "center": [cx, cy],
                                "width": float(w),
                                "height": float(h),
                                "rotation": 0.0,
                                "pageNumber": 1,
                                "sourcePipeline": "RASTER"
                            })
                    except Exception as tess_err:
                        logger.warning(f"PyTesseract OCR failed: {tess_err}")

                # Provider 2: EasyOCR (Fallback deep learning OCR)
                if not elements and HAS_EASYOCR:
                    reader = self._get_easyocr_reader()
                    if reader:
                        try:
                            results = reader.readtext(str(img_path))
                            for idx, (bbox_pts, text_str, conf_score) in enumerate(results):
                                txt = str(text_str).strip()
                                if not txt or conf_score < 0.1:
                                    continue

                                pts = np.array(bbox_pts)
                                x0, y0 = float(pts[:, 0].min()), float(pts[:, 1].min())
                                x1, y1 = float(pts[:, 0].max()), float(pts[:, 1].max())
                                w_val, h_val = round(x1 - x0, 2), round(y1 - y0, 2)
                                cx, cy = round((x0 + x1) / 2.0, 2), round((y0 + y1) / 2.0, 2)

                                cleaned_text = self.sanitizer.sanitize_text(txt)
                                parsed = self.sanitizer.parse_tokens(cleaned_text)

                                elements.append({
                                    "id": f"ocr-easy-{idx+1:04d}",
                                    "text": txt,
                                    "cleanedText": cleaned_text,
                                    "classification": parsed["classification"],
                                    "structuredData": parsed["structuredData"],
                                    "confidence": round(float(conf_score), 3),
                                    "boundingBox": [x0, y0, x1, y1],
                                    "center": [cx, cy],
                                    "width": w_val,
                                    "height": h_val,
                                    "rotation": 0.0,
                                    "pageNumber": 1,
                                    "sourcePipeline": "RASTER"
                                })
                        except Exception as easy_err:
                            logger.warning(f"EasyOCR failed: {easy_err}")

        # --------------------------------------------------------------------
        # STAGE 3: Final Output Construction (ZERO FAKE DATA)
        # --------------------------------------------------------------------
        result = {
            "artifactType": "OCR_TEXT_ELEMENTS",
            "totalTextElementsCount": len(elements),
            "sourcePipeline": source_pipeline,
            "textElements": elements
        }

        logger.info(f"OCRTextEngine v2 completed: {len(elements)} authentic text elements extracted ({source_pipeline} pipeline)")
        return result


# Singleton Instance
ocr_text_engine_instance = OCRTextEngine()
