# LandOS — Agent Workflow & Architecture Reference
### Frontend-Only Development Guide · Read before touching any module

> This file is the source of truth for HOW the system works.
> `DEVLOG.md` tracks WHAT was built. This file tracks WHY and HOW.

---

## Core Philosophy: The Plot is the Center

Every sale in a land development business starts with a **plot**.
From one plot, everything else connects:

```
Plot
 ├── Customer (who bought it)
 ├── Broker (who sourced the deal)
 ├── Payments (EMI plan, receipts)
 ├── Documents (agreement, registration)
 └── Analytics (revenue contribution)
```

**Design Rule:** Every major entity must be creatable from TWO places:
1. **Directly** — `Customers module → Add Customer`
2. **Contextually** — `Plot → Assign Customer → New Customer`

If customer exists → select them. If not → create on the spot without leaving the task.
Same rule applies to Brokers.

---

## App Shell Layout (FROZEN)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (fixed 64px)                                    │
│  Logo | Breadcrumb | Search | Notifications | Profile   │
├──────────────┬──────────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT                            │
│  192px fixed │  padding: 16px 22px                      │
│  (MANAGEMENT)│                                          │
│  Dashboard   │                                          │
│  Projects    │                                          │
│  Customers   │                                          │
│  Brokers     │                                          │
│  Payments    │                                          │
│  Documents   │                                          │
│  (ANALYTICS) │                                          │
│  Analytics   │                                          │
│  (SYSTEM)    │                                          │
│  Settings    │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## MODULE 1: PROJECTS

### 1A. Projects List (`/projects`)
- Cards (grid) or rows (table) view
- Each card: Name, Location, Type, Status badge, Total Plots, Sold%, Revenue, Progress bar
- Toolbar: Search | Filter:Status | Filter:Type | Sort | Grid/List toggle | + New Project
- Status filters: All / Active / Upcoming / Completed

### 1B. Create New Project (`/projects/new`) — Multi-Step Wizard

```
Step 1: Basic Information
  - Project Name*, Location*, Type (Residential/Commercial/Mixed Use)
  - Total Area (acres), Total Plots*, Price Range, Start Date, Completion Date, Description

Step 2: Upload Layout
  - Drag & drop layout image/PDF  OR  Skip

Step 3: Review & Confirm
  - Summary of entered data → [Create Project] → redirect to /projects/:id
```

### 1C. Project Workspace (`/projects/:id`)

Context switches: everything now scoped to THIS project.

**Workspace Header (always visible):**
```
← All Projects | [Project Name]  [Status]  [Location]
──────────────────────────────────────────────────────────────
[Overview] [Layout Map] [Plots] [Customers] [Brokers] [Payments] [Documents] [Analytics] [Settings]
```
Active tab: burgundy underline indicator.

---

#### Tab 1 — Overview (READ-ONLY monitoring)

Purpose: Tell me everything about this project in 30 seconds. No editing.

Layout:
```
Row 1: KPI Banner strip
  Total Plots | Sold | Reserved | Available | Total Collection | Pending | Progress%

Row 2:
  Left (60%): Sales progress bar, Today's Activity feed (recent bookings/payments)
  Right (40%): Project info (Location, Type, Area, Dates, Developer, RERA)

Row 3: Alerts
  - Overdue payments, Pending registrations, Missing documents
```

#### Tab 2 — Layout Map (VISUALIZATION ONLY)

Purpose: Visual grid of all plots, color-coded by status.

- Click any plot cell → Popup:
  - Plot No, Area, Price, Status
  - Customer (if assigned), Broker (if assigned)
  - Outstanding Amount
  - [Open Full Details] → Plots tab

