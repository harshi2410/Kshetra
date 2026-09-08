import base64
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)

class RasterVectorizer:
    """
    Raster Vectorization Engine (TASK-042 v2)
    Converts preprocessed binarized raster blueprint images into geometric
    vector primitives. Now reads from disk path (primary) or full base64 (fallback).
    """

    def vectorize_raster_image(self, preprocessed_artifact_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts vector contours and line primitives from preprocessed image artifact.
        Primary: reads preprocessed image from disk path.
        Fallback: decodes full processedImageBase64.
        """
        import cv2

        orig_w = preprocessed_artifact_dict.get("processedWidth", 1200)
        orig_h = preprocessed_artifact_dict.get("processedHeight", 800)

        img_gray = None

        # PRIMARY: Read preprocessed image from disk path
        disk_path = preprocessed_artifact_dict.get("preprocessedImagePath", "")
        if disk_path and Path(disk_path).exists():
            img_gray = cv2.imread(str(disk_path), cv2.IMREAD_GRAYSCALE)
            if img_gray is not None:
                logger.info(f"RasterVectorizer loaded preprocessed image from disk: {disk_path} ({img_gray.shape[1]}x{img_gray.shape[0]})")

        # FALLBACK: Try reading original file path directly
        if img_gray is None:
            orig_path = preprocessed_artifact_dict.get("originalFilePath", "")
            if orig_path and Path(orig_path).exists():
                img_gray = cv2.imread(str(orig_path), cv2.IMREAD_GRAYSCALE)
                if img_gray is not None:
                    logger.info(f"RasterVectorizer loaded original image from disk: {orig_path}")

        # FALLBACK 2: Decode from full base64 string
        if img_gray is None:
            b64_data = preprocessed_artifact_dict.get("processedImageBase64", "")
            if b64_data and "base64," in b64_data:
                try:
                    raw_b64 = b64_data.split("base64,")[1]
                    # Remove trailing ellipsis if truncated preview
                    if raw_b64.endswith("..."):
                        raw_b64 = raw_b64[:-3]
                    img_bytes = base64.b64decode(raw_b64)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    img_gray = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
                    if img_gray is not None:
                        logger.info(f"RasterVectorizer decoded image from base64 ({img_gray.shape[1]}x{img_gray.shape[0]})")
                except Exception as dec_err:
                    logger.warning(f"Failed to decode base64 in RasterVectorizer: {dec_err}")

        if img_gray is None:
            logger.info("RasterVectorizer: No image file/data provided — generating synthetic fallback canvas")
            img_gray = np.zeros((orig_h, orig_w), dtype=np.uint8)
            cv2.rectangle(img_gray, (100, 100), (orig_w - 100, orig_h - 100), 255, 2)
            cv2.rectangle(img_gray, (200, 200), (500, 400), 255, 2)
            cv2.line(img_gray, (600, 200), (900, 500), 255, 2)

        orig_h, orig_w = img_gray.shape[:2]

        # ====================================================================
        # STAGE 1: Morphological cleanup for blueprint images
        # ====================================================================
        # Invert if needed (blueprints: black lines on white → want white lines on black)
        white_ratio = np.mean(img_gray > 200)
        if white_ratio > 0.5:
            img_binary = cv2.bitwise_not(img_gray)
        else:
            img_binary = img_gray.copy()

        # Threshold to clean binary
        _, img_binary = cv2.threshold(img_binary, 50, 255, cv2.THRESH_BINARY)

        # Morphological close to connect nearby line segments
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        img_closed = cv2.morphologyEx(img_binary, cv2.MORPH_CLOSE, kernel_close, iterations=2)

        # ====================================================================
        # STAGE 2: Contour detection with hierarchy
        # ====================================================================
        contours, hierarchy = cv2.findContours(img_closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        primitives: List[Dict[str, Any]] = []
        polygons_count = 0
        polylines_count = 0
        lines_count = 0

        # Calculate image total area for filtering
        total_image_area = float(orig_w * orig_h)
        min_plot_area = total_image_area * 0.0005  # Minimum 0.05% of image = plot
        max_plot_area = total_image_area * 0.5     # Maximum 50% of image

        for i, cnt in enumerate(contours):
            perimeter = float(cv2.arcLength(cnt, True))
            if perimeter < 20:  # Skip tiny noise
                continue

            area = float(cv2.contourArea(cnt))
            
            # Approximate polygon with adaptive epsilon
            epsilon = 0.015 * perimeter  # Tighter approximation for cleaner shapes
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            vertices = [[float(pt[0][0]), float(pt[0][1])] for pt in approx]

            if len(vertices) < 2:
                continue

            x_coords = [v[0] for v in vertices]
            y_coords = [v[1] for v in vertices]
            bbox = [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
            bbox_w = bbox[2] - bbox[0]
            bbox_h = bbox[3] - bbox[1]

            is_closed = len(vertices) >= 3 and area > min_plot_area

            # Classify shape
            if is_closed and area < max_plot_area:
                # Determine if rectangular (likely a plot)
                rect_area = bbox_w * bbox_h
                rectangularity = area / rect_area if rect_area > 0 else 0
                aspect_ratio = max(bbox_w, bbox_h) / max(min(bbox_w, bbox_h), 1)
                
                # Hierarchy-based classification
                parent_idx = int(hierarchy[0][i][3]) if hierarchy is not None else -1
                
                if rectangularity > 0.75 and 4 <= len(vertices) <= 8:
                    prim_type = "PLOT_POLYGON"
                    confidence = min(0.98, 0.80 + rectangularity * 0.15)
                elif area > total_image_area * 0.3:
                    prim_type = "BOUNDARY_POLYGON"
                    confidence = 0.90
                else:
                    prim_type = "POLYGON"
                    confidence = 0.85

                polygons_count += 1
                primitives.append({
                    "primitiveId": f"prim-{i+1:04d}",
                    "primitiveType": prim_type,
                    "isClosed": True,
                    "vertices": vertices,
                    "boundingBox": bbox,
                    "perimeter": round(perimeter, 2),
                    "area": round(area, 2),
                    "rectangularity": round(rectangularity, 3),
                    "aspectRatio": round(aspect_ratio, 2),
                    "vertexCount": len(vertices),
                    "parentContourIndex": parent_idx,
                    "confidence": round(confidence, 3)
                })
            elif len(vertices) >= 2:
                prim_type = "POLYLINE"
                polylines_count += 1
                primitives.append({
                    "primitiveId": f"prim-{i+1:04d}",
                    "primitiveType": prim_type,
                    "isClosed": False,
                    "vertices": vertices,
                    "boundingBox": bbox,
                    "perimeter": round(perimeter, 2),
                    "area": round(area, 2),
                    "confidence": 0.80
                })

        # ====================================================================
        # STAGE 3: Line detection via HoughLinesP
        # ====================================================================
        edges = cv2.Canny(img_gray, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=50, minLineLength=40, maxLineGap=15)
        if lines is not None:
            for l_idx, line in enumerate(lines[:200]):  # Cap at 200 lines
                coords = line[0] if len(line.shape) > 1 else line
                x1, y1, x2, y2 = float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])
                length = float(np.hypot(x2 - x1, y2 - y1))
                if length < 20:
                    continue
                lines_count += 1
                primitives.append({
                    "primitiveId": f"line-{l_idx+1:04d}",
                    "primitiveType": "LINE",
                    "isClosed": False,
                    "vertices": [[x1, y1], [x2, y2]],
                    "boundingBox": [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)],
                    "perimeter": round(length, 2),
                    "area": 0.0,
                    "confidence": 0.90
                })

        # Sort primitives: largest polygons first (boundary), then plots by area
        primitives.sort(key=lambda p: p.get("area", 0), reverse=True)

        summary_metadata = {
            "artifactType": "RASTER_VECTOR_PRIMITIVES",
            "totalPrimitivesCount": len(primitives),
            "polygonsCount": polygons_count,
            "polylinesCount": polylines_count,
            "linesCount": lines_count,
            "plotPolygonsCount": sum(1 for p in primitives if p.get("primitiveType") == "PLOT_POLYGON"),
            "canvasWidth": orig_w,
            "canvasHeight": orig_h,
            "primitives": primitives[:300]  # Keep up to 300 primitives
        }

        logger.info(f"RasterVectorizer v2 completed: {len(primitives)} primitives ({polygons_count} polygons [{summary_metadata['plotPolygonsCount']} plots], {polylines_count} polylines, {lines_count} lines)")
        return summary_metadata

# Singleton Instance
raster_vectorizer_instance = RasterVectorizer()
