# LandOS — Comprehensive System Architecture Report
**Document Version:** 1.0.0  
**Phase:** System Architecture Design Phase  
**Generated On:** 2026-07-27  
**Project Location:** `C:\Users\shiva\Desktop\LandOS`  
**Author:** Antigravity AI Architecture Team  

---

# 1. Project Overview

### Project Description
**LandOS** is an industry-grade ERP and Operating System tailored specifically for land developers, real estate township builders, and plot sales agencies. The platform centralizes and automates the core lifecycle of real estate development: land acquisitions, project partitioning, plot sales management, customer relationships, broker network payouts, financial payment schedules, and legal document vaults.

At the core of the business logic is **The Plot**. Every transaction, payment, customer relationship, broker commission, and legal document anchors to an individual plot within a land project.

```
Plot (Core Entity)
 ├── Customer (Purchaser / Lead)
 ├── Broker (Sourcing Channel Partner)
 ├── Payments (EMI Schedules, Receipts, Down Payments)
 ├── Documents (Sale Deeds, RERA Agreements, Layout Maps)
 └── Analytics (Revenue Contribution, Velocity Metrics)
```

---

### Completed Modules
1. **Authentication & Session Management (`Phase 2.3`)**
   - Public Login and Forgot Password interfaces with split-screen OneStopAnalytics design layout.
   - Isolated `authService` mock adapter with simulated network latency (500ms).
   - Session persistence via `storage.js` supporting token and user storage in `localStorage` or `sessionStorage`.
   - `AuthProvider` context and `useAuth` hook supporting role-based (`hasRole`) and permission-based (`hasPermission`) route guarding.
   - `ProtectedRoute` boundary securing all application shell routes.

2. **Global Component Library & Design System (`Phase 2.2`)**
   - 17 production-ready, accessible, unstyled UI components in `src/components/ui/` (`Button`, `Input`, `Select`, `SearchInput`, `Card`, `Badge`, `Avatar`, `Table`, `Modal`, `Drawer`, `Dropdown`, `Tooltip`, `Tabs`, `EmptyState`, `Loader`, `Pagination`, `Toast`).
   - Interactive Design System Showcase available at route `/components`.

3. **Application Shell & Layout Infrastructure (`Phase 2.1` & `Phase 2.4-R`)**
   - Responsive `ContentLayout` featuring a fixed 64px Top Navbar and fixed 192px Left Sidebar.
   - Dynamic context-switching sidebar (switches automatically from global navigation to project-specific workspace navigation upon entering a project).
   - Theme toggle context (`ThemeContext.jsx`, `useTheme.js`) supporting dark and light modes with CSS variables (`--df-*`).

4. **Executive Dashboard (`Phase 2.4` & `Phase 2.4-R`)**
   - High-density command center ("Home" view).
   - `WelcomeHeader` with live date, user context greeting, and quick action shortcuts.
   - `KpiBanner` horizontal strip tracking 8 executive metrics (Projects, Customers, Plots Sold, Revenue, Pending Payments, Documents, Brokers, Occupancy Rate).
   - Recharts visual charts (`RevenueChart` for monthly targets vs actuals, `PlotDistributionChart` donut chart for inventory status).
   - Flat compact cards (`dCardStyles.js`), active projects table, recent transactions stream, legal document feed, broker leaderboard, and system activity timeline.

5. **Projects Management Hub (`Phase 2.5`)**
   - Projects List (`/projects`) with view switching (Grid Cards vs Pipe Table), status filters (All, Active, Upcoming, Completed), and search toolbar.
   - Multi-step Create Project Wizard (`/projects/new`) covering basic details, specs, layout uploads, and launch triggers.
   - `DeleteProjectModal` with confirmation safeguards.
   - `projectService.js` abstraction encapsulating CRUD operations and localStorage fallback.

6. **Project Workspace & Plot Management (`Phase 2.6`)**
   - Scoped workspace (`/projects/:projectId/*`) with sidebar-driven 9-tab navigation:
     - **Overview:** Read-only executive summary, KPI banner, sales velocity, activity timeline.
     - **Layout Map:** Visual color-coded plot grid (Green = Available, Amber = Reserved, Burgundy = Sold, Gray = Blocked) with quick plot inspection modals.
     - **Plots Table:** Master spreadsheet-style data management table with plot search, filter, export, and interactive slide-over `PlotDrawer` for editing plot status, price, notes, and inline customer/broker assignment.
     - **Customers / Brokers / Payments / Documents / Analytics / Settings:** Scoped project sub-views.
   - `plotService.js` abstraction managing plot CRUD and local storage persistence.

---

### Unfinished / Placeholder Modules
1. **Global Customers Registry (`/customers`):** Currently a basic page placeholder awaiting full registry table, customer profile views (`/customers/:id`), and KYC document attachments.
2. **Global Brokers Registry (`/brokers`):** Currently a basic page placeholder awaiting channel partner directory, broker profiles (`/brokers/:id`), commission ledger, and deal performance tracking.
3. **Global Payment Center (`/payments`):** Currently a basic page placeholder awaiting transaction stream, overdue payment alerts, receipt generation, and payment gateway integration.
4. **Global Document Locker (`/documents`):** Currently a basic page placeholder awaiting categorized document storage, cloud S3 uploads, previewer, and PDF agreement generator.
5. **Global Analytics Engine (`/analytics`):** Currently a basic page placeholder awaiting advanced business intelligence, custom date ranges, and PDF/CSV report exporter.
6. **Global App Settings (`/settings`):** Currently a basic page placeholder awaiting organization configuration, user management, and security controls.
7. **GIS / Interactive Visual Layout Maps:** Layout Map tab currently renders a grid matrix of status cells rather than an interactive vector/SVG GIS canvas map.
8. **Real-time Notifications:** Header bell icon exists as UI stub; backend notification queue and push alerts are not implemented.
9. **FastAPI Backend API Connection:** Python backend is a single test file; all frontend data operations currently rely on mock JSON files and localStorage.

