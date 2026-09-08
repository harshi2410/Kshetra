# LandOS Learning Guide: Canonical Layout Model (CLM / Layout IR) Design (Phase P2.5)

**Learning Objective:** Understand why LandOS uses a Canonical Layout Model (CLM) as an Intermediate Representation (IR), how the Compiler Analogy applies to spatial real estate software, and how CLM decouples input file parsers (PDF, OpenCV, CAD) from spatial understanding algorithms and GeoJSON generators.

---

## 1. The Compiler Analogy: Source Code → AST → Machine Code vs Blueprint → CLM → GeoJSON

```
C COMPILER ARCHITECTURE:
  C Source File (.c) ──► Lexer & Parser ──► Abstract Syntax Tree (AST) ──► Optimizer ──► Machine Code (.exe)

LANDOS ENGINE ARCHITECTURE:
  Blueprint File (.pdf/.png/.dwg) ──► Parser Engine ──► Canonical Layout Model (CLM) ──► Geometry Analyzer ──► GeoJSON Map
```

### Why this is the single most important architectural decision:
- If you build a direct parser from PDF to GeoJSON (`PDF -> GeoJSON`), when you add PNG support, you have to write `PNG -> GeoJSON`. When you add DWG support, you have to write `DWG -> GeoJSON`. With $N$ file formats and $M$ output formats, you end up with $N \times M$ tightly coupled parsers.
- By introducing the **Canonical Layout Model (CLM)** as an Intermediate Representation, every parser outputs CLM (`PDF -> CLM`, `PNG -> CLM`, `DWG -> CLM`). Every downstream engine operates strictly on CLM (`CLM -> Geometry Analyzer -> GeoJSON`). Adding a new format (e.g. AutoCAD DXF) requires writing **only 1 parser** that outputs CLM!

---

## 2. Canonical Layout Model (CLM) JSON Schema Specification

The root CLM document structure (`backend/app/schemas/layout_ir.py`):

```json
{
  "version": "1.0.0",
  "sourceMetadata": {
    "fileName": "greenfield_master_layout.pdf",
    "format": "PDF",
    "fileSizeBytes": 3450000,
    "pagesCount": 1,
    "hasVectorStream": true,
    "isScannedImage": false,
    "recommendedParser": "DIGITAL_PDF_VECTOR_PARSER"
  },
  "boundaries": [
    {
      "id": "bound-001",
      "vertices": [{"x": 0.05, "y": 0.05}, {"x": 0.95, "y": 0.05}, {"x": 0.95, "y": 0.95}, {"x": 0.05, "y": 0.95}],
      "calculatedAreaSqFt": 1110780.0,
      "entityType": "BOUNDARY"
    }
  ],
  "roads": [
    {
      "id": "road-001",
      "polyline": [{"x": 0.05, "y": 0.50}, {"x": 0.95, "y": 0.50}],
      "widthMeters": 12.0,
      "roadName": "12m Main Entrance Avenue"
    }
  ],
  "closedPolygons": [],
  "paths": [],
  "labels": [
    {
      "id": "lbl-001",
      "text": "Plot 101",
      "bbox": {"minX": 0.10, "minY": 0.10, "maxX": 0.18, "maxY": 0.14},
      "rotationAngle": 0.0,
      "confidence": 0.98,
      "category": "PLOT_NUMBER"
    }
  ],
  "symbols": [
    {
      "id": "sym-001",
      "point": {"x": 0.90, "y": 0.10},
      "pointType": "COMPASS_NORTH"
    }
  ],
  "dimensions": [],
  "referencePoints": []
}
```

---

## 3. The 4 Platform Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. INPUT LAYER: File Inspector, Multipart Upload, Job Queue                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. EXTRACTION LAYER: Parsers (Digital PDF, OpenCV, CAD, OCR)                 │
│    All Parsers output or update a single Canonical Layout Model (CLM)       │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. UNDERSTANDING LAYER: Spatial Geometry Analyzer, Plot & Road Detector     │
│    Reads CLM to classify shapes into saleable Plots and Road corridors      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. OUTPUT LAYER: GeoJSON Generator, PostgreSQL Persistence, Map Viewer API │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Revised Sub-Phase Roadmap

```
Phase P2.4: Layout Intelligence Engine Architecture & Artifacts Table (DONE)
      ↓
Phase P2.5: Canonical Layout Model (CLM / Layout IR) (DONE)
      ↓
Phase P2.6: Digital Vector PDF Parser (outputs CLM)
      ↓
Phase P2.7: Raster / OpenCV Parser (outputs CLM)
      ↓
Phase P2.8: OCR Layer (enriching CLM text labels)
      ↓
Phase P2.9: Geometry Analyzer & Plot Detector (reads CLM)
      ↓
Phase P3.0: GeoJSON Generator
      ↓
Phase P3.1: Plots Table & Database Model
      ↓
Phase P3.2: Interactive 2D Layout Map
      ↓
Phase P4.0: Admin Layout Editor
      ↓
Phase P5.0: GIS + Satellite + Google Maps Alignment
```
