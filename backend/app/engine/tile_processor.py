"""
TileProcessor — Multi-Scale Sliding-Window Tiling & Patch Blending Engine.
Preserves high-resolution details in large blueprints without downscaling distortion.
Uses Gaussian/linear overlap blending to eliminate patch seam artifacts.
"""

import math
import logging
from typing import List, Dict, Any, Tuple, Optional, Callable
import numpy as np

logger = logging.getLogger(__name__)


class ImagePatch:
    """Represents a single sliding-window spatial patch."""
    def __init__(self, patch_id: int, image_patch: np.ndarray, x: int, y: int, width: int, height: int):
        self.patch_id = patch_id
        self.image_patch = image_patch
        self.x = int(x)
        self.y = int(y)
        self.width = int(width)
        self.height = int(height)

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        return (self.x, self.y, self.x + self.width, self.y + self.height)


class TileProcessor:
    """
    Splits large high-resolution images into overlapping sliding-window tiles,
    and stitches multi-class probability maps back into a seamless full-resolution prediction.
    """

    def __init__(self, tile_size: int = 512, overlap: int = 64):
        self.tile_size = int(tile_size)
        self.overlap = int(overlap)
        self.stride = max(32, self.tile_size - self.overlap)

    def generate_tiles(self, image: np.ndarray) -> Tuple[List[ImagePatch], Tuple[int, int]]:
        """
        Extracts sliding window patches across the image.
        Pads the right/bottom edges if necessary to maintain exact tile dimensions.
        """
        if len(image.shape) == 2:
            orig_h, orig_w = image.shape
            channels = 1
        else:
            orig_h, orig_w, channels = image.shape

        stride = self.stride
        tile_sz = self.tile_size

        # If image is smaller than tile size, return single padded tile
        if orig_h <= tile_sz and orig_w <= tile_sz:
            padded = np.zeros((tile_sz, tile_sz, channels), dtype=image.dtype) if channels > 1 else np.zeros((tile_sz, tile_sz), dtype=image.dtype)
            padded[:orig_h, :orig_w] = image
            patch = ImagePatch(0, padded, 0, 0, orig_w, orig_h)
            return [patch], (orig_h, orig_w)

        patches: List[ImagePatch] = []
        patch_id = 0

        y_steps = list(range(0, max(1, orig_h - tile_sz + 1), stride))
        if not y_steps or (y_steps[-1] + tile_sz < orig_h):
            y_steps.append(max(0, orig_h - tile_sz))

        x_steps = list(range(0, max(1, orig_w - tile_sz + 1), stride))
        if not x_steps or (x_steps[-1] + tile_sz < orig_w):
            x_steps.append(max(0, orig_w - tile_sz))

        for y in y_steps:
            for x in x_steps:
                y_end = min(orig_h, y + tile_sz)
                x_end = min(orig_w, x + tile_sz)

                sub_img = image[y:y_end, x:x_end]
                sub_h, sub_w = sub_img.shape[:2]

                # Pad if edge tile is smaller than tile_sz
                if sub_h < tile_sz or sub_w < tile_sz:
                    if channels > 1:
                        tile = np.zeros((tile_sz, tile_sz, channels), dtype=image.dtype)
                        tile[:sub_h, :sub_w] = sub_img
                    else:
                        tile = np.zeros((tile_sz, tile_sz), dtype=image.dtype)
                        tile[:sub_h, :sub_w] = sub_img
                else:
                    tile = sub_img.copy()

                patch = ImagePatch(patch_id, tile, x, y, sub_w, sub_h)
                patches.append(patch)
                patch_id += 1

        logger.info(f"TileProcessor: Generated {len(patches)} tiles of size {tile_sz}x{tile_sz} for image {orig_w}x{orig_h}")
        return patches, (orig_h, orig_w)

    def stitch_probability_maps(
        self,
        patch_probs: List[Tuple[ImagePatch, np.ndarray]],
        orig_shape: Tuple[int, int],
        num_classes: int = 7
    ) -> np.ndarray:
        """
        Stitches class probability maps [C, H_patch, W_patch] from all patches into full resolution [C, H_orig, W_orig].
        Applies 2D Gaussian/Cosine weighting to reduce edge discontinuities.
        """
        orig_h, orig_w = orig_shape
        full_prob = np.zeros((num_classes, orig_h, orig_w), dtype=np.float32)
        weight_sum = np.zeros((orig_h, orig_w), dtype=np.float32)

        # Create 2D cosine weight window for smooth overlap blending
        tile_sz = self.tile_size
        wy = np.hanning(tile_sz)
        wx = np.hanning(tile_sz)
        weight_2d = np.outer(wy, wx).astype(np.float32)
        weight_2d = np.clip(weight_2d, 0.05, 1.0)  # Avoid exact zero at boundaries

        for patch, prob_map in patch_probs:
            x, y = patch.x, patch.y
            w, h = patch.width, patch.height

            # Extract active portion of weight window
            w_crop = weight_2d[:h, :w]
            p_crop = prob_map[:, :h, :w]

            for c in range(num_classes):
                full_prob[c, y:y+h, x:x+w] += p_crop[c] * w_crop

            weight_sum[y:y+h, x:x+w] += w_crop

        # Normalize by total blended weight
        weight_sum[weight_sum == 0] = 1.0
        for c in range(num_classes):
            full_prob[c] /= weight_sum

        return full_prob


tile_processor_instance = TileProcessor(tile_size=512, overlap=64)
