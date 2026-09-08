from typing import Dict, List

class MatrixUtils:
    """Helper utilities for 2D Affine Transformation Matrices in PDF/CAD vector extraction."""

    @staticmethod
    def identity_matrix() -> List[float]:
        return [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]

    @staticmethod
    def multiply_matrices(m1: List[float], m2: List[float]) -> List[float]:
        a1, b1, c1, d1, e1, f1 = m1
        a2, b2, c2, d2, e2, f2 = m2
        return [
            a1 * a2 + b1 * c2,
            a1 * b2 + b1 * d2,
            c1 * a2 + d1 * c2,
            c1 * b2 + d1 * d2,
            e1 * a2 + f1 * c2 + e2,
            e1 * b2 + f1 * d2 + f2
        ]

    @staticmethod
    def transform_point(x: float, y: float, ctm: List[float]) -> Dict[str, float]:
        a, b, c, d, e, f = ctm
        return {"x": round(a * x + c * y + e, 2), "y": round(b * x + d * y + f, 2)}

    @staticmethod
    def rgb_to_hex(r: float, g: float, b: float) -> str:
        ir, ig, ib = min(255, max(0, int(r * 255))), min(255, max(0, int(g * 255))), min(255, max(0, int(b * 255)))
        return f"#{ir:02x}{ig:02x}{ib:02x}"