Color coding:
- Green = Available
- Amber = Reserved
- Burgundy (#7A1E3A) = Sold
- Gray = Blocked

**This is NOT where data is edited. Plots tab is for editing.**

#### Tab 3 — Plots (DATA MANAGEMENT — full editing)

Purpose: Excel-like table for all plots. This is where business editing happens.

Table columns: Plot No | Area (sq.ft) | Price | Status | Customer | Broker | Outstanding | [Open]

Row → click → Slide-over drawer:
- Edit: Price, Status (dropdown: Available/Reserved/Sold/Blocked)
- Assign Customer → search existing OR [+ New Customer] inline
- Assign Broker → search existing OR [+ New Broker] inline
- Payment Plan (EMI schedule view)
- Documents
- History log

Toolbar: Search | Filter by Status | Export CSV | + Add Plot

#### Tabs 4–8 — Contextual Views (same UI as global modules, filtered)

| Tab | Content |
|-----|---------|
| Customers | Only customers with plots in THIS project |
| Brokers | Only brokers on THIS project's deals |
| Payments | All payments for THIS project |
| Documents | Project + customer docs scoped to this project |
| Analytics | Charts for this project only |

#### Tab 9 — Project Settings
Fields: Project Name, Location, Type, Status, Default Plot Price, RERA No, Developer

---

## MODULE 2: CUSTOMERS (`/customers`)

### List
- Table: Name | Phone | City | Plots Booked | Total Paid | Outstanding | Status
- Search | Filter by Project | Filter by City | + Add Customer

### Profile (`/customers/:id`)
Tabs: Overview | Plots (booked) | Payments | Documents | Notes

### Add Customer
- From /customers list → Add Customer button
- From Plot drawer → Assign Customer → [+ New Customer]

---

## MODULE 3: BROKERS (`/brokers`)

### List
- Table: Name | Phone | RERA ID | Projects | Deals | Commission Earned | Pending | Status
- Search | Filter | + Add Broker

### Profile (`/brokers/:id`)
Tabs: Overview | Deals | Commission | Network (referral chain) | Documents | Notes

Performance KPIs: Total Deals | Revenue Generated | Commission Earned | Pending | Rank

### Add Broker
- From /brokers list → Add Broker button
- From Plot drawer → Assign Broker → [+ New Broker]

---

## MODULE 4: PAYMENTS (`/payments`)

Quick Analytics Bar: Today's Collection | This Month | Pending | Total Revenue | Broker Pending

Tabs: All | Pending | Overdue | Completed | Broker Commission

Table: Customer | Project | Plot | Type | Amount | Due Date | Paid | Mode | Status | Receipt

Payment Types: Down Payment | EMI | Full Payment | Broker Commission
Payment Modes: Cash | Bank Transfer | UPI | Cheque

---

## MODULE 5: DOCUMENTS (`/documents`)

Category Filters: All | Project Docs | Customer Docs | Broker Docs | Payment Docs

Project Documents: Layout Approval, Gov Approval, NOC, Master Plan
Customer Documents: Aadhaar, PAN, Agreement, Sale Deed, Registration, Photos
Broker Documents: ID Proof, Bank Details, Agreement, Commission Records
Payment Documents: Receipts, Invoices, Registration Proof

Features: Search | Preview | Download | Upload | Filter by project/customer/broker

---

## MODULE 6: ANALYTICS (`/analytics`)

Deep business intelligence. NOT the dashboard.

Sections: Sales | Revenue | Project Performance | Customer | Broker | Payments | Growth Trends

Export: PDF / CSV

---

## MODULE 7: SETTINGS (`/settings`)

Sections: Company Info | Theme | Users (admin only V1) | Notifications | Security

---

## Data Model (Mock JSON)

### `plots.json` — MUST CREATE for Phase 2.5
```json
{
  "id": "plot_001",
  "projectId": "proj_001",
  "plotNo": "A-01",
  "area": 1200,
  "price": 2500000,
  "status": "Available",
  "customerId": null,
  "brokerId": null,
  "facing": "East",
  "dimensions": "30x40",
  "isCorner": false,
  "notes": "",
  "createdAt": "2024-01-15T08:00:00Z"
}
```

Status values: `"Available"` | `"Reserved"` | `"Sold"` | `"Blocked"`

---

## Routes Map

```
/projects               → Projects List
/projects/new           → Create Project wizard
/projects/:id           → Workspace: Overview (default)
/projects/:id/layout    → Workspace: Layout Map
/projects/:id/plots     → Workspace: Plots table
/projects/:id/customers → Workspace: Customers (scoped)
/projects/:id/brokers   → Workspace: Brokers (scoped)
/projects/:id/payments  → Workspace: Payments (scoped)
/projects/:id/documents → Workspace: Documents (scoped)
/projects/:id/analytics → Workspace: Analytics (scoped)
/projects/:id/settings  → Workspace: Project Settings

/customers              → Customer Registry
/customers/:id          → Customer Profile

/brokers                → Broker Registry
/brokers/:id            → Broker Profile

/payments               → Payment Center
/documents              → Document Locker
/analytics              → Business Intelligence
/settings               → App Settings
```

---

## Design System (FROZEN — do not change)

| Element | Spec |
|---------|------|
| Card border | `1px solid rgba(0,0,0,0.07)` |
| Card radius | `6px` |
| Card shadow | **NONE** |
| Card header padding | `8px 12px` |
| Card body padding | `10px 12px` |
| Card title | `0.72rem`, `600`, uppercase, `letter-spacing: 0.05em` |
| Table TH | `0.62rem`, `700`, uppercase, `padding: 7px 12px` |
| Table TD | `0.77rem`, `padding: 8px 12px` |
| Status pill | `0.6rem`, `800`, uppercase, `border-radius: 4px` |
| Row hover | `rgba(122,30,58,0.04)` |
| Accent color | `#7A1E3A` |
| Token system | `--df-*` prefix (see `src/styles/tokens.css`) |
| Font | Inter (body), monospace for numbers/currency |
| Sidebar width | `192px` fixed |
| Navbar height | `64px` fixed |

---

*Last updated: 2026-07-24 | Agent workflow reference for LandOS frontend development*