---

### Current Project Structure
```
LandOS/
├── .git/                         # Git repository metadata
├── .gitignore                    # Python, Node, Vite, IDE ignore rules
├── DEVLOG.md                     # Chronological development handoff log
├── README.md                     # Overview & getting started guide
├── WORKFLOW.md                   # System workflow & architectural reference
├── LANDOS_ARCHITECTURE_REPORT.md # THIS FILE — System architecture specification
├── main.py                       # FastAPI entry point stub (learning script)
├── venv/                         # Python 3 virtual environment
│
├── backend/                      # Python FastAPI backend skeleton
│   ├── node_modules/             # Node packages (accidental/legacy)
│   ├── package-lock.json         # Node package lock
│   ├── services/                 # Empty services directory
│   └── uploads/                  # Empty uploads directory
│
└── frontend/                     # React 19 + Vite 8 frontend application
    ├── ARCHITECTURE.md           # Master frontend architecture document (Phase 2.0)
    ├── index.html                # HTML entry point with Inter font loading
    ├── package.json              # NPM dependencies & scripts
    ├── package-lock.json         # Lock file for NPM packages
    ├── vite.config.js            # Vite build setup with Tailwind CSS plugin
    ├── .oxlintrc.json            # Linter configuration
    ├── dist/                     # Production build output
    ├── public/                   # Static public assets
    └── src/                      # Application source code
```

---

### Technology Stack Summary

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React `^19.2.7` | UI building library |
| **Build Tool** | Vite `^8.1.1` | Ultra-fast HMR build server |
| **Routing** | React Router DOM `^7.18.1` | Client-side routing engine |
| **Styling** | Tailwind CSS `^4.3.3` | Utility-first CSS engine |
| **CSS Compiler** | `@tailwindcss/vite` `^4.3.3` | Vite Tailwind plugin |
| **Data Visualization** | Recharts `^3.10.0` | SVG charting library |
| **Icons** | Lucide React `^1.25.0` | Icon set |
| **Linter** | Oxlint `^1.71.0` | High-performance JS/JSX linter |
| **Backend Framework** | FastAPI (Python) | ASGI Python Web Framework (`main.py` stub) |
| **Python Server** | Uvicorn | ASGI Server (run via `uvicorn main:app --reload`) |
| **Package Managers** | npm (Frontend) / pip & venv (Backend) | Dependency management |

---

# 2. Current Frontend

### Pages List
1. **Login Page:** `src/pages/auth/Login.jsx` (`/login`)
2. **Forgot Password Page:** `src/pages/auth/ForgotPassword.jsx` (`/forgot-password`)
3. **Executive Dashboard:** `src/pages/Dashboard/index.jsx` (`/dashboard`)
4. **Projects List:** `src/pages/Projects/ProjectsList.jsx`, `ProjectList/index.jsx` (`/projects`)
5. **Create Project Wizard:** `src/pages/Projects/CreateProject/index.jsx` (`/projects/new`)
6. **Project Workspace Shell:** `src/pages/Projects/ProjectWorkspace/index.jsx` (`/projects/:projectId/*`)
7. **Global Customers Registry:** `src/pages/Customers/index.jsx` (`/customers`) [Placeholder]
8. **Global Brokers Registry:** `src/pages/Brokers/index.jsx` (`/brokers`) [Placeholder]
9. **Global Payment Center:** `src/pages/Payments/index.jsx` (`/payments`) [Placeholder]
10. **Global Document Locker:** `src/pages/Documents/index.jsx` (`/documents`) [Placeholder]
11. **Global Analytics Center:** `src/pages/Analytics/index.jsx` (`/analytics`) [Placeholder]
12. **Global App Settings:** `src/pages/Settings/index.jsx` (`/settings`) [Placeholder]
13. **Design System Showcase:** `src/pages/ComponentsShowcase.jsx` (`/components`)

---

### Route Definitions (`src/routes/index.jsx`)
```jsx
/login                     → Unprotected Public Login
/forgot-password           → Unprotected Public Password Reset
/components                → Unprotected Design System Showcase

[ProtectedRoute Boundary → ContentLayout Shell]
  /                        → Redirect to /dashboard
  /dashboard               → Executive Command Center
  /projects                → Projects Portfolio List
  /projects/new            → Multi-step Create Project Wizard
  /projects/:projectId/*   → Project Workspace (Wildcard for 9 internal tabs)
  /customers               → Global Customer Registry
  /brokers                 → Global Broker Registry
  /payments                → Global Payment Center
  /documents               → Global Document Locker
  /analytics               → Business Intelligence Center
  /settings                → Application Settings
  *                        → Catch-all redirect to /dashboard
```

---

### Reusable UI Components (`src/components/ui/`)

| Component | Directory | Description & Key Props |
|---|---|---|
| `Avatar` | `src/components/ui/Avatar` | User initials or image avatar with status dot (`size`, `src`, `name`, `status`). |
| `Badge` | `src/components/ui/Badge` | Status pills (`variant: primary/success/warning/danger/info/outline`, `size`). |
| `Button` | `src/components/ui/Button` | Action buttons (`variant: primary/secondary/ghost/danger/success`, `size`, `loading`, `icon`). |
| `Card` | `src/components/ui/Card` | Flat d-card container with compound subcomponents (`Card.Header`, `Card.Title`, `Card.Content`). |
| `Drawer` | `src/components/ui/Drawer` | Slide-over drawer panel from left/right (`isOpen`, `onClose`, `title`, `position`). |
| `Dropdown` | `src/components/ui/Dropdown` | Menu popover with click-outside listener (`trigger`, `items`, `align`). |
| `EmptyState` | `src/components/ui/EmptyState` | Placeholder display for empty tables/searches (`icon`, `title`, `description`, `action`). |
| `Input` | `src/components/ui/Input` | Form text input with label, error, and helper text (`label`, `error`, `icon`, `type`). |
| `Loader` | `src/components/ui/Loader` | Animated loading spinner and skeleton shimmers (`size`, `text`, `variant`). |
| `Modal` | `src/components/ui/Modal` | Centered dialog overlay with ESC key close (`isOpen`, `onClose`, `title`, `size`). |
| `Pagination` | `src/components/ui/Pagination` | Page navigation bar with page truncation (`currentPage`, `totalPages`, `onPageChange`). |
| `SearchInput` | `src/components/ui/SearchInput` | Debounced search input box with clear trigger (`value`, `onChange`, `placeholder`). |
| `Select` | `src/components/ui/Select` | Custom select dropdown (`label`, `options`, `value`, `onChange`, `error`). |
| `Table` | `src/components/ui/Table` | Styled data table with sticky header and row hover (`columns`, `data`, `loading`). |
| `Tabs` | `src/components/ui/Tabs` | Underline tab bar with active indicator (`tabs`, `activeTab`, `onChange`). |
| `Toast` | `src/components/ui/Toast` | Notification toasts container and auto-dismiss alerts (`Toast.Container`, `Toast.show`). |
| `Tooltip` | `src/components/ui/Tooltip` | Hover popover tooltip (`content`, `position`). |

