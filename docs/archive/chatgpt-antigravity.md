# LandOS — Master Final Execution Plan & Architecture Blueprint

> **The Single Source of Truth for LandOS Development**  
> *Combines Product Vision, User Experience Mockups, Complete System Architecture, 14 Database Schemas, Engine Pipeline Design, Epics & Phase Specs, Active Sprint, Decision Log, and Agent Rules.*

---

# PART 1: PRODUCT VISION & END-USER EXPERIENCE

## 1.1 Goal
LandOS is a SaaS real estate operating system that converts uploaded land layout blueprints (PDF, PNG, JPG, DWG, DXF) into an interactive digital layout workspace (Spacer.land-level experience) where real estate developers and administrators can manage plots, bookings, customers, brokers, payments, analytics, and GIS data.

## 1.2 The Complete User Journey

```
Create Project ──► Upload Blueprint ──► Auto-Processing ──► Review Result ──► Interactive Layout Map
                                                                                      │
                                                                                      ▼
Project Completion ◄── Analytics ◄── Payments ◄── Customers & Bookings ◄── Manage Plots
```

---

## 1.3 Full User Experience Mockups (Screen-by-Screen)

### Screen 1: Admin Creates a Project (Frontend Step 2 of 5)
```text
┌────────────────────────────────────────────────────────────────┐
│  CREATE NEW PROJECT                              Step 2 of 5  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Project Name:    [ Greenfield Meadows            ]           │
│  Developer:       [ Shivam Infra Pvt Ltd          ]           │
│  Project Type:    [ Residential Layout       ▼ ]              │
│                                                                │
│  State:           [ Maharashtra              ▼ ]              │
│  District:        [ Nagpur                   ▼ ]              │
│  Taluka:          [ Nagpur (Rural)              ]              │
│  Village:         [ Besa                        ]              │
│  PIN:             [ 440037                      ]              │
│                                                                │
│  Survey Numbers:  [ 88/1, 88/2, 89/3           ]              │
│  Gross Area:      [ 2.5 ] acres                               │
│  Base Rate:       [ ₹1,500 ] per sq.ft                        │
│                                                                │
│           [ ← Previous ]          [ Next Step → ]             │
└────────────────────────────────────────────────────────────────┘
```

---

### Screen 2: Admin Uploads Blueprint (Frontend Step 4 of 5)
```text
┌────────────────────────────────────────────────────────────────┐
│  UPLOAD MASTER LAYOUT BLUEPRINT                  Step 4 of 5  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────────────────┐        │
│   │                                                    │        │
│   │     📄 greenfield_master_layout.pdf                │        │
│   │     3.4 MB  •  PDF  •  1 page                     │        │
│   │     ✅ Uploaded successfully                       │        │
│   │                                                    │        │
│   └──────────────────────────────────────────────────┘        │
│                                                                │
│   Scale Ratio:  [ 1:500          ]                             │
│                                                                │
│           [ ← Previous ]          [ Next Step → ]             │
└────────────────────────────────────────────────────────────────┘
```

---

