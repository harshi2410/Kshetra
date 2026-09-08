# LandOS — Frontend Architecture
### Phase 2.0 | Frozen on: 2025-07-19

> This document is the **single source of truth** for the LandOS frontend.
> Nothing here changes without a conscious decision.

---

## 1. Folder Structure

```
frontend/
│
├── public/                     # Static assets (favicon, og-image, robots.txt)
│
├── src/
│   │
│   ├── assets/
│   │   ├── images/             # JPG, PNG, WebP images
│   │   ├── icons/              # SVG icon files
│   │   └── logos/              # LandOS brand logos
│   │
│   ├── components/             # Reusable global UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   ├── Card/
│   │   ├── Table/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── SearchBar/
│   │   ├── Filter/
│   │   ├── Pagination/
│   │   ├── Loader/
│   │   ├── EmptyState/
│   │   ├── Toast/
│   │   ├── Dialog/
│   │   └── Tooltip/
│   │
│   ├── layouts/                # App shell layout components
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── ContentLayout/
│   │   ├── PageContainer/
│   │   ├── SectionHeader/
│   │   ├── Breadcrumb/
│   │   └── ThemeProvider/
│   │
│   ├── pages/                  # Top-level route pages
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Projects/
│   │   │   ├── ProjectList/
│   │   │   ├── CreateProject/
│   │   │   └── ProjectWorkspace/
│   │   │       ├── Overview/
│   │   │       ├── LayoutMap/
│   │   │       ├── Plots/
│   │   │       ├── Customers/
│   │   │       ├── Brokers/
│   │   │       ├── Payments/
│   │   │       ├── Documents/
│   │   │       ├── Analytics/
│   │   │       └── Settings/
│   │   ├── Customers/
│   │   ├── Brokers/
│   │   ├── Payments/
│   │   ├── Documents/
│   │   ├── Analytics/
│   │   └── Settings/
│   │
│   ├── routes/
│   │   └── index.jsx           # Centralized route definitions
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useTheme.js
│   │   ├── useToast.js
│   │   └── useModal.js
│   │
│   ├── services/               # API call functions (future backend)
│   │   ├── projectService.js
│   │   ├── customerService.js
│   │   ├── brokerService.js
│   │   ├── paymentService.js
│   │   ├── documentService.js
│   │   └── analyticsService.js
│   │
│   ├── utils/                  # Helper/utility functions
│   │   ├── formatCurrency.js
│   │   ├── formatDate.js
│   │   ├── validators.js
│   │   └── constants.js
│   │
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── ToastContext.jsx
│   │
│   ├── styles/                 # Global styles & design tokens
│   │   ├── tokens.css          # Design tokens (colors, spacing, radius)
│   │   ├── global.css          # Global reset + base styles
│   │   └── utilities.css       # Shared utility classes
│   │
│   ├── data/                   # Mock JSON data (replaced by API calls later)
│   │   ├── projects.json       ✅ Created
│   │   ├── customers.json      ✅ Created
│   │   ├── brokers.json        ✅ Created
│   │   ├── payments.json       ✅ Created
│   │   ├── documents.json      ✅ Created
│   │   └── analytics.json      ✅ Created
│   │
│   ├── App.jsx                 # Root component with route config
│   └── main.jsx                # Vite entry point
│
├── index.html                  # HTML shell
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 2. Routing Structure

```
/                           → Redirect to /login or /dashboard
/login                      → Login Page (public)
/dashboard                  → Main Dashboard (protected)
/projects                   → Project List (protected)
/projects/new               → Create Project Wizard (protected)
/projects/:projectId        → Project Workspace (protected)
/projects/:projectId/layout → Interactive Layout Map
/projects/:projectId/plots  → Plot Management
/customers                  → Global Customer List
/brokers                    → Global Broker List
/payments                   → Global Payments View
/documents                  → Global Documents View
/analytics                  → Global Analytics
/settings                   → App Settings