---

### Layout System (`src/layouts/ContentLayout.jsx`)
`ContentLayout` builds the master application shell:
- **Top Navbar (Fixed 64px):** Displays logo, system global search bar, quick navigation buttons, dark/light theme switch, notifications trigger, and user profile menu with logout trigger.
- **Left Sidebar (Fixed 192px):** Displays primary navigation links grouped by category (Management, Analytics, System). Features dynamic mode-switching: when inspecting a specific project (`/projects/:projectId/*`), the sidebar automatically switches to Project Navigation mode (Overview, Layout Map, Plots, Customers, Brokers, Payments, Documents, Analytics, Settings) with a top back-arrow button to return to global view.
- **Main Viewport:** Scrollable container executing nested page components via React Router `<Outlet />`.

---

### Hooks
- `useAuth.js` (`src/hooks/useAuth.js`, `src/auth/useAuth.js`): Accesses `AuthContext` to consume authentication status, active user payload, login/logout functions, `hasRole()`, and `hasPermission()`.
- `useTheme.js` (`src/hooks/useTheme.js`): Accesses `ThemeContext` to toggle between `light` and `dark` visual themes.

---

### Contexts
- `AuthContext.jsx` (`src/auth/AuthContext.jsx`): Provides authentication state, loading state, user token, and authorization helper methods across the React tree.
- `ThemeContext.jsx` (`src/contexts/ThemeContext.jsx`): Manages application theme (`light`/`dark`), applying tokens directly to `document.documentElement` (`class="dark"` and data attributes).

---

### Services
- `authService.js` (`src/auth/authService.js`, `src/services/auth.service.js`): Encapsulates authentication calls (`login`, `logout`, `refresh`, `getCurrentUser`, `requestPasswordReset`). Operates against mock user database with simulated 500ms latency.
- `projectService.js` (`src/services/projectService.js`): Provides CRUD operations for Projects (`getProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject`) with `localStorage` fallback persistence.
- `plotService.js` (`src/services/plotService.js`): Provides plot CRUD operations (`getPlotsByProject`, `getPlotById`, `updatePlot`, `getProjectStats`, customer/broker name lookups) with `localStorage` fallback persistence.

---

### Utilities
- `storage.js` (`src/utils/storage.js`): Abstraction over browser `localStorage` and `sessionStorage` for storing tokens, user JSON, and session preferences.
- `formatters.js` (`src/utils/formatters.js`): Currency formatting (converting amounts into Indian Rupees ₹, Lakhs L, and Crores Cr), date formatting, and status pill style helpers.
- `dCardStyles.js` (`src/pages/Dashboard/components/dCardStyles.js`): Shared JavaScript object defining flat card border, padding, and font-size tokens.

---

### Style System Architecture
The application uses the **OneStopAnalytics Design System**, built with CSS design tokens and Tailwind CSS v4:
- **`src/styles/tokens.css`:** Defines all global CSS variables prefixed with `--df-*` for both `:root` (light mode) and `.dark` (dark mode):
  - Primary Accent (Burgundy): `#7A1E3A`
  - Secondary Accent (Gold): `#C9A87C`
  - Fixed Top Navbar Height: `64px`
  - Fixed Left Sidebar Width: `192px`
  - Card Border: `1px solid rgba(0, 0, 0, 0.07)`
  - Card Border Radius: `6px`
  - Card Shadow: `none` (flat design)
- **`src/styles/global.css`:** Standard CSS reset, base body styles, Inter font definitions, custom thin scrollbar styling, and smooth scrolling.
- **`src/styles/utilities.css`:** Custom animation keyframes (`landos-spin`, `landos-shimmer`, `landos-modal-in`, `landos-drawer-right`, `landos-drawer-left`), frosted glass utility classes, and table row hover effects.
- **`src/styles/index.css`:** Entry point combining tokens, global styles, utilities, and Tailwind `@theme` configuration.

---

### Routing Mechanism
Routing is managed by `React Router v7` using `<BrowserRouter>` wrapping `<AppRoutes>` in `src/routes/index.jsx`.
- **Public Routes:** Render directly without authentication checks.
- **Protected Routes:** Encapsulated inside `<ProtectedRoute>`, which renders `<ContentLayout>` only when `useAuth().isAuthenticated` evaluates to `true`.
- **Nested Project Workspace:** The route `/projects/:projectId/*` uses wildcard matching. Inside `ProjectWorkspace/index.jsx`, the active sub-tab (Overview, LayoutMap, PlotsTable, etc.) is derived from the sub-path location, maintaining layout state without full page refreshes.

---

### Authentication Flow

