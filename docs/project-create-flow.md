# LandOS — Project Creation Lifecycle & Architectural Data Flow

**Document Version:** 1.0.0  
**Phase:** Phase P1 — Create Project UI & Client State  
**Module:** Projects / Admin Project Creation  

---

## 1. Architectural Architecture & High-Level Flow

```
Admin
  ↓
Create Project UI (5-Step Wizard)
  ↓
Form State (React useState)
  ↓
projectService (Service Abstraction)
  ↓
Mock Persistence (localStorage / 'landos_projects_data')
  ↓
Project Record (Normalized JSON Structure)
  ↓
Project Workspace (/projects/:projectId/overview)
```

---

## 2. Step-by-Step Data Flow Breakdown

### Step 1: Project & Developer Identity

| Lifecycle Stage | Implementation Detail |
|---|---|
| **1. What the Admin enters** | • Project Name (e.g., `Sunrise Valley Phase 2`)<br>• Developer Entity (e.g., `Sunrise Infra Pvt Ltd`)<br>• Project Type (`Residential`, `Commercial`, `Mixed Use`, `Industrial`, `Farm Plots`)<br>• Land Classification (`N.A. Residential`, `N.A. Commercial`, `Agricultural`, `Gram Panchayat`)<br>• Project Description (Optional executive summary notes) |
| **2. What frontend state represents it** | `form.name`, `form.developer`, `form.type`, `form.landClassification`, `form.description` in React `useState(INITIAL_FORM)` |
| **3. What object is passed to service** | `{ name, developer, type, landClassification, description, ... }` in `projectService.createProject(payload)` |
| **4. What is stored in localStorage** | Primary JSON fields on the project object in `landos_projects_data` array |
| **5. PostgreSQL mapping** | `projects.name` (VARCHAR), `projects.developer_name` (VARCHAR), `projects.project_type` (ENUM), `projects.land_classification` (ENUM), `projects.description` (TEXT) |
| **6. AI / GIS engine usage** | `FUTURE — NOT IMPLEMENTED` (Engine uses developer identity for metadata tagging and project boundary isolation). |

---

### Step 2: Location, Survey & Geo Identity

| Lifecycle Stage | Implementation Detail |
|---|---|
| **1. What the Admin enters** | • Administrative Address: State, District, Taluka, City/Village, Pincode<br>• Land Survey Numbers: Interactive tag input (e.g., `["Gut No. 142/1", "142/2B"]`)<br>• Geo-Coordinates: Latitude & Longitude center point<br>• Approving Authority (e.g., `PMRDA`, `DTCP`) & RERA Registration Number |
| **2. What frontend state represents it** | `form.state`, `form.district`, `form.taluka`, `form.cityVillage`, `form.pincode`, `form.surveyNumbers` (Array), `form.latitude`, `form.longitude`, `form.approvingAuthority`, `form.reraNo` |
| **3. What object is passed to service** | Full location object + formatted string for backward compatibility |
| **4. What is stored in localStorage** | `locationDetails: { state, district, taluka, cityVillage, pincode, surveyNumbers: [...], latitude, longitude, approvingAuthority, reraNo }` |
| **5. PostgreSQL mapping** | `project_locations` table (`state`, `district`, `taluka`, `city_village`, `pincode`, `survey_numbers` TEXT[], `latitude` DECIMAL(10,8), `longitude` DECIMAL(11,8)), `project_legal` table (`rera_number`, `approval_authority`) |
| **6. AI / GIS engine usage** | `FUTURE — NOT IMPLEMENTED` (Engine uses Latitude/Longitude to query satellite imagery tiles and aligns survey numbers against government cadastre land maps). |

---

### Step 3: Commercial Baseline & Land Metrics

| Lifecycle Stage | Implementation Detail |
|---|---|
| **1. What the Admin enters** | • Total Gross Land Area (Numeric e.g. `45`)<br>• Area Measurement Unit (`Acres`, `Sq. Ft.`, `Gunta`, `Hectares`)<br>• Target Base Rate (₹ / Sq. Ft.)<br>• Minimum & Maximum Plot Prices (₹)<br>• Target Launch Date & Expected Completion Date |
| **2. What frontend state represents it** | `form.grossArea`, `form.areaUnit`, `form.baseRatePerSqFt`, `form.priceMin`, `form.priceMax`, `form.startDate`, `form.expectedCompletion` |
| **3. What object is passed to service** | Structured numeric metrics + formatted strings (`totalArea`: `"45 Acres"`, `priceRange`: `"₹25L – ₹80L"`) |
| **4. What is stored in localStorage** | `landDetails: { grossArea: 45, areaUnit: "Acres", baseRatePerSqFt: 3500, priceMin: 2500000, priceMax: 8000000 }` |
| **5. PostgreSQL mapping** | `project_commercials` table (`total_land_area_sqft` NUMERIC(14,2), `area_display_unit` VARCHAR, `base_rate_per_sqft` NUMERIC(10,2), `min_price` NUMERIC(12,2), `max_price` NUMERIC(12,2), `launch_date` DATE, `completion_date` DATE) |
| **6. AI / GIS engine usage** | `FUTURE — NOT IMPLEMENTED` (Engine uses gross land area to calculate total plot density and saleable vs open area efficiency ratios). |