— Future (Phase 3+) —
/profile
/notifications
/help
```

### Route Guards
- All routes except `/login` are **protected** (require auth)
- Auth state stored in `AuthContext`
- Redirect unauthenticated users to `/login`

---

## 3. Application Layout

```
┌─────────────────────────────────────────────────────────┐
│                        Header                           │
│  Logo    |  Breadcrumb    |  Notifications  |  Avatar   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │              Workspace                       │
│          │                                              │
│ Nav      │  <PageContainer>                             │
│ Items    │    <SectionHeader />                         │
│          │    <Outlet />   (React Router)               │
│          │  </PageContainer>                            │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

---

## 4. Global Components

Each component lives in `src/components/<ComponentName>/index.jsx`

| Component    | Props / Variants                                     |
|--------------|------------------------------------------------------|
| `Button`     | variant: primary, secondary, ghost, danger; size: sm, md, lg |
| `Input`      | type, label, error, placeholder, icon               |
| `Select`     | options, label, error, multi                        |
| `Modal`      | isOpen, onClose, title, children, size              |
| `Card`       | variant: default, elevated, flat; padding           |
| `Table`      | columns, data, sortable, pagination                 |
| `Badge`      | variant: success, warning, danger, info, neutral    |
| `Avatar`     | name, src, size: sm, md, lg                         |
| `SearchBar`  | placeholder, onChange, debounce                     |
| `Filter`     | filters config, onChange                            |
| `Pagination` | total, page, pageSize, onChange                     |
| `Loader`     | size, fullscreen, overlay                           |
| `EmptyState` | icon, title, description, action                   |
| `Toast`      | type: success, error, warning, info; message        |
| `Dialog`     | Confirm dialogs with title, message, onConfirm      |
| `Tooltip`    | content, position: top, bottom, left, right         |

---

## 5. Layout Components

| Component       | Purpose                                              |
|-----------------|------------------------------------------------------|
| `Header`        | Top nav: logo, breadcrumb, notifications, user menu  |
| `Sidebar`       | Left nav: links, project switcher, collapse toggle   |
| `ContentLayout` | Wraps Header + Sidebar + Outlet                      |
| `PageContainer` | Max-width, padding wrapper for page content          |
| `SectionHeader` | Page title + subtitle + action buttons               |
| `Breadcrumb`    | Hierarchical path display                            |
| `ThemeProvider` | Injects CSS tokens, manages light/dark               |

---

## 6. Pages & Sub-pages

### Top-Level Pages
| Page           | Route                   | Component Path           |
|----------------|-------------------------|--------------------------|
| Login          | `/login`                | `pages/Login/`           |
| Dashboard      | `/dashboard`            | `pages/Dashboard/`       |
| Projects       | `/projects`             | `pages/Projects/ProjectList/` |
| Create Project | `/projects/new`         | `pages/Projects/CreateProject/` |
| Customers      | `/customers`            | `pages/Customers/`       |
| Brokers        | `/brokers`              | `pages/Brokers/`         |
| Payments       | `/payments`             | `pages/Payments/`        |
| Documents      | `/documents`            | `pages/Documents/`       |
| Analytics      | `/analytics`            | `pages/Analytics/`       |
| Settings       | `/settings`             | `pages/Settings/`        |

### Project Workspace Sub-pages
| Sub-page          | Route                              |
|-------------------|------------------------------------|
| Overview          | `/projects/:id`                    |
| Interactive Layout| `/projects/:id/layout`             |
| Plots             | `/projects/:id/plots`              |
| Customers         | `/projects/:id/customers`          |
| Brokers           | `/projects/:id/brokers`            |
| Payments          | `/projects/:id/payments`           |
| Documents         | `/projects/:id/documents`          |
| Analytics         | `/projects/:id/analytics`          |
| Settings          | `/projects/:id/settings`           |

---

## 7. Dummy Data Strategy

**Rule:** Until backend is connected, all data comes from `src/data/*.json`

| Module       | Mock File            | Real API (Future)               |
|--------------|----------------------|---------------------------------|
| Projects     | `projects.json`      | `GET /api/projects`             |
| Customers    | `customers.json`     | `GET /api/customers`            |
| Brokers      | `brokers.json`       | `GET /api/brokers`              |
| Payments     | `payments.json`      | `GET /api/payments`             |
| Documents    | `documents.json`     | `GET /api/documents`            |
| Analytics    | `analytics.json`     | `GET /api/analytics/summary`    |