```
1. Initial App Mount
   └── AuthProvider executes initAuth()
       ├── Reads 'landos_auth_token' & 'landos_user' from storage.js
       └── Calls authService.getCurrentUser() to confirm session validity.

2. Access Unauthenticated Protected Route
   └── ProtectedRoute detects isAuthenticated == false
       └── Redirects to /login (saving target URL in location.state.from).

3. Login Execution
   └── User submits form on /login
       ├── AuthContext calls authService.login({ email, password, rememberMe })
       ├── Simulated 500ms delay executes
       ├── Validates credentials against MOCK_USERS array
       ├── Generates mock JWT token: "mock-jwt-admin-..."
       ├── Stores user payload & token in localStorage via storage.js
       └── Returns user object to AuthContext.

4. Session Restoration & Redirection
   └── AuthContext updates state (isAuthenticated = true)
       └── ProtectedRoute allows passage and navigates user to target page or /dashboard.

5. Logout Execution
   └── User clicks "Sign Out" in Header
       ├── AuthContext calls authService.logout()
       ├── Clears localStorage via storage.clearSession()
       └── Resets user/token state to null (triggering automatic redirect to /login).
```

---

# 3. Current Backend

### Backend Status
> **CRITICAL STATEMENT:** A production backend does **NOT** exist at this time.

The backend infrastructure currently consists of:
1. A minimal Python entry point `main.py` located at the root of the project directory.
2. A skeleton folder `backend/` containing empty placeholder directories (`services/` and `uploads/`) and a legacy `node_modules` folder.

---

### Backend Inspection Details
- **Folder Structure:**
  ```
  backend/
  ├── node_modules/         # Legacy/unused npm packages inside backend folder
  ├── package-lock.json     # Node package lock file
  ├── services/             # Empty directory (0 files)
  └── uploads/              # Empty directory (0 files)
  ```
- **Framework:** FastAPI (Python) initialized in root `main.py`.
- **Database:** None. No connection string, database driver (e.g., `asyncpg`, `psycopg2`), or database engine is configured.
- **ORM:** None. No ORM framework (e.g., SQLAlchemy, Tortoise-ORM, Prisma) is installed or defined.
- **Authentication:** None. No backend JWT verification, password hashing (`passlib`/`bcrypt`), or OAuth2 scheme is implemented.
- **Services:** None. The `backend/services/` directory is completely empty.
- **API Routes:** A single test route defined in `main.py`:
  ```python
  from fastapi import FastAPI

  app = FastAPI()

  @app.get("/")
  def read_root():
      return {"Hello": "World"}
  ```
- **Middlewares:** None. No CORS (`CORSMiddleware`), request logging, or security middlewares are configured.
- **Storage Layer:** Local directory `backend/uploads/` exists but contains no code, file upload handlers, or cloud S3 drivers.

---

# 4. Current Database

### Data Models (Frontend Mock Schemas)
Because a database does not exist, all data models are currently defined as JSON structures in `src/data/` and JavaScript objects in `authService.js`.

#### 1. `User` Schema (`src/auth/authService.js`)
```json
{
  "id": "usr_admin_01",
  "name": "Alexander Wright",
  "email": "admin@landos.com",
  "password": "admin123",
  "role": "admin",
  "avatar": "https://images.unsplash.com/photo-...",
  "permissions": ["*"]
}
```

#### 2. `Project` Schema (`src/data/projects.json`)
```json
{
  "id": "proj_001",
  "name": "Sunrise Valley Phase 1",
  "type": "Residential",
  "status": "Active",
  "location": "Pune, Maharashtra",
  "developer": "Sunrise Infra Ltd",
  "totalPlots": 120,
  "soldPlots": 87,
  "availablePlots": 33,
  "revenue": 43500000,
  "totalArea": "45 Acres",
  "priceRange": "₹25L – ₹80L",
  "startDate": "2024-01-15",
  "expectedCompletion": "2026-06-30",
  "thumbnail": null,
  "layoutUploaded": true,
  "createdAt": "2024-01-10T08:00:00Z",
  "updatedAt": "2025-07-01T12:00:00Z"
}
```

#### 3. `Plot` Schema (`src/data/plots.json`)
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

#### 4. `Customer` Schema (`src/data/customers.json`)
```json
{
  "id": "cust_001",
  "name": "Rajesh Kumar",
  "phone": "+91 98230 12345",
  "email": "rajesh.kumar@gmail.com",
  "city": "Pune",
  "bookedPlots": ["plot_001"],
  "totalPaid": 1500000,
  "outstanding": 1000000,
  "status": "Active",
  "createdAt": "2024-02-10T10:00:00Z"
}
```

#### 5. `Broker` Schema (`src/data/brokers.json`)
```json
{
  "id": "brk_001",
  "name": "Amit Sharma",
  "phone": "+91 98900 55443",
  "email": "amit.sharma@realty.com",
  "reraId": "A52100012345",
  "commissionRate": 2.5,
  "projects": ["proj_001", "proj_002"],
  "totalDeals": 14,
  "commissionEarned": 875000,
  "commissionPending": 125000,
  "status": "Active",
  "createdAt": "2024-01-05T08:00:00Z"
}
```

#### 6. `Payment` Schema (`src/data/payments.json`)
```json
{
  "id": "pay_001",
  "projectId": "proj_001",
  "plotId": "plot_001",
  "customerId": "cust_001",
  "brokerId": "brk_001",
  "type": "Down Payment",
  "amount": 500000,
  "dueDate": "2024-02-15",
  "paidDate": "2024-02-12",
  "mode": "Bank Transfer",
  "status": "Completed",
  "receiptNo": "REC-2024-001",
  "notes": "Initial booking deposit"
}
```

#### 7. `Document` Schema (`src/data/documents.json`)
```json
{
  "id": "doc_001",
  "title": "Master Layout Plan — Sunrise Valley",
  "category": "Project",
  "fileType": "PDF",
  "fileSize": "4.2 MB",
  "uploadedBy": "Alexander Wright",
  "uploadedAt": "2024-01-16T11:30:00Z",
  "projectId": "proj_001",
  "customerId": null,
  "brokerId": null,
  "url": "/documents/sunrise_valley_layout.pdf"
}
```