---

### Step 4: Master Layout Blueprint Upload

| Lifecycle Stage | Implementation Detail |
|---|---|
| **1. What the Admin enters** | • Drag-and-drop blueprint file (PDF, PNG, JPG, JPEG, TIFF up to 50MB)<br>• Known Scale Calibration (`Not specified` or custom scale ratio e.g., `1:500`) |
| **2. What frontend state represents it** | `layoutFile` (Browser JS `File` object or null), `form.knownScale`, `form.scaleRatio` |
| **3. What object is passed to service** | `layoutUploaded: boolean`, `layoutFile: { name, size, type }`, `scaleRatio` |
| **4. What is stored in localStorage** | `layoutSource: { fileName: "master_layout.pdf", fileSize: 1420580, fileType: "application/pdf", scaleRatio: "1:500", uploadedAt: "2026-07-29T..." }` |
| **5. PostgreSQL mapping** | `layout_sources` table (`file_path`, `mime_type`, `file_size_bytes`, `scale_ratio`, `upload_status`), `layout_processing_jobs` table (`status` ENUM `'QUEUED'/'PROCESSING'/'COMPLETED'`) |
| **6. AI / GIS engine usage** | `FUTURE — NOT IMPLEMENTED` (High-resolution blueprint file will be sent to the Python OpenCV/vector CAD processing service to extract plot boundaries, plot numbers, roads, and green zones). |

---

### Step 5: Review, Pre-Flight Checklist & Creation Action

| Lifecycle Stage | Implementation Detail |
|---|---|
| **1. What the Admin enters** | • Pre-flight review of 4 summary cards<br>• Edit button clicks to jump to specific steps<br>• Primary Action: `[ Save as Draft ]` or `[ Create Project & Process Layout ]` |
| **2. What frontend state represents it** | `step = 4`, `saving = true/false` |
| **3. What object is passed to service** | `projectService.createProject(payload)` with `status: 'LAYOUT_PENDING'` or `'DRAFT'` |
| **4. What is stored in localStorage** | New object prepended to `landos_projects_data` localStorage array |
| **5. PostgreSQL mapping** | Multi-table atomic `BEGIN TRANSACTION; ... COMMIT;` inserting into `projects`, `project_locations`, `project_commercials`, `layout_sources` |
| **6. AI / GIS engine usage** | `FUTURE — NOT IMPLEMENTED` (Backend dispatches Celery background worker job to initiate vector layout parsing). |

---

## 3. Data Rule: User-Provided vs. Derived Data

### User-Provided Data (Collected in Create Project Wizard):
- Project Name, Developer Entity, Type, Land Classification, Description
- State, District, Taluka, City/Village, Pincode, Survey/Gut Numbers, Lat/Long, RERA No., Approving Body
- Gross Land Area, Measurement Unit, Base Rate, Price Range, Launch & Completion Dates
- Blueprint File Metadata & Scale Calibration Ratio

### Future Derived Data (Calculated by Backend & Layout Processing Engine):
- **Total Plot Count** (`totalPlots`) — *Derived from extracted polygons*
- **Individual Plot Boundaries** (GeoJSON / SVG Paths) — *Extracted by Computer Vision / CAD Parser*
- **Individual Plot Numbers & Labels** (e.g. `Plot #101`, `Plot #102`) — *Parsed by OCR / CAD Text Layer*
- **Plot Net Area & Dimensions** (Width x Length in Sq. Ft.) — *Calculated by spatial geometry engine*
- **Internal Road Networks & Open Spaces** — *Segmented by layout parser*
- **Inventory Counts** (`availablePlots`, `soldPlots`, `reservedPlots`, `blockedPlots`) — *Maintained by plot transactions*
- **Realized Revenue & Pending Receivables** — *Calculated from payment records*
- **GIS Map Bounding Box** — *Georeferenced from satellite coordinates*

---

## 4. Current Lifecycle States Implemented

| Project Status | Trigger Condition | Overview Tab Banner Displayed |
|---|---|---|
| `LAYOUT_PENDING` | Created with master layout blueprint attached | ⏳ **Master Layout Processing Pending**<br>*Blueprint file uploaded & queued for processing.* |
| `DRAFT` | Saved as draft or created without layout file | 📝 **Project Saved as Draft — Layout Pending**<br>*Created without layout file; upload deferred.* |
| `ACTIVE` | (Future state when plots are verified & audit completed) | Standard executive KPIs & plot inventory matrix. |
