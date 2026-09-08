# LandOS — Implementation Changelog

> **History of Completed Milestones & System Capability Releases**

---

## [v0.11.0] - 2026-08-03
### Added
- **TASK-051 Universal Layout Viewer**: Direct vector SVG layout map rendering in frontend (`LayoutMap.jsx` in `frontend/src/pages/Projects/ProjectWorkspace/tabs/LayoutMap.jsx`).
- **Backend Layout API Endpoints**:
  - `GET /api/v1/projects/{project_id}/layouts/{layout_id}/layout-svg` (Returns reconstituted `LAYOUT_SVG` artifact).
  - `GET /api/v1/projects/{project_id}/layouts/{layout_id}/layout-model` (Returns synthesized `UNIVERSAL_LAYOUT_MODEL` artifact).
- **Interactive Viewer Features**:
  - Direct `dangerouslySetInnerHTML` vector SVG rendering (Zero client-side geometry reconstruction).
  - Viewport Controls: Zoom In (+), Zoom Out (-), Fit to Screen reset, and drag-to-pan.
  - Interactive plot selection on `<polygon data-plot-id="...">` element click.
  - Floating Metadata Drawer displaying Plot Number, Area (SQ FT), Status badge, Road Access Name, Dimensions, Confidence Score, and estimated pricing.
- **10-Layout Visual Comparison Suite**:
  - Executed 10-layout blueprint comparison test suite (`validate_layout_viewer_comparison.py`).
  - Generated visual comparison matrix artifact (`layout_viewer_visual_comparison_report.md`).

---

## [v0.10.1] - 2026-08-03

### Added
- **Universal Layout Engine End-to-End Validation Suite**: End-to-end pipeline test runner (`validate_universal_layout_engine.py` in `backend/app/db/validate_universal_layout_engine.py`).
- **Validation Matrix Results**:
  - Processed 10 distinct layout categories (Vector PDF, Scanned PDF, PNG, JPEG, Mobile photo, Low resolution, Rotated layout, Large township, Small micro layout, Complex layout).
  - Achieved **100% pipeline completion rate** across all 14 stages (`VISION_PROCESSING_CONTEXT` ➜ `LAYOUT_SVG`).
  - **Zero pipeline crashes** or main thread deadlocks.
  - Achieved **94.0% average confidence score** and generated valid, renderable vector `LAYOUT_SVG` artifacts for every scenario.
- **Validation Report Artifact**: Consolidated validation report published to `universal_layout_engine_validation_report.md`.

---

## [v0.10.0] - 2026-08-03

### Added
- **TASK-050 Universal Layout Model & SVG Reconstitution Engine**: Digital layout model synthesis & vector SVG generation engine (`UniversalLayoutReconstructionEngine` singleton in `backend/app/engine/universal_layout_reconstruction_engine.py`).
- **Universal Layout Model (`UNIVERSAL_LAYOUT_MODEL`)**:
  - Unites boundary, road network, detected plot polygons, and text annotations into one structured JSON specification.
  - Plots contain `id`, `plotNumber`, `polygon`, `centroid`, `area`, `perimeter`, `roadAccess`, `roadId`, `roadName`, `dimensions`, `areaLabel`, `status`, and `confidence`.
  - Roads contain `roadId`, `roadName`, `roadWidth`, `centerline`, `polygon`, and `connections`.
- **Vector SVG Generation (`LAYOUT_SVG`)**:
  - Generates clean, layered vector SVG markup with stable element IDs.
  - Contains SVG layers for `layer-boundary`, `layer-roads`, `layer-plots`, and `layer-labels`.
  - Immediately renderable by frontend components without client-side geometric reconstruction.
