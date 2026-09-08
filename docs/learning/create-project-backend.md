# LandOS Learning Guide: Real PostgreSQL Project Persistence Lifecycle

**Learning Objective:** Understand how LandOS persists Create Project data into PostgreSQL using FastAPI, Pydantic, SQLAlchemy ORM, and Alembic database migrations.

---

## 1. The Complete Request Lifecycle

```
[1. User Clicks "Create Project"]
  React UI (CreateProject/index.jsx)
        ↓
[2. Frontend Service Layer]
  projectService.createProject(payload)
        ↓
[3. HTTP POST Request]
  fetch("http://localhost:8000/api/v1/projects", { body: JSON.stringify(payload) })
        ↓
[4. FastAPI Web Server & Router]
  @router.post("/projects") in app/api/v1/endpoints/projects.py
        ↓
[5. Pydantic Payload Validation]
  ProjectCreate schema validates types, enums, required fields, and 6-digit pincode format.
        ↓
[6. Service Layer & SQLAlchemy Transaction]
  ProjectService.create_project(db, data):
  BEGIN
    INSERT INTO projects ...
    INSERT INTO project_locations ...
    INSERT INTO project_surveys ... (Normalized 1:N tag records)
    INSERT INTO project_commercials ...
    INSERT INTO project_legal ...
    INSERT INTO layout_sources ...
  COMMIT
        ↓
[7. PostgreSQL Database]
  Stores normalized records across 6 SQL tables with UUID primary keys and foreign key constraints.
        ↓
[8. HTTP 201 Created Response]
  FastAPI reconstructs Project DTO and returns JSON to frontend.
        ↓
[9. React Workspace Navigation]
  React receives project ID and navigates to /projects/:projectId/overview!
```

---

## 2. Why Each Technology & Layer Exists

| Component / Layer | Role & Responsibility in LandOS |
|---|---|
| **FastAPI** | High-performance Python web framework that routes HTTP requests, manages OpenAPI docs (Swagger), and injects database sessions into route handlers. |
| **Pydantic** | Schema validation library that enforces type safety, required fields, and format rules before database operations begin. |
| **SQLAlchemy ORM** | Object-Relational Mapper that maps Python classes (`Project`, `ProjectLocation`) to PostgreSQL database tables and manages SQL transactions (`commit()`, `rollback()`). |
| **PostgreSQL** | Enterprise relational database that acts as the single source of truth for LandOS. |
| **Alembic** | Database migration management tool that tracks schema revisions (`a407087c09ab_create_project_schema_v1.py`) and executes idempotent `alembic upgrade head` operations. |
| **Normalized Survey Table** | `project_surveys` stores land survey numbers as child rows instead of a messy CSV string. This allows indexing each survey parcel independently for spatial queries. |
| **Database Transaction** | Guarantees atomic operations: either all 6 table records are inserted successfully, or `db.rollback()` cancels the entire operation to prevent partial/orphan data. |