---

### Entity Relationships

```
┌─────────────┐        1:N        ┌──────────────┐
│   Project   │ ────────────────> │     Plot     │
└─────────────┘                   └──────────────┘
                                    │          │
                       N:1 (Bought) │          │ N:1 (Sourced)
                                    ▼          ▼
                             ┌──────────┐  ┌──────────┐
                             │ Customer │  │  Broker  │
                             └──────────┘  └──────────┘
                                  │             │
                    1:N (Payments)│             │ 1:N (Commissions)
                                  ▼             ▼
                             ┌────────────────────────┐
                             │        Payment         │
                             └────────────────────────┘
```

- **Project to Plot (1:N):** One project contains multiple partitioned plots.
- **Customer to Plot (1:N):** A customer can purchase or reserve multiple plots across projects.
- **Broker to Plot (1:N):** A broker can manage the sale of multiple plots.
- **Plot to Payment (1:N):** A plot transaction generates multiple payment installments (Down Payment, EMIs, Final Clearance).
- **Entities to Document (1:N):** Projects, Customers, Brokers, and Payments can have multiple legal attachments.

---

### Missing Production Tables
1. `users` (User credentials, password hashes, security salts).
2. `roles` & `permissions` (Normalised RLS authorization schema).
3. `audit_logs` (System activity logging for financial compliance).
4. `leads` & `lead_activities` (CRM pre-sales funnel).
5. `payment_schedules` (Structured EMI amortization tables).
6. `broker_payouts` (Detailed commission disbursement records).

---

### Current Migrations & Mock Data
- **Migrations:** None. No database migration engine (e.g., Alembic) is configured.
- **Mock Data State:** JSON files in `src/data/` serve as initial seed data. Mutation methods in `projectService.js` and `plotService.js` write back to `localStorage` under keys `landos_projects_data` and `landos_plots_data`.

---

# 5. Current Authentication

### Roles & Permissions Structure
Currently configured as a lightweight mock authorization layer in `src/auth/authService.js` and `src/auth/AuthProvider.jsx`.

- **Configured Roles:**
  - `admin` (Full system access, assigned permissions `['*']`).
  - *Planned future roles:* `manager`, `agent`, `accountant`, `viewer`.
- **Role Verification:** Implemented via `hasRole(roleName)` in `useAuth()`. Supports single string roles or arrays of allowed roles.
- **Permission Verification:** Implemented via `hasPermission(permissionName)` in `useAuth()`. Evaluates wildcard `*` or arrays of required capabilities.

---

### JWT Handling
- On successful login, `authService.login()` generates a synthetic JWT string:
  `mock-jwt-admin-${timestamp}-${randomString}`
- The token is passed back to `AuthContext` and stored in browser storage via `storage.setSession(token, user, rememberMe)`.
- No token decoding, signature validation, or expiration claims are currently performed.

---

### Protected Routes
Protected routes are guarded using `<ProtectedRoute>` in `src/routes/index.jsx`:
- Checks `isAuthenticated` status from `useAuth()`.
- If unauthenticated, blocks access and redirects to `/login`, preserving the requested path in `state: { from: location }`.
- If role restrictions (`requiredRole`) or permission restrictions (`requiredPermission`) are specified, verifies authorization before rendering child routes.

---

### Session Handling
- **Storage Mechanics:** Session persistence is managed by `storage.js`.
  - If `rememberMe = true`, credentials (`landos_auth_token` and `landos_user`) are saved in `localStorage`.
  - If `rememberMe = false`, credentials are saved in `sessionStorage`.
- **Session Restoration:** On app startup, `AuthProvider` initializes session state by reading storage and verifying session presence via `authService.getCurrentUser()`.

---

# 6. Project Module Status

| Module Name | Status | Implementation Details |
|---|---|---|
| **Authentication** | ✅ **Completed** | Login UI, Forgot Password, Protected Routes, AuthContext, mock token persistence. |
| **Design System & Components** | ✅ **Completed** | 17 reusable UI components, CSS token architecture (`--df-*`), Component Showcase page. |
| **App Shell & Layout** | ✅ **Completed** | Fixed Top Navbar (64px), fixed Left Sidebar (192px), dynamic project mode switching. |
| **Executive Dashboard** | ✅ **Completed** | KPI banner strip, Recharts revenue & plot donut charts, active project tables, timeline feed. |
| **Projects Module** | ✅ **Completed** | Projects list (Grid/Table), status filtering, search, multi-step Create Project wizard, Delete modal. |
| **Project Workspace** | ✅ **Completed** | 9-tab sidebar navigation, Overview KPIs, Project Settings tab, Project sub-views. |
| **Plots Management** | ✅ **Completed** | Spreadsheet plot table, color-coded status pills, slide-over `PlotDrawer` with price/status editing. |
| **Layout Map (Visualization)** | ✅ **Completed** | Interactive plot status grid matrix with detail popup modals. |
| **Customers Module** | 🟡 **In Progress** | Scoped project customer table implemented; Global Registry (`/customers`) is placeholder stub. |
| **Brokers Module** | 🟡 **In Progress** | Scoped project broker table & leaderboard implemented; Global Registry (`/brokers`) is placeholder stub. |
| **Payments Module** | 🟡 **In Progress** | Dashboard transaction feed & project payment table implemented; Global Center (`/payments`) is placeholder stub. |
| **Documents Module** | 🟡 **In Progress** | Dashboard document feed & project document table implemented; Global Locker (`/documents`) is placeholder stub. |
| **Analytics Module** | 🟡 **In Progress** | Executive charts & project analytics tab implemented; Global BI Center (`/analytics`) is placeholder stub. |
| **Settings Module** | 🟡 **In Progress** | Project settings tab implemented; Global App Settings (`/settings`) is placeholder stub. |
| **Notifications** | 🔴 **Not Started** | Header bell icon stub exists; backend notification queue and push alerts not implemented. |
| **GIS / Interactive Maps** | 🔴 **Not Started** | Grid matrix exists in LayoutMap; interactive vector SVG canvas map editor not started. |
| **AI Engine** | 🔴 **Not Started** | No AI features, pricing predictions, or natural language query tools integrated. |

