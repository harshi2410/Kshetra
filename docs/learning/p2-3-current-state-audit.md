# LandOS — Phase P2.3.0 Current State Audit

**Audit Status:** Complete Infrastructure & Gap Analysis (Read-Only Audit)  
**Target Module:** Layout Intelligence Pipeline Preparation  
**Rule Compliance:** Zero files modified, zero database changes, zero dependencies installed.  

---

## 1. Project Structure Audit

Below is the exact file tree of the relevant components across the Project module, Workspace, API, Services, Models, Schemas, and Database:

```
LandOS/
├── docs/
│   ├── database/
│   │   ├── landos-database-v1-design.md     # Frozen Database Schema v1 Design
│   │   └── project-schema.md                 # Project Schema Document
│   └── learning/
│       ├── create-project-backend.md         # Request Lifecycle Learning Document
│       └── p2-3-current-state-audit.md       # (THIS DOCUMENT) P2.3.0 Audit Report
│
├── frontend/src/
│   ├── routes/
│   │   └── index.jsx                         # React Router (/projects, /projects/new, /projects/:projectId/*)
│   ├── layouts/
│   │   └── ContentLayout.jsx                 # App Shell & Contextual Create Project Sidebar
│   ├── services/
│   │   ├── projectService.js                 # HTTP fetch client for FastAPI /api/v1/projects
│   │   └── plotService.js                    # Mock plot/customer/broker local storage service
│   ├── pages/Projects/
│   │   ├── ProjectsList.jsx                  # Main projects table portfolio list
│   │   ├── CreateProject/
│   │   │   └── index.jsx                     # 5-Step Admin Wizard (Identity, Location, Land, Blueprint, Review)
│   │   └── ProjectWorkspace/
│   │       ├── index.jsx                     # Master workspace shell & tabs controller
│   │       ├── components/
│   │       │   └── PlotDrawer.jsx            # Interactive Plot Edit Drawer (with on-the-fly Customer/Broker creation)
│   │       └── tabs/
│   │           ├── Overview.jsx              # Project Overview tab with pending layout banners
│   │           ├── LayoutMap.jsx             # Grid-based plot layout view & pending blueprint empty state
│   │           ├── PlotsTab.jsx              # Tabulated plots spreadsheet view
│   │           ├── ProjectAnalytics.jsx      # Commercial analytics summary
│   │           ├── ProjectCustomers.jsx      # Customer directory tab
│   │           ├── ProjectBrokers.jsx        # Broker directory tab
│   │           └── ProjectSettings.jsx       # Project configuration settings tab
│
└── backend/
    ├── .env                                  # Database URL & server environment variables
    ├── main.py                               # Standalone entry script (legacy stub)
    ├── alembic.ini                           # Alembic configuration
    ├── alembic/
    │   ├── env.py                            # Alembic environment runner
    │   └── versions/
    │       └── a407087c09ab_create_project_schema_v1.py # Stamped DB migration script
    └── app/
        ├── main.py                           # FastAPI application entrypoint (CORS, router mounting)
        ├── core/
        │   └── config.py                     # Pydantic BaseSettings config
        ├── db/
        │   ├── base.py                       # SQLAlchemy Declarative Base
        │   ├── session.py                    # SQLAlchemy Engine & SessionLocal factory
        │   ├── init_db.py                    # Table creation script
        │   └── check_tables.py               # Table audit script
        ├── models/
        │   ├── __init__.py
        │   └── project.py                    # SQLAlchemy ORM models (Project, Location, Survey, Commercial, Legal, LayoutSource)
        ├── schemas/
        │   ├── __init__.py
        │   └── project.py                    # Pydantic DTO validation schemas (ProjectCreate, ProjectResponse)
        ├── services/
        │   └── project_service.py            # Transactional business logic & PostgreSQL CRUD handlers
        └── api/v1/
            ├── api.py                        # Router aggregator
            └── endpoints/
                └── projects.py               # REST API endpoints (POST /projects, GET /projects, GET /projects/{id})
```