**Swap Strategy:** All data fetching goes through `src/services/*.js`
- During Phase 2: services import from `src/data/*.json`
- During Phase 3: services call FastAPI endpoints
- Zero component changes required

---

## 8. State Management

**Approach: React built-ins only (no Redux, no Zustand)**

| State Type           | Tool                  | Location              |
|----------------------|-----------------------|-----------------------|
| Auth (user session)  | Context + useState    | `AuthContext.jsx`     |
| Theme (light/dark)   | Context + useState    | `ThemeContext.jsx`    |
| Toast notifications  | Context + useState    | `ToastContext.jsx`    |
| Page-local state     | useState / useReducer | Inside each page      |
| Form state           | useState              | Inside each form      |
| Complex forms        | useReducer            | Inside form component |

---

## 9. Design System (Frozen)

### Brand Colors
```css
--color-primary:       #722F37;   /* Burgundy — primary brand */
--color-primary-light: #8B3A43;
--color-primary-dark:  #5A2029;
--color-accent:        #C9A87C;   /* Gold — accent */

--color-bg:            #FFFFFF;   /* White background */
--color-surface:       #F9F9F9;   /* Card surface */
--color-border:        #E8E8E8;   /* Thin borders */
--color-text-primary:  #1A1A1A;
--color-text-secondary:#6B6B6B;
--color-text-muted:    #9E9E9E;

/* Status */
--color-success:       #2E7D32;
--color-warning:       #F57C00;
--color-danger:        #C62828;
--color-info:          #1565C0;
```

### Typography
- **Font:** `Inter` (Google Fonts)
- **Scale:** 12 / 14 / 16 / 18 / 24 / 32 / 40px

### Spacing
- Base unit: `4px` → scale: 4, 8, 12, 16, 24, 32, 48, 64px

### Radius
- Small: `6px` | Medium: `10px` | Large: `16px` | Full: `9999px`

### Shadows
- Card: `0 1px 4px rgba(0,0,0,0.06)`
- Elevated: `0 4px 16px rgba(0,0,0,0.10)`
- Modal: `0 8px 32px rgba(0,0,0,0.16)`

### Rules
- ✅ White minimalist interface
- ✅ Soft shadows only
- ✅ Thin `1px` borders (`var(--color-border)`)
- ✅ Smooth transitions: `200ms ease`
- ✅ Large, breathable spacing
- ✅ Fully responsive (mobile → desktop)
- ❌ No Bootstrap
- ❌ No Material UI
- ❌ No Chakra UI

---

## 10. Development Order

```
Phase 2.1  →  React + Vite + Tailwind setup, folder wiring, global CSS, fonts
Phase 2.2  →  All 16 Global Components (Button, Input, Modal, Table ...)
Phase 2.3  →  Authentication (Login, Forgot Password, Loading Screen)
Phase 2.4  →  App Layout (Header, Sidebar, Content Layout, Notifications)
Phase 2.5  →  Main Dashboard
Phase 2.6  →  Projects List + Create Project Wizard
Phase 2.7  →  Project Workspace (9 sub-pages)
Phase 2.8  →  Customers Module
Phase 2.9  →  Brokers Module
Phase 2.10 →  Payments Module
Phase 2.11 →  Documents Module
Phase 2.12 →  Analytics Module
Phase 2.13 →  Settings Module
Phase 2.14 →  Responsive + Animations + Final Polish
```

---

## 11. Tech Stack (Frozen)

| Category        | Technology                    |
|-----------------|-------------------------------|
| Framework       | React 18                      |
| Build Tool      | Vite                          |
| Routing         | React Router v6               |
| Styling         | Tailwind CSS + Custom Tokens  |
| State           | React Context + Hooks         |
| HTTP (future)   | Axios                         |
| Icons           | Lucide React                  |
| Charts          | Recharts                      |
| Fonts           | Inter (Google Fonts)          |

---

*Architecture frozen — Phase 2.0 Complete ✅*
