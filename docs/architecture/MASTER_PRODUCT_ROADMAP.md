# LandOS — Master Product Roadmap

> **The Long-Term Blueprint for LandOS**  
> *This document sets the North Star and Epics. It changes only when product direction shifts.*

---

## 🌟 The North Star Workflow

Every feature, engine module, database table, and API endpoint built in LandOS must directly serve and advance this single continuous user workflow:

```text
Create Project
      │
      ▼
Upload Blueprint Layout (PDF / PNG / JPG / DWG / DXF)
      │
      ▼
Automatic Intelligence Processing (Vectors, Shapes, Text)
      │
      ▼
Interactive Layout Map (Spacer.land-level interactive vector map)
      │
      ▼
Edit & Refine Plots (Boundary adjustment, plot splitting/merging)
      │
      ▼
Book Plots & Assign Customers / Brokers
      │
      ▼
Financial Management (Down Payments, EMI Schedules, Receipts)
      │
      ▼
Document Repository (Deeds, RERA, NOCs, Agreements)
      │
      ▼
Executive Analytics (Revenue, Inventory, Broker Leaderboards)
      │
      ▼
Project Completed
```

If a proposed feature does not advance this North Star workflow, **it should not be built**.

---

## 🚀 Epic Breakdown & Outcomes

### Epic 1: Project & Storage Foundation
- **Goal**: Allow admins to create projects, upload blueprint files securely, and track background processing jobs.
- **Status**: ✅ **100% COMPLETE**
- **User Outcome**: Admin can create a project with location and pricing parameters, drag-and-drop a layout blueprint file, and store it safely in project-scoped backend storage.

### Epic 2: Layout Intelligence Pipeline
- **Goal**: Convert uploaded raw blueprint files (PDF vectors & images) into a classified Canonical Layout Model (CLM) containing boundaries, roads, plots, and amenities.
- **Status**: 🚧 **75% IN PROGRESS** (Current Milestone: `P2.6.4`)
- **User Outcome**: Admin uploads a blueprint file and the system automatically extracts all drawing shapes, removes duplicate lines, repairs polygon gaps, and identifies individual plots and road corridors without human effort.

### Epic 3: Interactive Spatial Map & Plot Engine
- **Goal**: Render detected layout geometry as an interactive SVG/Canvas vector map where every plot is a clickable, color-coded interactive entity.
- **Status**: ⬜ **NOT STARTED** (Next Epic)
- **User Outcome**: Admin opens the project layout and sees an interactive map where available plots are Green, reserved plots are Amber, and sold plots are Burgundy. Clicking a plot opens a slide-out drawer showing area, dimensions, facing, and pricing.

### Epic 4: Sales CRM & Inventory Management
- **Goal**: Connect real-world customers and brokers to detected plots and enable plot reservations and sales bookings.
- **Status**: ⬜ **NOT STARTED**
- **User Outcome**: Admin clicks an available plot, searches/creates a customer and broker, and records a plot booking. The plot immediately changes color to Burgundy on the map.

### Epic 5: Financial Management & Documentation
- **Goal**: Track payment schedules (down payments + EMIs), generate receipts, and manage legal deeds and government NOCs per plot.
- **Status**: ⬜ **NOT STARTED**
- **User Outcome**: Admin manages installment payments per booking, tracks overdue payments, and attaches RERA certificates and sale deeds directly to plot records.

### Epic 6: Executive Analytics & Reporting
- **Goal**: Provide real-time commercial insights into project revenue, inventory sales velocity, and broker commission leaderboards.
- **Status**: ⬜ **NOT STARTED**
- **User Outcome**: Developer executive views live charts showing total revenue collected vs pending, monthly sales trend, and top-performing brokers.

### Epic 7: Advanced GIS & Satellite Alignment (Future)
- **Goal**: Align layout blueprints with real-world satellite imagery and GPS coordinates.
- **Status**: ⬜ **NOT STARTED**
- **User Outcome**: Admin overlays the layout map onto Google Maps / Satellite tiles with precise latitude/longitude positioning.

---

*Last Updated: 2026-08-03 | LandOS Product Architecture*