### Screen 3: Automatic Processing Progress
```text
┌────────────────────────────────────────────────────────────────┐
│  GREENFIELD MEADOWS                              🟢 Active    │
│  Besa, Nagpur, Maharashtra  •  2.5 acres  •  ₹1,500/sq.ft    │
├────────────────────────────────────────────────────────────────┤
│  Overview │ Layout Map │ Plots │ Analytics │ Customers │ ...  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ⏳ Processing Layout Blueprint...                        │ │
│  │                                                            │ │
│  │  ████████████████████░░░░░░░░░░  65%                      │ │
│  │                                                            │ │
│  │  ✅ File Inspection            ✅ PDF Reader               │ │
│  │  ✅ Vector Extraction          ✅ Text Extraction          │ │
│  │  🔄 Shape Classification...    ⬜ Plot Detection           │ │
│  │  ⬜ GeoJSON Generation         ⬜ Finalizing               │ │
│  │                                                            │ │
│  │  Estimated: ~15 seconds remaining                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: Interactive Layout Map (The Spacer.land Experience)
```text
┌──────────────────────────────────────────────────────────────────────────┐
│  GREENFIELD MEADOWS                                        🟢 Active   │
│  Besa, Nagpur  •  2.5 acres  •  156 Plots                             │
├──────────────────────────────────────────────────────────────────────────┤
│  Overview │ ▬Layout Map▬ │ Plots │ Analytics │ Customers │ Brokers     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📍 Total: 156  │  🟢 Available: 98  │  🟡 Reserved: 16  │  🔴 Sold: 42│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐  ┌──────┐ │
│  │ ╔═══════════════════════════════════════════════════╗   │  │🔍 +  │ │
│  │ ║                PROJECT BOUNDARY                    ║   │  │🔍 -  │ │
│  │ ║                                                    ║   │  │🔍 ⟲  │ │
│  │ ║  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐    ║   │  └──────┘ │
│  │ ║  │ P-1 ││ P-2 ││ P-3 ││ P-4 ││ P-5 ││ P-6 │    ║   │           │
│  │ ║  │ 🟢  ││ 🔴  ││ 🟢  ││ 🟡  ││ 🟢  ││ 🔴  │    ║   │  LEGEND  │
│  │ ║  └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘    ║   │  ┌──────┐ │
│  │ ║  ═══════════ 12m Main Road ══════════════════    ║   │  │🟢 Avl │ │
│  │ ║  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐    ║   │  │🟡 Rsv │ │
│  │ ║  │ P-7 ││ P-8 ││ P-9 ││P-10 ││P-11 ││P-12 │    ║   │  │🔴 Sld │ │
│  │ ║  │ 🟢  ││ 🟢  ││ 🔴  ││ 🟢  ││ 🟢  ││ 🟢  │    ║   │  │⬜ Blk │ │
│  │ ║  └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘    ║   │  └──────┘ │
│  │ ║  ═══════════ 9m Internal Road ═══════════════    ║   │           │
│  │ ║  ┌─────┐┌─────┐┌──────────────┐┌─────┐┌─────┐   ║   │           │
│  │ ║  │P-13 ││P-14 ││              ││P-17 ││P-18 │   ║   │           │
│  │ ║  │ 🟡  ││ 🟢  ││   🌳 Garden  ││ 🔴  ││ 🟢  │   ║   │           │
│  │ ║  └─────┘└─────┘││              ││─────┘└─────┘   ║   │           │
│  │ ║                 └──────────────┘                   ║   │           │
│  │ ║                                                    ║   │           │
│  │ ╚═══════════════════════════════════════════════════╝   │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 5: Plot Details Drawer (Click on Plot P-12)
```text
┌──────────────────────────────────────────┐
│  PLOT P-12                          ✕    │
├──────────────────────────────────────────┤
│                                          │
│  Status:    🟢 Available                 │
│                                          │
│  ─── DIMENSIONS ──────────────────────   │
│  Area:           1,200 sq.ft             │
│  Dimensions:     30ft × 40ft             │
│  Facing:         East                    │
│  Road:           12m Main Road           │
│                                          │
│  ─── PRICING ─────────────────────────   │
│  Rate:           ₹1,500 / sq.ft          │
│  Total Price:    ₹18,00,000              │
│                                          │
│  ─── ASSIGNMENT ──────────────────────   │
│  Customer:       Not assigned            │
│  Broker:         Not assigned            │
│                                          │
│  ─── ACTIONS ─────────────────────────   │
│  ┌──────────────────────────────────┐    │
│  │      📋 ASSIGN CUSTOMER          │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │      🤝 ASSIGN BROKER            │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │      ✅ BOOK THIS PLOT            │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │      🚫 BLOCK PLOT               │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

---

### Screen 6: Plot Booking Modal
```text
┌──────────────────────────────────────────┐
│  BOOK PLOT P-12                     ✕    │
├──────────────────────────────────────────┤
│                                          │
│  Customer:  [  🔍 Search or Create    ]  │
│             Rajesh Kumar  •  9876543210   │
│             ✅ Selected                   │
│                                          │
│  Broker:    [  🔍 Search or Create    ]  │
│             Sunil Properties  •  RERA123 │
│             ✅ Selected                   │
│                                          │
│  Plot:      P-12  •  1,200 sq.ft         │
│  Price:     ₹18,00,000                   │
│                                          │
│  Payment Plan:  [ EMI (12 months)   ▼ ]  │
│  Down Payment:  ₹3,00,000               │
│  EMI Amount:    ₹1,25,000 / month        │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │       ✅ CONFIRM BOOKING          │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