- **PostgreSQL Artifact Persistence**: Stage 1.14 (`run_universal_layout_reconstruction_stage()`) saves `UNIVERSAL_LAYOUT_MODEL` and `LAYOUT_SVG` artifacts to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_universal_layout_reconstruction.py` covering model synthesis, vector SVG layer generation, plot/road preservation, and empty layout fallbacks (100% PASSED).

---

## [v0.9.9] - 2026-08-03

### Added
- **TASK-049 Label Association Engine**: Semantic label and spatial matching module (`LabelAssociationEngine` singleton in `backend/app/engine/label_association_engine.py`).
- **Spatial Label Association Strategy**:
  - Point-In-Polygon matching for text centers lying within plot polygon bounding boxes.
  - Nearest-Neighbor centroid fallback matching for nearby plot labels.
  - Road keyword matching ("ROAD", "WIDE", "FT") associating text with nearest road centerlines.
  - Boundary keyword matching ("NORTH", "SURVEY", "S.NO") associating global layout text with project boundary.
  - Zero text element loss guarantee: every OCR element is explicitly recorded as assigned or unassigned with confidence scores and distance metrics.
- **PostgreSQL Artifact Persistence**: Stage 1.13 (`run_label_association_stage()`) saves `LABELED_LAYOUT` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_label_association_engine.py` covering plot numbers, road widths, road names, boundary labels, nearest neighbor fallbacks, and empty layout handling (100% PASSED).

---

## [v0.9.8] - 2026-08-03

### Added
- **TASK-048 OCR Text Extraction Engine**: Text stream and blueprint OCR module (`OCRTextEngine` singleton in `backend/app/engine/ocr_text_engine.py`).
- **Text Element Processing**:
  - Extracts text streams directly from Vector PDFs using `pdfplumber`.
  - Performs structured OCR text extraction for Scanned PDFs, PNG, JPEG, and TIFF files.
  - Extracts plot numbers, road names, survey numbers, dimensions, and orientation labels.
  - Computes text element bounding boxes, center coordinates, dimensions, page numbers, and confidence scores.
- **PostgreSQL Artifact Persistence**: Stage 1.12 (`run_ocr_text_extraction_stage()`) saves `OCR_TEXT_ELEMENTS` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_ocr_text_engine.py` covering Vector PDFs, Raster PDFs, PNG, JPEG, rotated layouts, and empty image fallbacks (100% PASSED).

---

## [v0.9.7] - 2026-08-03

### Added
- **TASK-047 Plot Detection Engine**: Individual plot polygon extraction module (`PlotDetectionEngine` singleton in `backend/app/engine/plot_detection_engine.py`).
- **Plot Polygon Processing**:
  - Filters candidate plot polygons excluding road corridors and project boundary polygon.
  - Generates **stable deterministic UUIDs** (`uuid.uuid5`) based on spatial centroid and area.
  - Calculates plot area, perimeter, centroid coordinates, aspect ratio, and principal orientation.
  - Derives plot neighbor adjacency lists from relationship graph edges.
- **PostgreSQL Artifact Persistence**: Stage 1.11 (`run_plot_detection_stage()`) saves `DETECTED_PLOTS` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_plot_detection_engine.py` covering plot extraction, centroid/area calculations, stable rerun UUIDs, and empty layout fallbacks (100% PASSED).

---

## [v0.9.6] - 2026-08-03

### Added
- **TASK-046 Boundary Detection Engine**: Outer project perimeter extraction module (`BoundaryDetectionEngine` singleton in `backend/app/engine/boundary_detection_engine.py`).
- **Boundary Processing**:
  - Selects outermost project boundary polygon using maximum containment and area heuristics.
  - Perimeter gap repair logic ensuring explicitly closed polygon geometries.
  - Calculates total layout area, perimeter, bounding box, and principal orientation.
  - Validates spatial containment of interior road network.
- **PostgreSQL Artifact Persistence**: Stage 1.10 (`run_boundary_detection_stage()`) saves `PROJECT_BOUNDARY` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_boundary_detection_engine.py` covering boundary detection, gap repair, road containment, and empty layout fallbacks (100% PASSED).

---

## [v0.9.5] - 2026-08-03

### Added
- **TASK-045 Road Detection Engine**: Automated road corridor and network extraction module (`RoadDetectionEngine` singleton in `backend/app/engine/road_detection_engine.py`).
- **Road Network Processing**:
  - Filters road candidate primitives and long narrow corridors.
  - Extracts centerlines along horizontal and vertical primary axes.
  - Calculates road width, length, and bounding box geometry.
  - Constructs road connectivity graphs and identifies intersection nodes.
- **PostgreSQL Artifact Persistence**: Stage 1.9 (`run_road_detection_stage()`) saves `ROAD_NETWORK` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_road_detection_engine.py` covering corridor detection, centerline/width calculation, connectivity graphs, and empty layout fallbacks (100% PASSED).

---

## [v0.9.4] - 2026-08-03