---

## 2. Existing Project Creation Flow Trace

```
Admin Clicks "Create Project"
        │
        ▼
[Component] frontend/src/pages/Projects/CreateProject/index.jsx
  State: form = { name, developer, type, landClassification, state, district, taluka, cityVillage, pincode, surveyNumbers[], grossArea, areaUnit, baseRatePerSqFt, priceMin, priceMax, startDate, expectedCompletion, knownScale, scaleRatio }
  State: layoutFile = File object attached during Step 4
        │
        ▼
[Frontend Service] frontend/src/services/projectService.js
  Function: createProject(projectData)
  Action: Constructs JSON payload and issues HTTP fetch POST request
        │
        ▼
[HTTP Request] POST http://localhost:8000/api/v1/projects
  Headers: Content-Type: application/json
        │
        ▼
[FastAPI Endpoint] backend/app/api/v1/endpoints/projects.py
  Function: create_project(project_in: ProjectCreate, db: Session = Depends(get_db))
        │
        ▼
[Pydantic Validation Schema] backend/app/schemas/project.py
  Class: ProjectCreate
  Validation: Enforces string non-emptiness, pincode format (6 digits), positive grossArea, enums, surveyNumbers array
        │
        ▼
[Service Layer] backend/app/services/project_service.py
  Function: project_service_instance.create_project(db, data)
  Action: Executes an ATOMIC PostgreSQL transaction inserting across 6 ORM models
        │
        ▼
[SQLAlchemy ORM Models] backend/app/models/project.py
  Models: Project, ProjectLocation, ProjectSurvey, ProjectCommercial, ProjectLegal, LayoutSource
        │
        ▼
[PostgreSQL Database] PostgreSQL 18 (landos_db on 127.0.0.1:5432)
  Tables: projects, project_locations, project_surveys, project_commercials, project_legal, layout_sources
        │
        ▼
[HTTP Response] 201 Created
  Returns JSON Project DTO (id, name, status, locationDetails, landDetails, layoutSource)
        │
        ▼
[Frontend Navigation] React Router (navigate(`/projects/${newProject.id}`))
  Route: /projects/:projectId/overview -> Renders ProjectWorkspace!
```

---

## 3. `LayoutSource` Entity Audit

### Model Specification (`backend/app/models/project.py`):
```python
class LayoutSource(Base):
    __tablename__ = 'layout_sources'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    scale_ratio = Column(String(50), default='Not specified')
    upload_status = Column(String(50), nullable=False, default='UPLOADED')
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="layout_sources")
```

### Table Properties:
- **Primary Key:** `id` (VARCHAR(36) UUID string)
- **Foreign Keys:** `project_id` -> `projects.id` (`ON DELETE CASCADE`)
- **Relationships:** Belongs to `Project` (`back_populates="layout_sources"`)
- **Current Purpose:** Stores metadata about the master layout blueprint file attached during project creation.

### Critical Audit Answer:
> **Does the current implementation store the uploaded binary file?**  
> **NO.** The current implementation **ONLY stores metadata** about the layout file (file name, size in bytes, MIME type string, scale ratio). It does **NOT** upload, stream, or store the actual binary file (`.pdf`, `.png`, `.dwg`) onto the backend disk filesystem or S3 storage.

---

## 4. Project Workspace Audit

- **Route:** `/projects/:projectId/*` (handled in `frontend/src/routes/index.jsx`)
- **Master Shell Component:** `frontend/src/pages/Projects/ProjectWorkspace/index.jsx`
- **Active Sub-routes / Tabs:**
  1. `Overview` (`tabs/Overview.jsx`): Displays project header stats, location details, land metrics, and pending layout banners.
  2. `Layout Map` (`tabs/LayoutMap.jsx`): Displays grid-based plot cells or pending layout processing banner.
  3. `Plots` (`tabs/PlotsTab.jsx` & `PlotsTable.jsx`): Tabulated spreadsheet of plots.
  4. `Analytics` (`tabs/ProjectAnalytics.jsx`): Commercial revenue charts and sales progress.
  5. `Customers` (`tabs/ProjectCustomers.jsx`): Customer directory.
  6. `Brokers` (`tabs/ProjectBrokers.jsx`): Broker directory.
  7. `Settings` (`tabs/ProjectSettings.jsx`): Project configuration form.
