# LandOS Learning Guide: Layout Intelligence Engine Modular Architecture (Phase P2.4)

**Learning Objective:** Understand how LandOS structures a production-grade, modular Layout Intelligence Platform. Learn why processing artifacts are cached in PostgreSQL, how individual engine components operate without monolithic AI dependencies, and how the sub-phase roadmap progresses from digital PDF vector parsing to spatial GeoJSON map rendering.

---

## 1. The Modular Layout Intelligence Engine Blueprint

```
                      ┌──────────────────────────────────────────────┐
                      │       Layout Intelligence Engine Core        │
                      └──────────────────────┬───────────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
  ┌────────────────────┐          ┌────────────────────┐          ┌────────────────────┐
  │   File Inspector   │          │  Artifact Manager  │          │Pipeline Controller │
  │(Format, Vector/    │          │(Stores & Retrieves │          │(Orchestrates       │
  │ Scanned, DPI, Pages│          │Pipeline Intermediate│         │Pipeline Stages)    │
  └──────────┬─────────┘          │     Outputs)       │          └────────────────────┘
             │                    └──────────▲─────────┘
             ▼                               │
  ┌────────────────────┐                     │
  │  Parser Engines    │─────────────────────┘
  │ ├── Digital PDF    │ (Persists Stage Artifacts)
  │ ├── OpenCV Raster  │
  │ └── CAD/DWG Parser │
  └──────────┬─────────┘
             │
             ▼
  ┌────────────────────┐
  │ Geometry & GeoJSON │
  └────────────────────┘
```

---

## 2. The 13 Engine Component Responsibilities

1. **File Inspector (`inspector.py`):** Inspects binary stream to classify format (`PDF`, `PNG`, `JPG`, `TIFF`, `DWG`), vector paths vs raster image, DPI, page count, and recommends downstream parser engine.
2. **Artifact Manager (`artifact_manager.py`):** Saves and retrieves stage artifacts (`INSPECTION_METADATA`, `RAW_PRIMITIVES`, `OCR_TEXT_MAP`, `DETECTED_POLYGONS`, `NORMALIZED_GEOJSON`) to/from PostgreSQL `layout_processing_artifacts`.
3. **Pipeline Controller (`pipeline.py`):** Manages processing job state machine transitions (`QUEUED` -> `PROCESSING` -> `COMPLETED`/`FAILED`).
4. **Digital PDF Parser (Phase P2.5):** Reads vector paths (`.pdf` Bezier curves, lines, text streams) directly without rasterization.
5. **Scanned Image Parser (Phase P2.6):** OpenCV computer vision engine for noise reduction, binarization, edge detection, and polygon contour extraction.
6. **OCR Layer (Phase P2.7):** Text recognition engine mapping plot labels ("Plot 101", "G-12") to physical bounding boxes.
7. **Geometry Reconstruction Engine (Phase P2.8):** Binds plot numbers to polygon boundaries, calculates plot areas (`sq.ft`), and cleans up overlapping geometries.
8. **Plot Detection Engine:** Identifies closed saleable plot parcels vs road corridors.
9. **Road Detection Engine:** Detects access roads, avenues, and corner radii.
10. **Coordinate & Normalization Engine:** Converts pixel/CAD coordinates into normalized 0.0-1.0 coordinate space or EPSG:4326 lat/long coordinates.
11. **Topology Validation Engine:** Verifies polygon closure, non-overlapping constraints, and area sanity.
12. **GeoJSON Generator (Phase P2.9):** Serializes spatial features into standard GeoJSON FeatureCollections (`Boundary`, `Plots`, `Roads`, `Amenities`).
13. **Rendering API:** Serves vector map layers to the frontend React Leaflet/Canvas viewer.

---

## 3. Why Processing Artifacts are Critical (`layout_processing_artifacts`)

Instead of running an expensive 30-second pipeline from scratch every time a developer debugs or re-renders a view:
- **`INSPECTION_METADATA`**: Caches file inspection metadata (pages, vector status, recommended parser).
- **`RAW_PRIMITIVES`**: Caches extracted line segments and raw text elements.
- **`OCR_TEXT_MAP`**: Caches recognized text labels and bounding boxes.
- **`DETECTED_POLYGONS`**: Caches polygon contours.
- **`NORMALIZED_GEOJSON`**: Caches final spatial FeatureCollections.

If Stage 4 (Geometry) needs tuning, it reads `RAW_PRIMITIVES` directly from PostgreSQL without re-parsing the original PDF!

---

## 4. Frozen Sub-Phase Roadmap (P2.4 through P5)

| Sub-Phase | Core Scope & Technology | Goal |
|---|---|---|
| **Phase P2.4** | Layout Intelligence Engine Architecture & Artifacts Table | Modular engine framework, FileInspector, PostgreSQL `layout_processing_artifacts` table |
| **Phase P2.5** | Digital Vector PDF Parser | Extract vector paths & text streams from vector layout PDFs |
| **Phase P2.6** | Scanned Image & Raster Parser (OpenCV) | Contour detection, edge extraction, binarization on scanned image layouts |
| **Phase P2.7** | OCR Layer | Recognize plot numbers & labels, bind to bounding boxes |
| **Phase P2.8** | Geometry Reconstruction Engine | Pair OCR text labels with closed polygon boundaries, area calculations |
| **Phase P2.9** | GeoJSON Generator & Plot Database Model | Write normalized spatial features & create PostgreSQL `plots` schema |
| **Phase P3** | Interactive 2D Layout Map | Frontend React Leaflet/Canvas interactive map viewer |
| **Phase P4** | Admin Interactive Layout Editor | Visual polygon correction drawer for layout admins |
| **Phase P5** | GIS, Satellite View & Google Maps Alignment | Satellite tiles overlay, lat/long geo-referencing, customer/broker portal views |