### Added
- **TASK-044 Geometry Relationship Graph Engine**: Pairwise spatial topology analysis engine (`GeometryRelationshipGraphEngine` singleton in `backend/app/engine/geometry_relationship_graph.py`).
- **Spatial Relationship Computations**:
  - Bounding box intersection (`INTERSECTS`).
  - Containment hierarchy (`CONTAINS` / `INSIDE`).
  - Boundary proximity and touching edges (`TOUCHES` / `SHARED_EDGE`).
  - Proximity neighbor distance calculation (`NEIGHBOR`).
- **PostgreSQL Artifact Persistence**: Stage 1.8 (`run_geometry_relationship_graph_stage()`) saves `GEOMETRY_RELATIONSHIP_GRAPH` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_geometry_relationship_graph.py` covering containment, shared edges, neighbor adjacency, and empty input fallbacks (100% PASSED).

---

## [v0.9.3] - 2026-08-03

### Added
- **TASK-043 Universal Primitive Detection Engine**: Unified primitive classification module (`UniversalPrimitiveDetector` singleton in `backend/app/engine/universal_primitive_detector.py`).
- **Unified Geometric Primitive Format**: Standardizes `UniversalPrimitive` objects across both Vector PDF and Raster Vectorization pipelines (`id`, `primitiveType`, `vertices`, `boundingBox`, `perimeter`, `area`, `aspectRatio`, `isClosed`, `confidence`, `sourcePipeline`, `candidateType`).
- **Deterministic Heuristic Categorization**:
  - `BOUNDARY_CANDIDATE`: Large outer polygon enclosing layout area.
  - `ROAD_CANDIDATE`: Long narrow polygons / corridor corridors.
  - `PLOT_CANDIDATE`: Medium closed polygons.
  - `TEXT_REGION`: Small bounding rectangles.
  - `OPEN_REGION`: Open polylines and line segments.
  - `UNKNOWN`: Unclassified geometry.
- **PostgreSQL Artifact Persistence**: Stage 1.7 (`run_universal_primitive_detection_stage()`) saves `UNIVERSAL_PRIMITIVES` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_universal_primitive_detector.py` covering Vector, Raster, Mixed, and Empty inputs (100% PASSED).

---

## [v0.9.2] - 2026-08-03

### Added
- **TASK-042 Raster Vectorization Engine**: OpenCV contour and vector path extraction pipeline (`RasterVectorizer` singleton in `backend/app/engine/raster_vectorizer.py`).
- **Geometric Primitive Extraction**:
  - OpenCV Canny edge detection on binarized raster images.
  - Contour approximation via `cv2.approxPolyDP` separating closed polygons from open polylines.
  - Straight line segment extraction using Probabilistic Hough Transform (`cv2.HoughLinesP`).
  - Vertices, bounding box, perimeter, area, and confidence scoring calculation per primitive.
- **PostgreSQL Artifact Persistence**: Stage 1.6 (`run_raster_vectorization_stage()`) saves `RASTER_VECTOR_PRIMITIVES` artifact to `layout_processing_artifacts`.
- **Integration Test Suite**: Automated test suite `test_raster_vectorizer.py` covering PNG, JPG, TIFF, Scanned PDF, and empty image fallbacks (100% PASSED).

---

## [v0.9.1] - 2026-08-03

### Added
- **TASK-041 Image Preprocessing Engine**: OpenCV-powered image normalization pipeline (`ImagePreprocessor` singleton in `backend/app/engine/image_preprocessor.py`).
- **Processing Capabilities**:
  - Grayscale conversion for multi-channel RGB/RGBA images.
  - Rotation & deskew correction via minimum area rectangle bounding analysis.
  - Background noise reduction via Gaussian blurring.
  - Contrast enhancement using Contrast Limited Adaptive Histogram Equalization (CLAHE).
  - Binarization using Adaptive Gaussian Thresholding.
- **PostgreSQL Artifact Persistence**: Stage 1.5 (`run_image_preprocessing_stage()`) saves `PREPROCESSED_IMAGE` artifact (metadata & PNG Base64 string) to `layout_processing_artifacts`.
- **Supported Intake Formats**: Vector PDF, Scanned PDF, PNG, JPG, JPEG, TIFF.
- **Integration Test Suite**: Automated test suite `test_image_preprocessor.py` (100% PASSED).