- **Existing Layout Map Audit:**
  - **Does a real Layout Map exist?** **NO.**
  - `LayoutMap.jsx` currently renders a mock CSS grid based on static plot numbers from `plots.json`.
  - When a newly created project has 0 plots, it renders an empty state banner: *"Master Layout Blueprint Attached — Processing Pending. Automatic vector plot boundary extraction will be performed in a future release."*

---

## 5. Frontend Layout Upload Search & Audit

| Search Term | Repository Results & Current Reality |
|---|---|
| `upload` / `File` | Used in `CreateProject/index.jsx` (Step 4) for drag-and-drop file selection. Reads `file.name`, `file.size`, `file.type`. **Does NOT send FormData or binary payload.** |
| `FileReader` | **0 occurrences.** File content is never read into memory on the client. |
| `FormData` | **0 occurrences in API calls.** Data is serialized as JSON string. |
| `blueprint` / `layout` | Used extensively in text labels, UI headings, and metadata fields. |
| `PDF`, `PNG`, `JPG` | Allowed file extension validation checks in Step 4. |
| `DXF`, `DWG` | Listed as text options, no parser library installed. |
| `GeoJSON` | Documented in database design docs (`docs/database/landos-database-v1-design.md`). **0 code usage.** |
| `map`, `Leaflet`, `SVG`, `canvas` | CSS grid boxes in `LayoutMap.jsx`. No Leaflet, Mapbox, OpenLayers, or SVG vector map engine integrated yet. |

---

## 6. Backend Layout & Processing Audit

- **Upload Endpoints (`POST /projects/{id}/layouts`):** **NOT IMPLEMENTED.**
- **File Storage Directory (`backend/uploads/`):** Directory exists, but currently empty. No binary file saver utility written.
- **Background Jobs / Celery / Redis:** **NOT IMPLEMENTED.**
- **AI Vision / OCR / CAD Parsers:** **NOT IMPLEMENTED.**
- **GeoJSON Generators / Plot Extractors:** **NOT IMPLEMENTED.**

---

## 7. Database Physical Audit (PostgreSQL `landos_db`)

Connected to PostgreSQL `landos_db` on `127.0.0.1:5432`:

| Table Name | Physical Status in PostgreSQL | Columns Count | Foreign Key Constraints |
|---|---|---|---|
| `projects` | **EXISTS** | 9 columns | None (Master PK) |
| `project_locations` | **EXISTS** | 9 columns | `project_id` -> `projects.id` |
| `project_surveys` | **EXISTS** | 4 columns | `project_id` -> `projects.id` |
| `project_commercials` | **EXISTS** | 9 columns | `project_id` -> `projects.id` |
| `project_legal` | **EXISTS** | 4 columns | `project_id` -> `projects.id` |
| `layout_sources` | **EXISTS** | 10 columns | `project_id` -> `projects.id` |
| `plots` | **DOES NOT EXIST** | 0 columns | (Documented in design spec v1 only) |
| `bookings` | **DOES NOT EXIST** | 0 columns | (Documented in design spec v1 only) |

> **Do plots physically exist in PostgreSQL?**  
> **NO.** Plots currently exist only as mock JSON data in `frontend/src/data/plots.json`.

---

## 8. Existing API Contracts

