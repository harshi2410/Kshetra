# LandOS — System Architecture & Technical Specification

> **Technical Architecture & Data Model Reference**  
> *Contains technical component diagrams, 14 database schemas, 11-stage engine pipeline, and API contract specifications.*

---

## 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          React Frontend (SPA)                          │
│        (Leaflet / Canvas / SVG Interactive Map, Workspace Tabs)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST API (FastAPI)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            API & Service Layer                         │
│   (Project Service, Layout Service, CRM Service, Finance Service)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Layout Intelligence Engine                      │
│                                                                        │
│  Inspector ──► PDF/Raster Reader ──► Vector Extractor ──► Text/OCR    │
│                                                                  │     │
│  GeoJSON Gen ◄── Spatial Analyzer ◄── CLM Builder ◄── Normalizer │     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database & Storage                    │
│   (Projects, Layouts, Jobs, Artifacts, Plots, Roads, Customers, etc.)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PostgreSQL Schema Specification (14 Tables)

### Active Tables (8 Tables)
1. `projects`: Primary project master record.
2. `project_locations`: State, District, Taluka, Village, Pincode.
3. `project_surveys`: Array of survey numbers.
4. `project_commercials`: Gross area, unit, pricing, development dates.
5. `project_legal`: Classification (RERA, NA, Layout Type).
6. `layout_sources`: File upload records (`uploads/projects/{id}/layouts/`).
7. `layout_processing_jobs`: Active pipeline job state (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).
8. `layout_processing_artifacts`: Stage outputs (`INSPECTION_METADATA`, `RAW_VECTOR_PRIMITIVES`, `NORMALIZED_VECTOR_PRIMITIVES`, etc.).

### Planned Spatial & Business Tables (6 Tables)
- `plots`: `id`, `project_id`, `plot_number`, `polygon_geojson`, `area_sqft`, `dimensions`, `facing`, `road_connection`, `status` (`AVAILABLE`, `RESERVED`, `SOLD`, `BLOCKED`), `price`, `customer_id`, `broker_id`.
- `roads`: `id`, `project_id`, `road_name`, `geometry_geojson`, `width_meters`, `road_type`.
- `boundaries`: `id`, `project_id`, `polygon_geojson`, `area_sqft`, `boundary_type`.
- `amenities`: `id`, `project_id`, `name`, `amenity_type`, `polygon_geojson`, `area_sqft`.
- `customers`: `id`, `name`, `phone`, `email`, `city`, `address`, `id_proof_type`, `id_proof_number`.
- `brokers`: `id`, `name`, `phone`, `email`, `rera_id`, `commission_rate`, `status`.
- `bookings`: `id`, `project_id`, `plot_id`, `customer_id`, `broker_id`, `booking_date`, `total_amount`, `payment_plan`, `status`.

---

## 3. 11-Stage Engine Pipeline Architecture

```text
Stage 0:  Upload & Job Creation                     0%    AUTO
Stage 1:  File Inspection + CLM Init               25%    AUTO    ✅ COMPLETE
Stage 2:  PDF Reader (stream metadata)             30%    AUTO    ✅ COMPLETE
Stage 3:  Vector Path Extraction                   40%    AUTO    ✅ COMPLETE
Stage 4:  Geometry Normalization                   55%    AUTO    ✅ COMPLETE
Stage 5:  Text Extraction & Label Binding          65%    AUTO    ⬜ SPRINT P2.6.4
Stage 6:  CLM Primitive Builder (classification)   75%    AUTO    ⬜ SPRINT P2.6.4
Stage 7:  Spatial Analysis & Plot Detection        85%    AUTO    ⬜ P2.7
Stage 8:  GeoJSON Generation                       90%    AUTO    ⬜ P2.9
Stage 9:  Spatial Entity Persistence               95%    AUTO    ⬜ P3.0
Stage 10: Completion                              100%    AUTO    ⬜ P3.0
```

---
*Last Updated: 2026-08-03 | LandOS Technical Architecture*