---

# 7. Existing APIs

| Endpoint Path | Method | Purpose | Request Payload | Response Payload | Type |
|---|---|---|---|---|---|
| `POST /api/v1/auth/login` | POST | Authenticate user & issue token | `{ email, password, rememberMe }` | `{ user, token }` | **Mock** (`authService.js`) |
| `POST /api/v1/auth/logout` | POST | Invalidate active user session | *None* | `{ success: true }` | **Mock** (`authService.js`) |
| `POST /api/v1/auth/refresh` | POST | Refresh expired session token | *None* (reads storage token) | `{ user, token }` | **Mock** (`authService.js`) |
| `GET /api/v1/auth/me` | GET | Retrieve authenticated user profile | *None* (reads storage token) | User object or `null` | **Mock** (`authService.js`) |
| `POST /api/v1/auth/forgot-password` | POST | Send password reset email | `{ email }` | `{ success: true, message }` | **Mock** (`authService.js`) |
| `GET /api/v1/projects` | GET | Fetch all real estate projects | *None* | `Array<Project>` | **Mock** (`projectService.js`) |
| `GET /api/v1/projects/:id` | GET | Fetch single project details | *URL param: id* | `Project` object | **Mock** (`projectService.js`) |
| `POST /api/v1/projects` | POST | Create new project entry | `ProjectInput` object | Created `Project` object | **Mock** (`projectService.js`) |
| `PUT /api/v1/projects/:id` | PUT | Update existing project details | `URL param: id`, `updates` | Updated `Project` object | **Mock** (`projectService.js`) |
| `DELETE /api/v1/projects/:id` | DELETE | Delete project entry | *URL param: id* | `{ success: true, id }` | **Mock** (`projectService.js`) |
| `GET /api/v1/plots?projectId=:id` | GET | Fetch all plots for a project | *Query param: projectId* | `Array<Plot>` | **Mock** (`plotService.js`) |
| `GET /api/v1/plots/:id` | GET | Fetch single plot details | *URL param: id* | `Plot` object | **Mock** (`plotService.js`) |
| `PUT /api/v1/plots/:id` | PUT | Update plot status/price/assignment | `URL param: id`, `updates` | Updated `Plot` object | **Mock** (`plotService.js`) |
| `GET /api/v1/plots/stats?projectId=:id` | GET | Aggregate plot counts & revenue | *Query param: projectId* | `{ total, sold, reserved... }` | **Mock** (`plotService.js`) |
| `GET /` | GET | Root backend connectivity test | *None* | `{"Hello": "World"}` | 🟢 **Real** (`main.py`) |

---

# 8. State Management

- **React Context:** Used exclusively for global application state:
  - `AuthContext.jsx`: Manages authentication state (`user`, `token`, `isAuthenticated`, `loading`).
  - `ThemeContext.jsx`: Manages light/dark theme preference and updates DOM root classes.
- **TanStack Query (React Query):** Not installed. Data fetching currently uses direct promises and `useEffect` state synchronization.
- **Redux / Zustand:** Explicitly omitted per Phase 2 architecture decisions. The application avoids complex global state stores.
- **Local Persistence Stores:** Data persistence across page reloads is handled by local storage sync wrappers (`storage.js`, `projectService.js`, `plotService.js`). Mutations update both in-memory arrays and `localStorage`.
- **Caching Strategy:** Service files maintain in-memory fallbacks and sync directly with browser `localStorage`. No server HTTP caching headers or query invalidation hooks exist yet.

---

# 9. Current Folder Tree