| Method | Path | Purpose | Request Payload | Response Payload |
|---|---|---|---|---|
| `POST` | `/api/v1/projects` | Creates project transactionally in PostgreSQL | `ProjectCreate` JSON | `ProjectResponse` JSON (HTTP 201) |
| `GET` | `/api/v1/projects` | Lists all projects from PostgreSQL | None | `List[ProjectResponse]` JSON (HTTP 200) |
| `GET` | `/api/v1/projects/{id}` | Retrieves single project details from PostgreSQL | None | `ProjectResponse` JSON (HTTP 200) |
| `POST` | `/api/v1/projects/{id}/layouts` | Upload binary blueprint file | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** |

---

## 9. Current Gap Analysis Matrix

| Capability | Exists | Location | Status |
|---|---|---|---|
| Project creation | **YES** | `CreateProject/index.jsx` | Complete (5-step wizard) |
| PostgreSQL persistence | **YES** | `backend/app/services/project_service.py` | Complete (6 normalized tables) |
| Layout metadata | **YES** | `layout_sources` table & `ProjectCreate` | Complete (stores filename, size, type) |
| Real file upload | **NO** | — | **NOT IMPLEMENTED** (Only metadata sent) |
| File storage | **NO** | `backend/uploads/` | Directory exists, no handler logic |
| Processing job | **NO** | — | **NOT IMPLEMENTED** |
| PDF extraction | **NO** | — | **NOT IMPLEMENTED** |
| Image extraction | **NO** | — | **NOT IMPLEMENTED** |
| CAD extraction | **NO** | — | **NOT IMPLEMENTED** |
| AI vision | **NO** | — | **NOT IMPLEMENTED** |
| Plot geometry | **NO** | — | **NOT IMPLEMENTED** |
| Road geometry | **NO** | — | **NOT IMPLEMENTED** |
| Boundary geometry | **NO** | — | **NOT IMPLEMENTED** |
| GeoJSON | **NO** | — | **NOT IMPLEMENTED** |
| Interactive layout map | **NO** | `tabs/LayoutMap.jsx` | Mock CSS grid view only |
| Satellite map | **NO** | — | **NOT IMPLEMENTED** |
| GIS alignment | **NO** | — | **NOT IMPLEMENTED** |

---

## 10. Executive Conclusions & Roadmap Recommendations

### A. Current State
LandOS has a production-ready **Create Project 5-Step Wizard**, a **Dedicated Workspace Shell**, and a **Real PostgreSQL Backend** (`projects`, `project_locations`, `project_surveys`, `project_commercials`, `project_legal`, `layout_sources`). Currently, attached layout blueprint files only pass **metadata** to PostgreSQL. No binary files are stored on disk, and no AI/vector parsing engine is active yet.

### B. Next Missing Capability
The immediate missing capability is **Binary Layout File Upload & Storage** (`POST /api/v1/projects/{project_id}/layouts`), allowing real blueprint files (`.pdf`, `.png`, `.jpg`, `.dwg`) to be uploaded, saved to backend disk storage, and registered in `layout_sources`.

### C. Proposed P2.3 Sub-Phase Sequence:
1. **P2.3.1 — Binary File Storage Handler:** Create backend disk directory storage utility (`backend/uploads/projects/{project_id}/layouts/`).
2. **P2.3.2 — Multipart File Upload API:** Implement `POST /api/v1/projects/{project_id}/layouts` endpoint using FastAPI `UploadFile` & `Form`.
3. **P2.3.3 — Processing Job Entity & Status Model:** Create `layout_processing_jobs` table in PostgreSQL (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).
4. **P2.3.4 — Frontend Multipart Upload Integration:** Update `CreateProject` Step 4 and Project Workspace to issue `FormData` multipart uploads.
5. **P2.3.5 — Layout Engine API Contract:** Define the vector geometry schema (`boundary_geojson`, `plot_number`, `area_sqft`) for plot polygon storage.

### D. Confirmation: DO NOT IMPLEMENT
Zero files modified, zero database schemas changed, zero libraries installed. Audit complete.
