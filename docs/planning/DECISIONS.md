# LandOS — Architectural Decision Log (ADR)

> **Architectural Decisions & Rationale**  
> *Permanent record of all major system architecture choices.*

---

## Decision #001: Physical Disk Storage for Layout Blueprints
- **Date**: 2026-08-03
- **Status**: Accepted
- **Decision**: Store uploaded blueprint files (`.pdf`, `.png`, `.jpg`, `.dwg`) on disk filesystem (`backend/uploads/projects/{id}/layouts/`) rather than PostgreSQL bytea columns.
- **Rationale**: Prevents database bloat, optimizes high-throughput memory streaming, simplifies background worker access.

---

## Decision #002: Canonical Layout Model (CLM) as Vendor-Independent IR
- **Date**: 2026-08-03
- **Status**: Accepted
- **Decision**: Introduce CLM as an Intermediate Representation (IR) between input file parsers (PDF, OpenCV, CAD) and downstream spatial/GeoJSON engines.
- **Rationale**: Decouples $N$ input formats from $M$ map renderers. Adding DXF/DWG/SVG support requires only writing 1 new parser that outputs CLM, without altering downstream plot engines or map renderers.

---

## Decision #003: PostgreSQL Stage Artifact Caching
- **Date**: 2026-08-03
- **Status**: Accepted
- **Decision**: Store intermediate pipeline stage outputs in `layout_processing_artifacts` table (`INSPECTION_METADATA`, `RAW_VECTOR_PRIMITIVES`, `NORMALIZED_VECTOR_PRIMITIVES`, etc.).
- **Rationale**: Enables deterministic pipeline debugging, permits re-running specific downstream stages without re-parsing raw files, and provides an audit trail.

---

## Decision #004: AbstractVectorExtractor ABC for Extensibility
- **Date**: 2026-08-03
- **Status**: Accepted
- **Decision**: Define `AbstractVectorExtractor` base class for all vector extractors.
- **Rationale**: Standardizes primitive output schemas across PDF, DWG, DXF, and SVG extractors.

---

## Decision #005: 2-File Governance Workflow (MASTER_PRODUCT_ROADMAP + SPRINT_BOARD)
- **Date**: 2026-08-03
- **Status**: Accepted
- **Decision**: Govern LandOS using two primary files: `MASTER_PRODUCT_ROADMAP.md` (long-term North Star & Epics) and `SPRINT_BOARD.md` (daily active sprint & outcome-based task assignments).
- **Rationale**: Replaces fragmented task lists with a outcome-oriented workflow focusing on user capabilities rather than isolated file creation.

---
*Last Updated: 2026-08-03 | LandOS Engineering Architecture*