---

### Screen 7: Plots Spreadsheet View
```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Overview │ Layout Map │ ▬Plots▬ │ Analytics │ Customers │ Brokers      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔍 Search plots...              Filter: [ All Statuses ▼ ]            │
│                                                                          │
│  ┌──────┬──────────┬────────┬──────────┬───────────┬──────────┬───────┐ │
│  │ Plot │ Area     │ Facing │ Road     │ Status    │ Customer │ Price │ │
│  ├──────┼──────────┼────────┼──────────┼───────────┼──────────┼───────┤ │
│  │ P-1  │ 1,200    │ North  │ 12m Main │ 🟢 Avail │ —        │ ₹18L  │ │
│  │ P-2  │ 1,500    │ North  │ 12m Main │ 🔴 Sold  │ R.Kumar  │ ₹22L  │ │
│  │ P-3  │ 1,200    │ North  │ 12m Main │ 🟢 Avail │ —        │ ₹18L  │ │
│  │ P-4  │ 1,350    │ East   │ 9m Int.  │ 🟡 Rsvd  │ S.Patel  │ ₹20L  │ │
│  │ P-5  │ 1,200    │ South  │ 12m Main │ 🟢 Avail │ —        │ ₹18L  │ │
│  └──────┴──────────┴────────┴──────────┴───────────┴──────────┴───────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 8: Revenue & Sales Analytics Dashboard
```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Overview │ Layout Map │ Plots │ ▬Analytics▬ │ Customers │ Brokers      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐ │
│  │ Total Revenue  │ │ Collected     │ │ Pending       │ │ Plots Sold  │ │
│  │ ₹28.08 Cr     │ │ ₹18.5 Cr     │ │ ₹9.58 Cr     │ │ 42 / 156   │ │
│  │ ▲ +12% MTD    │ │ 65.8%        │ │ 34.2%        │ │ 26.9%      │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────┐  │
│  │ 📊 Sales Trend (6 months)       │ │ 📊 Plot Status Distribution  │  │
│  │  ₹5Cr ┤          ╱──╲           │ │   Available ████████████ 63% │  │
│  │  ₹4Cr ┤      ╱──╱    ╲          │ │   Sold      ██████     27%  │  │
│  │  ₹3Cr ┤  ╱──╱          ╲──      │ │   Reserved  ███       10%   │  │
│  └─────────────────────────────────┘ └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

# PART 2: MASTER ARCHITECTURE & DATABASE DESIGN

## 2.1 High-Level System Architecture

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

## 2.2 Complete Database Schema (14 Tables)

### Existing Tables (8 Tables — Active in PostgreSQL)
1. `projects`: Primary project master record.
2. `project_locations`: Geographic address details (State, District, Taluka, Village, Pincode).
3. `project_surveys`: Array of survey numbers.
4. `project_commercials`: Gross area, unit, pricing, development dates.
5. `project_legal`: Classification (RERA, NA, Layout Type).
6. `layout_sources`: File upload records (`uploads/projects/{id}/layouts/`).
7. `layout_processing_jobs`: Active pipeline job state (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).
8. `layout_processing_artifacts`: Stage outputs (`INSPECTION_METADATA`, `RAW_VECTOR_PRIMITIVES`, `NORMALIZED_VECTOR_PRIMITIVES`, etc.).

