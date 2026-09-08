# TASK-056: PRODUCTION LAYOUT REVIEW & APPROVAL SYSTEM REPORT

**Modules Introduced**:
- `backend/app/services/layout_review_service.py` (**164 lines**)
- `backend/app/services/layout_version_service.py` (**128 lines**)
- `backend/app/api/v1/endpoints/layout_review.py` (**66 lines**)
- `backend/app/db/test_layout_review_approval.py` (**111 lines**)
- `backend/app/models/project.py` (Added `layout_status`, `layout_version`, `geometry_revision`, `approved_at`, `approved_by` columns)

**Status**: **PRODUCTION APPROVED & READY FOR CRM INTERACTION**

---

## 1. EXECUTIVE SUMMARY

The **Universal Layout Engine** now features a complete **Human-in-the-Loop Production Review & Approval System**.

Uploaded blueprint vectorizations are initially assigned status `DRAFT`. Before any layout can be utilized by CRM, booking engines, or pricing systems, it must pass strict **GEOS C++ computational geometry validation** (`validate_layout_draft`) and be explicitly approved via `POST /approve-layout`.

Upon approval:
1. Geometry is frozen (`APPROVED` / `LOCKED`).
2. Immutable plot IDs are generated.
3. Plot inventory entities are synchronized and persisted into PostgreSQL `project_plots`.
4. Read-only geometry locking is enforced (unauthorized geometry edits are rejected unless a formal revision is created via `POST /revisions`).

---

## 2. LAYOUT STATUS LIFECYCLE MATRIX

```
+---------------+      Submit for Review      +------------------+
|     DRAFT     | --------------------------> |   UNDER_REVIEW   |
+---------------+                             +------------------+
                                                       |
                                           GEOS Validation Passes
                                                       |
                                                       v
+---------------+      Create Revision        +------------------+
|    LOCKED     | <-------------------------- |     APPROVED     |
+---------------+                             +------------------+
```

| Layout Status | Editable Geometry? | GEOS Validation Required? | Available in CRM? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`DRAFT`** | **YES** | NO | **NO** | Raw AI pipeline draft state |
| **`UNDER_REVIEW`** | **YES** | YES | **NO** | Manual review & patch state |
| **`APPROVED`** | **READ-ONLY** | YES (Passed) | **YES** | Official CRM layout asset |
| **`LOCKED`** | **READ-ONLY** | YES (Passed) | **YES** | Locked against external geometry edits |

---

## 3. GEOS C++ GEOMETRY VALIDATION SPECIFICATION

Before `approve_layout()` executes, `validate_layout_draft()` performs automated GEOS computational geometry checks:

1. **Enclosing Boundary Validation**: Validates that the project boundary polygon is a simple, valid GEOS polygon.
2. **Plot Self-Intersection Repair & Validity**: Checks `poly.is_valid` on every plot contour.
3. **Plot Overlap Detection**: Pairwise GEOS intersection area calculation (`poly_a.intersection(poly_b).area > 1.0 sq units`).
4. **Boundary Containment**: Verifies that plots reside inside project boundary (`boundary_poly.contains(plot)` or > 85% area overlap).
5. **Unique Plot Numbers**: Enforces zero duplicate plot numbers.

The validation endpoint returns:
`{"canApprove": true|false, "totalPlots": 120, "validPlots": 120, "errors": [], "warnings": []}`

---

## 4. API DOCUMENTATION & ENDPOINTS

All endpoints are registered under `http://localhost:8000/api/v1/projects`:

| Endpoint HTTP Method | Path | Summary / Description |
| :--- | :--- | :--- |
| **`GET`** | `/{project_id}/layouts/{layout_id}/review` | Returns layout draft model + status + GEOS validation report. |
| **`POST`** | `/{project_id}/layouts/{layout_id}/approve` | Approves layout, freezes geometry, generates immutable Plot IDs, persists inventory to PostgreSQL `project_plots`. |
| **`PATCH`** | `/{project_id}/layouts/{layout_id}/plots/{plot_id}` | Patches plot geometry, plotNumber, facing, dimensions, or status. Increments `layout_version`. Rejects edits on `APPROVED` layouts. |
| **`POST`** | `/{project_id}/layouts/{layout_id}/revisions` | Creates a new editable revision draft from a locked/approved layout (`layout_status = "UNDER_REVIEW"`). |
| **`POST`** | `/{project_id}/layouts/{layout_id}/rollback` | Restores layout model to specified historical version integer (`?target_version=1`). |

---

## 5. DATABASE SCHEMA MIGRATION

Added 5 columns to the `layout_sources` table in PostgreSQL:

```sql
ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS layout_status VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS layout_version INTEGER DEFAULT 1;
ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS geometry_revision INTEGER DEFAULT 1;
ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE layout_sources ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150);
```

Applied directly to PostgreSQL via `python -m app.db.init_db`.

---

## 6. TEST SUITE RESULTS

- **Validation Test Suite**: `python app/db/test_layout_review_approval.py` → **ALL PASSED**
  - `[1] Layout Draft Validation`: `canApprove = True`, Errors = 0.
  - `[2] Layout Approval & Freeze`: `status = APPROVED`, `approved_by = "Chief Architect"`, `persisted_project_plots = 2`.
  - `[3] Read-Only Geometry Locking`: Successfully blocked plot geometry edit on `APPROVED` layout.
  - `[4] Create Revision`: Status updated to `UNDER_REVIEW`, `geometry_revision = 2`.
  - `[5] Patch Plot Geometry`: New version `2`, plot number updated to `101-A`.
  - `[6] Rollback Version`: Successfully restored historical Version `1`.

- **Backend Regression Suite**: `test_geometry_engine.py` & `test_ocr_text_engine.py` → **ALL PASSED**
- **Frontend Build**: `npm run build` → **PASSED** (Built in 2.42s)
