import os
import sys
import numpy as np
import pytest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.engine.tile_processor import tile_processor_instance, TileProcessor
from app.engine.segmentation_engine import (
    segmentation_engine_instance,
    SegFormerSegmentationModel,
    UNetSegmentationModel,
    SEMANTIC_CLASSES
)


def test_tile_processor():
    # 1. Test image tiling for a 1200x800 image
    test_img = np.zeros((800, 1200, 3), dtype=np.uint8)
    patches, orig_shape = tile_processor_instance.generate_tiles(test_img)

    assert len(patches) > 1
    assert orig_shape == (800, 1200)
    assert all(p.image_patch.shape == (512, 512, 3) for p in patches)

    # 2. Test probability stitching
    patch_probs = []
    num_classes = len(SEMANTIC_CLASSES)
    for p in patches:
        # Synthetic probability map where class 1 is highest
        prob_map = np.zeros((num_classes, 512, 512), dtype=np.float32)
        prob_map[1, :, :] = 0.85
        prob_map[0, :, :] = 0.15
        patch_probs.append((p, prob_map))

    stitched = tile_processor_instance.stitch_probability_maps(patch_probs, orig_shape, num_classes)
    assert stitched.shape == (num_classes, 800, 1200)
    # Stitched map should have highest probability for class 1
    argmax_map = np.argmax(stitched, axis=0)
    assert np.all(argmax_map == 1)


def test_segformer_model():
    model = SegFormerSegmentationModel()
    assert model.model_name == "SegFormer-B0"

    # Synthetic tile with a simulated rectangle boundary and road
    patch = np.ones((512, 512, 3), dtype=np.uint8) * 255
    # Draw boundary
    patch[50:450, 50:450] = 128
    # Draw road line
    patch[240:270, :] = 0

    probs = model.predict_patch(patch)
    assert probs.shape == (7, 512, 512)
    # Sum of probabilities across classes should equal 1.0 at every pixel
    prob_sums = np.sum(probs, axis=0)
    assert np.allclose(prob_sums, 1.0, atol=1e-4)


def test_unet_baseline_model():
    model = UNetSegmentationModel()
    assert model.model_name == "U-Net-Baseline"

    patch = np.ones((512, 512, 3), dtype=np.uint8) * 255
    probs = model.predict_patch(patch)
    assert probs.shape == (7, 512, 512)


def test_segmentation_engine_full_run():
    # Synthetic blueprint image with boundary and roads
    canvas = np.ones((700, 1000, 3), dtype=np.uint8) * 255
    import cv2
    # Draw outer boundary
    cv2.rectangle(canvas, (50, 50), (950, 650), (0, 0, 0), 3)
    # Draw central road
    cv2.rectangle(canvas, (50, 330), (950, 370), (0, 0, 0), -1)
    # Draw plot boxes
    cv2.rectangle(canvas, (100, 100), (250, 250), (0, 0, 0), 2)
    cv2.rectangle(canvas, (300, 100), (450, 250), (0, 0, 0), 2)

    result = segmentation_engine_instance.run_semantic_segmentation(canvas, model_type="SegFormer")

    assert result["artifactType"] == "SEMANTIC_SEGMENTATION_MASKS"
    assert result["modelName"] == "SegFormer-B0"
    assert result["canvasWidth"] == 1000
    assert result["canvasHeight"] == 700
    assert "LAND_BOUNDARY" in result["classes"]
    assert "ROAD" in result["classes"]
    assert result["semanticRegionsCount"] >= 1
    assert any(r["className"] in ["LAND_BOUNDARY", "ROAD", "EXISTING_PLOT"] for r in result["semanticRegions"])