```
LandOS/
├── .git/
├── .gitignore
├── DEVLOG.md
├── LANDOS_ARCHITECTURE_REPORT.md
├── README.md
├── WORKFLOW.md
├── main.py
├── venv/
│
├── backend/
│   ├── package-lock.json
│   ├── node_modules/
│   ├── services/
│   └── uploads/
│
└── frontend/
    ├── .oxlintrc.json
    ├── ARCHITECTURE.md
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── vite.config.js
    ├── dist/
    ├── public/
    └── src/
        ├── App.jsx
        ├── main.jsx
        │
        ├── assets/
        │   ├── icons/
        │   ├── images/
        │   └── logos/
        │
        ├── auth/
        │   ├── AuthContext.jsx
        │   ├── AuthProvider.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── authService.js
        │   └── useAuth.js
        │
        ├── components/
        │   └── ui/
        │       ├── index.js
        │       ├── Avatar/
        │       │   └── index.jsx
        │       ├── Badge/
        │       │   └── index.jsx
        │       ├── Button/
        │       │   └── index.jsx
        │       ├── Card/
        │       │   └── index.jsx
        │       ├── Drawer/
        │       │   └── index.jsx
        │       ├── Dropdown/
        │       │   └── index.jsx
        │       ├── EmptyState/
        │       │   └── index.jsx
        │       ├── Input/
        │       │   └── index.jsx
        │       ├── Loader/
        │       │   └── index.jsx
        │       ├── Modal/
        │       │   └── index.jsx
        │       ├── Pagination/
        │       │   └── index.jsx
        │       ├── SearchInput/
        │       │   └── index.jsx
        │       ├── Select/
        │       │   └── index.jsx
        │       ├── Table/
        │       │   └── index.jsx
        │       ├── Tabs/
        │       │   └── index.jsx
        │       ├── Toast/
        │       │   └── index.jsx
        │       └── Tooltip/
        │           └── index.jsx
        │
        ├── contexts/
        │   └── ThemeContext.jsx
        │
        ├── data/
        │   ├── analytics.json
        │   ├── brokers.json
        │   ├── customers.json
        │   ├── documents.json
        │   ├── payments.json
        │   ├── plots.json
        │   └── projects.json
        │
        ├── hooks/
        │   ├── useAuth.js
        │   └── useTheme.js
        │
        ├── layouts/
        │   └── ContentLayout.jsx
        │
        ├── pages/
        │   ├── ComponentsShowcase.jsx
        │   ├── Analytics/
        │   │   └── index.jsx
        │   ├── Brokers/
        │   │   └── index.jsx
        │   ├── Customers/
        │   │   └── index.jsx
        │   ├── Dashboard/
        │   │   ├── index.jsx
        │   │   └── components/
        │   │       ├── ActiveProjectsTable.jsx
        │   │       ├── ActivityTimeline.jsx
        │   │       ├── BrokerLeaderboard.jsx
        │   │       ├── KpiBanner.jsx
        │   │       ├── KpiGrid.jsx
        │   │       ├── PlotDistributionChart.jsx
        │   │       ├── QuickActionsGrid.jsx
        │   │       ├── RecentDocuments.jsx
        │   │       ├── RecentPayments.jsx
        │   │       ├── RevenueChart.jsx
        │   │       ├── WelcomeHeader.jsx
        │   │       └── dCardStyles.js
        │   ├── Documents/
        │   │   └── index.jsx
        │   ├── Login/
        │   │   └── index.jsx
        │   ├── Payments/
        │   │   └── index.jsx
        │   ├── Projects/
        │   │   ├── DeleteProjectModal.jsx
        │   │   ├── ProjectCard.jsx
        │   │   ├── ProjectFilters.jsx
        │   │   ├── ProjectForm.jsx
        │   │   ├── ProjectTable.jsx
        │   │   ├── ProjectToolbar.jsx
        │   │   ├── ProjectsList.jsx
        │   │   ├── CreateProject/
        │   │   │   └── index.jsx
        │   │   ├── ProjectList/
        │   │   │   └── index.jsx
        │   │   ├── ProjectWorkspace/
        │   │   │   ├── index.jsx
        │   │   │   ├── components/
        │   │   │   │   └── PlotDrawer.jsx
        │   │   │   └── tabs/
        │   │   │       ├── LayoutMap.jsx
        │   │   │       ├── Overview.jsx
        │   │   │       ├── PlotsTable.jsx
        │   │   │       ├── ProjectAnalytics.jsx
        │   │   │       ├── ProjectBrokers.jsx
        │   │   │       ├── ProjectCustomers.jsx
        │   │   │       ├── ProjectDocuments.jsx
        │   │   │       ├── ProjectPayments.jsx
        │   │   │       └── ProjectSettings.jsx
        │   │   └── components/
        │   │       └── dCardStyles.js
        │   ├── Settings/
        │   │   └── index.jsx
        │   └── auth/
        │       ├── ForgotPassword.jsx
        │       └── Login.jsx
        │
        ├── routes/
        │   └── index.jsx
        │
        ├── services/
        │   ├── auth.service.js
        │   ├── plotService.js
        │   └── projectService.js
        │
        ├── styles/
        │   ├── global.css
        │   ├── index.css
        │   ├── tokens.css
        │   └── utilities.css
        │
        └── utils/
            ├── formatters.js
            └── storage.js
```

---

# 10. Existing Design System

### Design Tokens & Palette (`OneStopAnalytics`)
- **Primary Brand Accent (Burgundy):** `#7A1E3A`
- **Secondary Brand Accent (Gold):** `#C9A87C`
- **Surface & Backgrounds:**
  - Light Background: `#F8FAFC`
  - Light Surface (Cards): `#FFFFFF`
  - Dark Panel / Navbar: `#0F172A`
  - Card Border: `1px solid rgba(0, 0, 0, 0.07)`
