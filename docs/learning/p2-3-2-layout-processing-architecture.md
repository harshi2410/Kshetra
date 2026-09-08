# LandOS Learning Guide: Layout Processing Architecture & Geometry Model (Phase P2.3.2)

**Learning Objective:** Understand why file upload and processing are decoupled, how PostgreSQL tracks background processing job state transitions, the 9 processing pipeline stages, formal geometry entity classification, PostGIS vs GeoJSON strategy, and frontend state machine transitions.

---

## 1. Why Upload and Processing are Decoupled

When an administrator uploads a 40MB PDF master layout blueprint or high-res CAD drawing:
- **Synchronous Upload (`POST /projects/{id}/layouts`):** Fast operations only — file type validation, writing binary stream to disk, inserting database records in PostgreSQL (`layout_sources`, `layout_processing_jobs` with status `QUEUED`), and returning HTTP 201 immediately. Response time is < 500ms.
- **Asynchronous Processing (Worker):** Heavy operations — rendering PDF pages to high-res images, running vector edge detection, OCR plot number extraction, geometry normalization, and spatial boundary computation. These steps take 5 to 45 seconds and must run asynchronously in background workers without timing out the user's browser HTTP request.

---

## 2. Processing Job Lifecycle & State Machine

```
         ┌───────────┐
         │  QUEUED   │ (Job created upon file upload, stage: INSPECTION)
         └─────┬─────┘
               │
               ▼
        ┌─────────────┐
        │ PROCESSING  │ (Worker picks up job, progress 1% -> 99%)
        └──────┬──────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌────────────┐
│  COMPLETED  │ │   FAILED   │ (Error message recorded, status set to FAILED)
└─────────────┘ └────────────┘
```

### PostgreSQL Table: `layout_processing_jobs`
- `id`: UUID Primary Key
- `project_id`: Foreign Key -> `projects.id`
- `layout_source_id`: Foreign Key -> `layout_sources.id`
- `status`: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED` | `CANCELLED`
- `stage`: `INSPECTION` | `EXTRACTION` | `GEOMETRY_NORMALIZATION` | `PERSISTENCE`
- `progress_percentage`: Integer 0 to 100
- `error_message`: Text detail on failure
- `result_summary`: JSON summary string (e.g. `{"plotsExtracted": 42, "roadsDetected": 3}`)
- `created_at`, `started_at`, `completed_at`: Timestamps

---

## 3. The 9 Layout Intelligence Processing Pipeline Stages

```
STAGE 1: File Inspection
   └── Format validation, image resolution check, color mode detection.

STAGE 2: PDF / Image / CAD Extraction
   └── Rasterizes PDF to 300 DPI PNG, or converts DWG/DXF vectors to canonical SVG layers.

STAGE 3: OCR & Text Extraction
   └── Detects plot labels ("Plot 101", "G-12"), road names ("12m Wide Road"), and survey numbers.

STAGE 4: Geometry Edge & Contour Extraction
   └── Extracts polygon closed paths, line segments, and bounding boxes.

STAGE 5: Feature Classification
   └── Classifies shapes into PLOT, ROAD, COMMON_AREA, AMENITY, or PROJECT_BOUNDARY.

STAGE 6: Plot Detection & Association
   └── Binds OCR text labels to their enclosing polygon boundary geometries.

STAGE 7: Geometry Normalization
   └── Converts pixel/raster coordinates to normalized 0.0-1.0 local coordinates or GeoJSON coordinates.

STAGE 8: Spatial & Legal Rule Validation
   └── Checks plot area calculations (`sq.ft`), duplicate plot numbers, and boundary overlaps.

STAGE 9: Persistence
   └── Writes validated plot entities to PostgreSQL `plots` and updates processing status to COMPLETED.
```

---

## 4. Geometry Entity Classification Model

| Spatial Entity | DB Record vs Derived Artifact | Description |
|---|---|---|
| **`PROJECT_BOUNDARY`** | **DB Record & GeoJSON** | Outer perimeter polygon defining the total survey land area. |
| **`PLOT`** | **DB Record (`plots` table)** | Saleable land parcel with plot number, area, dimensions, facing, status, price. |
| **`ROAD`** | **GeoJSON Feature Layer** | Internal access roads, wide avenues, and pathways. |
| **`COMMON_AREA`** | **GeoJSON Feature Layer** | Open spaces, parks, green belts, utility zones. |
| **`AMENITY`** | **GeoJSON Feature Layer** | Clubhouses, swimming pools, temples, entrance gates. |
| **`LABEL`** | **Derived Overlay** | Text markers and orientation compass points. |

---

## 5. PostGIS vs GeoJSON in PostgreSQL Strategy

### Why not install PostGIS immediately?
1. **Initial Simplicity:** Standard PostgreSQL stores GeoJSON spatial features in standard `JSONB` columns (`geometry JSONB` or text). This allows standard SQL backups (`pg_dump`) and fast JSON serialization without native C extension dependencies.
2. **When LandOS Will Need PostGIS:**
   - When we execute spatial queries like: *"Find all plots within 50 meters of the main entrance road"* (`ST_DWithin`).
   - When calculating exact GIS polygon intersections (`ST_Intersects`) against government survey boundary layers.
3. **Migration Plan:** Store geometries in standard GeoJSON initially; convert to PostGIS `GEOMETRY(Polygon, 4326)` columns seamlessly when GIS spatial queries are introduced.

---

## 6. Frontend State Machine Transition Strategy

```
[State 1: Mock Grid]
   └── Default view for legacy projects without attached blueprints.
        ↓
[State 2: Processing Pending / Queued]
   └── Blueprint attached; renders banner: "Blueprint Queued for Processing (Status: QUEUED)".
        ↓
[State 3: Processing Progress]
   └── Polls GET /projects/{id}/layouts/{id}/processing-status every 3 seconds; displays progress bar (e.g., "35% - Extracting plot boundaries").
        ↓
[State 4: Layout Generated]
   └── Job completed; renders interactive 2D vector layout map (Space.land style).
```