---

## [v0.9.0] - 2026-08-03

### Added
- **EPIC-AI-01 Vision Engine Foundation**: Unified layout file intake architecture (`VisionEngine` singleton in `backend/app/engine/vision_engine.py`).
- **Multi-Format Processing Strategy Routing**: Automatically detects upload type, mime type, page count, file size, and vector vs. raster properties.
- **Routing Strategies**:
  - `VECTOR_PDF_PIPELINE` for Digital PDF files with vector path streams.
  - `RASTER_PDF_PIPELINE` for Scanned PDF files with image streams.
  - `IMAGE_RASTER_PIPELINE` for PNG, JPG, JPEG, TIFF raster files.
  - `UNSUPPORTED_FORMAT` rejection for DWG/DXF CAD files and unknown binaries.
- **PostgreSQL Artifact Persistence**: Stage 1 (`run_inspection_stage()`) saves `VISION_PROCESSING_CONTEXT` artifact to `layout_processing_artifacts` table.
- **Integration Test Suite**: Automated test suite `test_vision_engine.py` (100% PASSED).

---

## [v0.8.0] - 2026-08-03

### Added
- **TASK-028 Plot Status Management & Reservation**: `PATCH /api/v1/projects/{project_id}/plots/{plot_id}` endpoint for managing plot inventory lifecycle.
- **Supported Plot Statuses**: `AVAILABLE`, `RESERVED`, `SOLD`, `BLOCKED`.
- **Plot Attribute Updates**: Updates `status`, `notes`, `customerId`, `reservationDate`, and `basePrice`.
- **Geometry & Area Preservation**: Pipeline-generated Shoelace area, facing direction, centroids, and polygon GeoJSON are 100% preserved.
- **Validation & Errors**: Rejects invalid status values with HTTP 400 Bad Request and missing plot IDs with HTTP 404 Not Found.
- **Client Service**: Added `updatePlotStatus()` to `projectService.js`.
- Automated integration test suite `test_plot_status_management.py`.
- **EPIC-03 VICTORY ACHIEVED**: Plot persistence and interactive inventory management complete.

---

## [v0.7.0] - 2026-08-03
### Added
- **P2.6.3 Geometry Normalizer**: 6 sub-components (`CoordinateNormalizer`, `DuplicateRemover`, `SegmentMerger`, `PolygonRepair`, `BoundingBoxCalculator`, `StatisticsBuilder`).
- **P2.6.2 Vector Path Extraction Engine**: Full PDF stream parsing (`m`, `l`, `c`, `re`, `h`, `S`, `f`, `q`, `Q`, `cm`, `W` clipping paths).
- Integration test suites `test_vector_extractor.py` and `test_geometry_normalizer.py`.

---

## [v0.2.0] - 2026-08-03
### Added
- **P2.6.1 Digital PDF Reader**: `pypdf` stream inspector (MediaBox, fonts, text preview).
- **P2.5 Canonical Layout Model (CLM / Layout IR)**: Pydantic specification for universal spatial IR.
- **P2.4 File Inspector**: Format classifier (PDF/PNG/JPG/TIFF/DWG) and parser recommendation engine.

---

## [v0.1.0] - 2026-08-03
### Added
- **Epic 1 Project & Storage Foundation**:
  - 5-Step Project Creation Wizard in React frontend.
  - 6-Table PostgreSQL Schema (`projects`, `locations`, `surveys`, `commercials`, `legal`, `layout_sources`).
  - Binary disk storage service (`uploads/projects/{id}/layouts/`) with 50MB max limit.
  - Processing job state machine (`layout_processing_jobs`) and artifact manager (`layout_processing_artifacts`).

---
*Last Updated: 2026-08-03 | LandOS Release History*

## [v0.1.0] - 2026-08-03
### Added
- **Epic 1 Project & Storage Foundation**:
  - 5-Step Project Creation Wizard in React frontend.
  - 6-Table PostgreSQL Schema (`projects`, `locations`, `surveys`, `commercials`, `legal`, `layout_sources`).
  - Binary disk storage service (`uploads/projects/{id}/layouts/`) with 50MB max limit.
  - Processing job state machine (`layout_processing_jobs`) and artifact manager (`layout_processing_artifacts`).

---
*Last Updated: 2026-08-03 | LandOS Release History*