- **Typography:**
  - Primary Font Family: `Inter`, -apple-system, sans-serif.
  - Tabular / Monospace Font: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`. Used strictly for plot numbers, currency formatting (₹), and financial percentages.
- **Spacing Grid:**
  - 4px base spacing system.
  - Compact padding standards: Cards header (`8px 12px`), Card content (`10px 12px`), Table headers (`7px 12px`), Table cells (`8px 12px`).
- **Reusable UI Component Palette:** 17 atomic UI primitives in `src/components/ui/` guaranteeing consistent borders, focus rings, hover transitions, and dark-mode adaptation.

---

# 11. Third Party Libraries

### Frontend Dependencies (`frontend/package.json`)

| Library Name | Version | Primary Purpose | Recommendation | Rationale |
|---|---|---|---|---|
| `react` | `^19.2.7` | UI component tree library | **Keep** | Core application dependency. |
| `react-dom` | `^19.2.7` | DOM rendering engine | **Keep** | Required by React. |
| `react-router-dom` | `^7.18.1` | Client-side routing engine | **Keep** | Core routing framework. |
| `recharts` | `^3.10.0` | Dashboard SVG analytics charting | **Keep** | Lightweight, highly customizable charting. |
| `lucide-react` | `^1.25.0` | SVG icons set | **Keep** | Standardized icon library. |
| `@tailwindcss/vite` | `^4.3.3` | Tailwind CSS compiler plugin | **Keep** | Required for Tailwind v4 build integration. |
| `tailwindcss` | `^4.3.3` | Utility-first CSS framework | **Keep** | High speed styling system. |
| `@types/react` | `^19.2.17` | TypeScript definitions | **Keep** | Helps IDE autocomplete. |
| `@types/react-dom` | `^19.2.3` | TypeScript DOM definitions | **Keep** | Helps IDE autocomplete. |
| `@vitejs/plugin-react` | `^6.0.3` | React HMR plugin for Vite | **Keep** | Required by Vite build pipeline. |
| `oxlint` | `^1.71.0` | JavaScript/JSX linter | **Keep** | Fast linting tool. |
| `vite` | `^8.1.1` | Development server & bundler | **Keep** | Core build tool. |

### Backend Dependencies (`venv`)

| Library Name | Primary Purpose | Recommendation | Rationale |
|---|---|---|---|
| `fastapi` | High-performance Python web framework | **Keep & Expand** | Excellent speed, async support, and automatic OpenAPI generation. |
| `uvicorn` | ASGI server implementation | **Keep** | Standard production server for FastAPI. |

---

# 12. Missing Features (Pre-Production Requirements)

Before LandOS can be deployed to a production environment, the following features must be built:

1. **Full Production FastAPI Backend API:** Real HTTP REST API endpoints covering Auth, Projects, Plots, Customers, Brokers, Payments, Documents, and Analytics.
2. **PostgreSQL Relational Database:** Production database instance with foreign key constraints, indexes on search fields (`plot_no`, `customer_id`, `rera_id`), and ACID compliance.
3. **Database Migration Pipeline (Alembic):** Version-controlled schema migrations.
4. **Secure JWT & Role-Based Access Control (RBAC):** Real password hashing (Bcrypt/Argon2), HTTP-only secure cookie storage, refresh token rotation, and FastAPI dependency injection security guards (`Depends(get_current_user)`).
5. **Global Customer Registry Module (`/customers`):** Complete customer database, customer creation/edit modals, customer detailed profiles (`/customers/:id`), and payment history aggregation.
6. **Global Broker Registry Module (`/brokers`):** Complete broker directory, commission rate configurations, payout ledgers, and referral tracking.
7. **Global Financial Payment Center (`/payments`):** Transaction posting, PDF receipt generation, automated overdue EMI alerts, and payment gateway integration (e.g. Razorpay, UPI QR codes).
8. **Global Document Vault (`/documents`):** Cloud storage integration (AWS S3 / Azure Blob), document upload signed URLs, automated PDF agreement generation (Sale Agreement, Possession Letter).
9. **Interactive Vector GIS Layout Visualizer:** Vector canvas / SVG parser allowing developers to upload site CAD/SVG maps and bind interactive status colors directly to plot coordinates.
10. **Automated Testing Suite:** Unit tests (Vitest / Pytest) and End-to-End browser tests (Playwright).

---

# 13. Technical Debt & Codebase Vulnerabilities

### Architectural Debt
1. **Frontend-Backend Decoupling Deficit:** Service layers (`projectService.js`, `plotService.js`, `authService.js`) currently manipulate `localStorage` and use `setTimeout` delays. When connecting to FastAPI, these services must be completely rewritten to use an HTTP client (e.g., Axios).
2. **Legacy Folder in Backend:** The `backend/` directory contains an unnecessary `node_modules` folder and `package-lock.json`, stemming from a scaffolding mistake. This should be cleaned up.
3. **Standalone Learning Script at Root:** `main.py` sits in the project root directory rather than inside `backend/app/main.py`.

### Code Duplication
1. **Inline Style Constants (`dCardStyles.js`):** Flat card styles are duplicated across `src/pages/Dashboard/components/dCardStyles.js` and `src/pages/Projects/components/dCardStyles.js` instead of being consolidated strictly in `tokens.css`.
2. **Tabular Mock Data Duplication:** `customers.json` and `brokers.json` contain redundant data fields that overlap with inline lookup helpers inside `plotService.js`.

### Missing Validations & Error Handling
1. **Form Validation Absence:** Multi-step project wizard (`CreateProject`) and plot drawer (`PlotDrawer`) use basic HTML input attributes without schema validation libraries (such as Zod or Yup).
2. **Silent Failure in Services:** `storage.js`, `projectService.js`, and `plotService.js` suppress `localStorage` exceptions with empty `catch (e) {}` blocks.
3. **Lack of Error Boundaries:** No global React Error Boundary (`ErrorBoundary`) exists to gracefully handle component rendering errors.

### Missing Testing
1. **Zero Test Coverage:** The repository currently contains zero unit tests, component tests, or integration tests.

---

# 14. Architecture Recommendations

> **IMPORTANT:** These recommendations are strictly architectural guidelines for the upcoming Backend & Integration Phase. No code modifications or generation should take place during this phase.

### 1. Re-structure Backend into a Layered Architecture
Move `main.py` into a structured backend repository:
```
backend/
├── app/
│   ├── main.py                 # FastAPI application factory
│   ├── core/                   # Security, config, database session
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── models/                 # SQLAlchemy 2.0 ORM Models
│   │   ├── project.py
│   │   ├── plot.py
│   │   ├── customer.py
│   │   ├── broker.py
│   │   └── payment.py
│   ├── schemas/                # Pydantic v2 validation schemas
│   ├── api/                    # API Route Controllers (v1)
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── projects.py
│   │       │   ├── plots.py
│   │       │   ├── customers.py
│   │       │   └── payments.py
│   │       └── api.py
│   └── services/               # Core business logic layer
├── alembic/                    # DB Migration scripts
├── requirements.txt
└── pyproject.toml
```

### 2. Adopt TanStack Query (React Query v5) on Frontend
Replace the custom `setTimeout` mock service functions with `TanStack Query`. This provides:
- Automatic background refetching and caching.
- Optimistic UI updates when editing plot statuses or prices.
- Standardized loading and error states across all components.

### 3. Implement Centralized Axios HTTP Client
Create `src/services/api.js` featuring:
- Request interceptors to append `Authorization: Bearer <token>` headers automatically.
- Response interceptors to intercept `401 Unauthorized` responses and initiate silent refresh token attempts before redirecting to `/login`.

### 4. Integrate Form Schema Validation (Zod + React Hook Form)
Replace native form inputs with `react-hook-form` bound to `zod` schemas. This ensures client-side validation logic matches backend Pydantic validation schemas.

### 5. Setup Comprehensive Testing Suite
- **Frontend:** Install `Vitest` and `React Testing Library` for testing UI components and service adapters.
- **Backend:** Setup `Pytest` with `httpx` for testing FastAPI endpoints against an isolated PostgreSQL test database.

---

*End of LandOS System Architecture Report.*