### New Tables (6 Tables — Planned for Epics 3, 4, 5)

#### `plots`
```sql
CREATE TABLE plots (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    plot_number VARCHAR(50) NOT NULL,
    polygon_geojson TEXT NOT NULL,
    area_sqft NUMERIC(12,2) NOT NULL,
    dimensions VARCHAR(100),
    facing VARCHAR(20),
    road_connection VARCHAR(100),
    centroid_x NUMERIC(10,2),
    centroid_y NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, SOLD, BLOCKED
    price NUMERIC(14,2),
    customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE SET NULL,
    broker_id VARCHAR(36) REFERENCES brokers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `roads`
```sql
CREATE TABLE roads (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    road_name VARCHAR(100),
    geometry_geojson TEXT NOT NULL,
    width_meters NUMERIC(6,2),
    road_type VARCHAR(30) DEFAULT 'INTERNAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `boundaries`
```sql
CREATE TABLE boundaries (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    polygon_geojson TEXT NOT NULL,
    area_sqft NUMERIC(14,2) NOT NULL,
    boundary_type VARCHAR(30) DEFAULT 'PROJECT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `amenities`
```sql
CREATE TABLE amenities (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    amenity_type VARCHAR(50) NOT NULL, -- GARDEN, CLUBHOUSE, PARKING, TEMPLE, OPEN_SPACE, WATER_TANK
    polygon_geojson TEXT NOT NULL,
    area_sqft NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `customers`
```sql
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(200),
    city VARCHAR(100),
    address TEXT,
    id_proof_type VARCHAR(30),
    id_proof_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `brokers`
```sql
CREATE TABLE brokers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(200),
    rera_id VARCHAR(50),
    commission_rate NUMERIC(5,2) DEFAULT 2.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `bookings`
```sql
CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
    plot_id VARCHAR(36) NOT NULL REFERENCES plots(id),
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    broker_id VARCHAR(36) REFERENCES brokers(id),
    booking_date DATE NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    payment_plan VARCHAR(30) DEFAULT 'EMI',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2.3 11-Stage Engine Pipeline

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

# PART 3: CURRENT PROJECT STATUS & CODEBASE INVENTORY

## 3.1 Status Summary
- **Current Version**: `v0.3.0`
- **Git Branch**: `main` (commit `2196f9d`)
- **Active Stage**: Epic 2 (Layout Intelligence Pipeline) — 75% Complete

## 3.2 Inventory of Completed Engine Modules

| Engine Module | File Path | Lines | Status | Responsibility |
|---|---|---|---|---|
| **File Inspector** | `backend/app/engine/inspector.py` | 76 | ✅ Complete | Binary format detection (PDF/PNG/JPG/TIFF), vector vs raster classification |
| **CLM Initializer** | `backend/app/engine/clm_builder.py` | 45 | ✅ Complete | Creates initial Canonical Layout Model Pydantic IR object |
| **Artifact Manager** | `backend/app/engine/artifact_manager.py` | 64 | ✅ Complete | PostgreSQL persistence for intermediate stage artifacts |
| **PDF Reader** | `backend/app/engine/pdf_reader.py` | 116 | ✅ Complete | pypdf stream inspector (MediaBox, fonts, text preview) |
| **Vector Extractor** | `backend/app/engine/vector_path_extractor.py` | 380 | ✅ Complete | PDF content stream parser (`m`, `l`, `c`, `re`, `h`, `S`, `f`, `q`, `Q`, `cm`, `W`) |
| **Geometry Normalizer**| `backend/app/engine/geometry_normalizer.py` | 324 | ✅ Complete | Duplicate removal, segment merging, gap repair, centroid/bbox math |
| **Pipeline Controller** | `backend/app/engine/pipeline.py` | 253 | ✅ Complete | Orchestrates stages (25% → 40% → 60% → 75%) |

---

# PART 4: EPIC ROADMAP & PHASE SPECIFICATIONS

```text
Epic 1: Project & Storage Foundation        ✅ 100% COMPLETE
Epic 2: Layout Intelligence Pipeline         🚧 75% IN PROGRESS (Current: P2.6.4)
Epic 3: Interactive Map & Plot Engine        ⬜ NOT STARTED
Epic 4: Sales CRM & Inventory Management     ⬜ NOT STARTED
Epic 5: Financial Management & Documents     ⬜ NOT STARTED
Epic 6: Executive Analytics & Reporting      ⬜ NOT STARTED
Epic 7: Advanced GIS & Satellite Alignment   ⬜ NOT STARTED
```

---

# PART 5: CURRENT SPRINT

- **Epic**: Epic 2 — Layout Intelligence Pipeline
- **Milestone**: `P2.6.4` — CLM Primitive Builder & Single-Trigger Pipeline Auto-Run
- **Objective**: Classify normalized vector primitives into CLM entity categories (boundaries, roads, plots, amenities, paths) and execute the complete pipeline automatically from a single API call (`POST /projects/{id}/layouts/{lid}/process`).

### Current Sprint Deliverables
1. `clm_primitive_builder.py`: Module classifying shapes using area, aspect ratio, and spatial heuristics.
2. `pipeline.py`: Add `run_full_pipeline()` method to auto-run inspection → PDF reading → vector extraction → geometry normalization → CLM building.
3. Update `CANONICAL_LAYOUT_MODEL` artifact from empty lists to populated entities.
4. Integration test suite: `backend/app/db/test_clm_primitive_builder.py`.

---

# PART 6: DECISION LOG

- **Decision #001**: Physical Disk Storage for Layout Blueprints (`uploads/projects/{id}/layouts/`) rather than DB blobs.
- **Decision #002**: Canonical Layout Model (CLM) as Vendor-Independent IR to decouple $N$ file parsers from $M$ map renderers.
- **Decision #003**: PostgreSQL Stage Artifact Caching in `layout_processing_artifacts` for debugging and deterministic stage re-runs.
- **Decision #004**: `AbstractVectorExtractor` ABC to standardize primitive outputs across PDF, DXF, DWG, and SVG extractors.
- **Decision #005**: Single Master Execution Plan (`MASTER_FINAL_EXECUTION_PLAN.md`) as the primary repository brain.

---

# PART 7: RISKS & MITIGATIONS

1. **Uncommitted Work**: Always run `git status` before writing code to prevent losing changes.
2. **CAD Vector Hatch Complexity**: Blueprint PDFs from CAD contain thousands of hatch lines. *Mitigation*: Filter by stroke width, pattern, and aspect ratio.
3. **Missing Scale Ratio**: Default to PDF points/pixels and allow live UI calibration.

---

# PART 8: MANDATORY RULES FOR CODING AGENTS

1. **Read Before Writing**: Always read `MASTER_FINAL_EXECUTION_PLAN.md` before starting any task.
2. **Never Invent Architecture**: Adhere strictly to the established CLM, singleton, and artifact-based pipeline architecture.
3. **No Unapproved DB Schema Changes**: All schema changes must be applied via Alembic migrations after being specified in the plan.
4. **Preserve Integration Tests**: Never modify or weaken test assertions to make a failing test pass. Always fix root causes.
5. **Preserve API Contracts**: Never alter existing FastAPI endpoint parameters or response schemas without review.
6. **Update Status Upon Completion**: Upon completing a sprint task, update status and decision logs in `MASTER_FINAL_EXECUTION_PLAN.md`.

---
*Last Updated: 2026-08-03 | LandOS Core Architecture Team*
