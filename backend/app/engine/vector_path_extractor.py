import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pypdf
from app.engine.matrix_utils import MatrixUtils
from app.engine.normalizer_helpers import BoundingBoxCalculator

logger = logging.getLogger(__name__)

class AbstractVectorExtractor(ABC):
    @abstractmethod
    def extract_vector_paths(self, file_path_str: str) -> Dict[str, Any]: pass

class PDFVectorPathExtractor(AbstractVectorExtractor):
    """
    Enterprise CAD-Compliant PDF Vector Path Extraction Engine.
    Applies 2D Affine Transformation Matrices (cm), manages Graphics State Stack (q/Q),
    and captures drawing primitives (lines, curves, rectangles, polylines, closed polygons).
    """

    def _tokenize_content_stream(self, raw_bytes: bytes) -> List[Tuple[List[float], str]]:
        try: text = raw_bytes.decode("latin1")
        except Exception: return []
        tokens = text.split()
        ops, current_operands = [], []
        for tok in tokens:
            try: current_operands.append(float(tok))
            except ValueError:
                ops.append((current_operands, tok))
                current_operands = []
        return ops

    def extract_vector_paths(self, file_path_str: str) -> Dict[str, Any]:
        p = Path(file_path_str)
        if not p.is_absolute():
            p = Path(__file__).resolve().parent.parent.parent / file_path_str
        if not p.exists() or not p.is_file():
            raise FileNotFoundError(f"PDF file not found at path: {file_path_str}")

        primitives: List[Dict[str, Any]] = []
        stats = {"pages": 0, "totalOperators": 0, "totalPrimitives": 0, "lines": 0, "curves": 0, "rectangles": 0, "closedPolygons": 0, "polylines": 0, "warnings": []}

        try:
            reader = pypdf.PdfReader(str(p))
            stats["pages"] = len(reader.pages)

            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1
                page_counter = 0
                contents = page.get_contents()
                if contents is None: continue

                operations = []
                if hasattr(contents, "operations") and contents.operations:
                    operations = contents.operations
                elif hasattr(contents, "get_data"):
                    operations = self._tokenize_content_stream(contents.get_data())

                stack: List[Dict[str, Any]] = []
                state = {"ctm": MatrixUtils.identity_matrix(), "stroke_width": 1.0, "stroke_color": None, "fill_color": None, "is_clipping": False}
                current_pts: List[Dict[str, float]] = []
                is_closed, has_curve = False, False

                def flush_path(source_op: str):
                    nonlocal current_pts, is_closed, has_curve, page_counter
                    if len(current_pts) < 2:
                        current_pts, is_closed, has_curve = [], False, False
                        return

                    page_counter += 1
                    bbox = BoundingBoxCalculator.calc_rich_bbox(current_pts)

                    if is_closed: prim_type, code = "CLOSED_POLYGON", "poly"; stats["closedPolygons"] += 1
                    elif has_curve: prim_type, code = "CURVE", "curve"; stats["curves"] += 1
                    elif len(current_pts) == 2: prim_type, code = "LINE", "line"; stats["lines"] += 1
                    else: prim_type, code = "POLYLINE", "pline"; stats["polylines"] += 1

                    stats["totalPrimitives"] += 1
                    primitives.append({
                        "id": f"p{page_num}_{code}_{page_counter:04d}",
                        "pageNumber": page_num,
                        "primitiveType": prim_type,
                        "points": current_pts,
                        "strokeWidth": state["stroke_width"],
                        "strokeColor": state["stroke_color"],
                        "fillColor": state["fill_color"],
                        "closed": is_closed,
                        "isClippingPath": state["is_clipping"],
                        "boundingBox": bbox,
                        "sourceOperator": source_op
                    })
                    current_pts, is_closed, has_curve = [], False, False

                for operands, operator in operations:
                    stats["totalOperators"] += 1
                    op = operator.decode("latin1") if isinstance(operator, bytes) else str(operator)

                    if op == "q": stack.append({"ctm": list(state["ctm"]), "stroke_width": state["stroke_width"], "stroke_color": state["stroke_color"], "fill_color": state["fill_color"], "is_clipping": state["is_clipping"]})
                    elif op == "Q":
                        if stack: state = stack.pop()
                    elif op == "cm" and len(operands) >= 6: state["ctm"] = MatrixUtils.multiply_matrices(state["ctm"], operands[:6])
                    elif op == "w" and len(operands) >= 1: state["stroke_width"] = float(operands[0])
                    elif op in ["RG", "rg"] and len(operands) >= 3:
                        hex_c = MatrixUtils.rgb_to_hex(operands[0], operands[1], operands[2])
                        if op == "RG": state["stroke_color"] = hex_c
                        else: state["fill_color"] = hex_c
                    elif op == "m" and len(operands) >= 2:
                        flush_path("m")
                        current_pts.append(MatrixUtils.transform_point(operands[0], operands[1], state["ctm"]))
                    elif op == "l" and len(operands) >= 2: current_pts.append(MatrixUtils.transform_point(operands[0], operands[1], state["ctm"]))
                    elif op == "c" and len(operands) >= 6:
                        has_curve = True
                        current_pts.append(MatrixUtils.transform_point(operands[4], operands[5], state["ctm"]))
                    elif op == "re" and len(operands) >= 4:
                        flush_path("re")
                        x, y, w, h = operands[0], operands[1], operands[2], operands[3]
                        p1 = MatrixUtils.transform_point(x, y, state["ctm"])
                        p2 = MatrixUtils.transform_point(x + w, y, state["ctm"])
                        p3 = MatrixUtils.transform_point(x + w, y + h, state["ctm"])
                        p4 = MatrixUtils.transform_point(x, y + h, state["ctm"])
                        current_pts = [p1, p2, p3, p4, p1]
                        is_closed = True
                        flush_path("re")
                    elif op == "h":
                        is_closed = True
                        if current_pts and current_pts[0] != current_pts[-1]: current_pts.append(current_pts[0])
                    elif op in ["S", "s", "f", "F", "b", "B", "n"]: flush_path(op)

            logger.info(f"PDFVectorPathExtractor completed: {len(primitives)} primitives extracted")
            return {"primitives": primitives, "extractionStatistics": stats}
        except Exception as e:
            logger.error(f"PDFVectorPathExtractor failed: {e}")
            raise RuntimeError(f"Failed to extract vector paths: {e}")

vector_path_extractor_instance = PDFVectorPathExtractor()
