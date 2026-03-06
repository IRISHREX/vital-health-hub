# Architecture Document
## Vital Health Hub — Multi-Tenant Healthcare Platform

**Version:** 2.0  
**Date:** 2026-03-06

---

## 1. Architecture Overview

The platform follows a **Multi-Tenant, Hub-and-Spoke Architecture** with:
- A centralized platform database for Grandmaster operations
- Isolated per-tenant databases for each hospital/nursing home
- A shared frontend application with route-level separation
- A unified Node.js/Express backend serving both portals

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Grandmaster Portal   │  │     Hospital Portal              │ │
│  │  /grandmaster/*       │  │     /login, /*                   │ │
│  │  - Dashboard          │  │     - Dashboard, Beds, Patients  │ │
│  │  - Organizations      │  │     - Lab, Pharmacy, Radiology   │ │
│  │  - Subscriptions      │  │     - Billing, Reports, OT       │ │
│  │  - Monitoring         │  │     - Nurses, Doctors, Tasks     │ │
│  │  - Notices            │  │     - Settings, Notifications    │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────┬───────────────────┬───────────────────────┘
                      │                   │
              /gm/api/v1/*         /nh/api/v1/*
                      │                   │
┌─────────────────────┴───────────────────┴───────────────────────┐
│                  BACKEND (Node.js + Express)                     │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  GM Middleware       │  │  NH Middleware                    │  │
│  │  (grandmasterAuth)   │  │  (Passport JWT + RBAC)           │  │
│  ├─────────────────────┤  ├──────────────────────────────────┤  │
│  │  GM Controllers      │  │  NH Controllers                  │  │
│  │  (org, sub, notice)  │  │  (patient, bed, lab, pharmacy)   │  │
│  └──────────┬──────────┘  └──────────────┬───────────────────┘  │
│             │                            │                       │
│  ┌──────────┴──────────┐  ┌──────────────┴───────────────────┐  │
│  │  Platform DB         │  │  Tenant Connection Manager       │  │
│  │  (Main MongoDB)      │  │  (tenantManager.js)              │  │
│  └──────────┬──────────┘  └──────────────┬───────────────────┘  │
└─────────────┼────────────────────────────┼───────────────────────┘
              │                            │
┌─────────────┴────────┐   ┌───────────────┴──────────────────────┐
│  MongoDB Atlas        │   │  Tenant Databases                    │
│  (Platform Database)  │   │  ┌────────────────────────────────┐  │
│                       │   │  │ nh_tenant_city_hospital         │  │
│  GM_Organization      │   │  │ nh_tenant_sunrise_nursing_home  │  │
│  GM_Subscription      │   │  │ nh_tenant_metro_diagnostics     │  │
│  GM_SubscriptionPlan  │   │  │ ...hundreds more                │  │
│  GM_GrandmasterUser   │   │  └────────────────────────────────┘  │
│  GM_PlatformNotice    │   │                                      │
│  GM_PlatformConfig    │   │  Each contains: NH_User, NH_Patient  │
│                       │   │  NH_Bed, NH_LabTest, NH_Invoice...   │
└───────────────────────┘   └──────────────────────────────────────┘
```

---

## 2. Multi-Tenancy Strategy

### 2.1 Database-per-Tenant Isolation

Each onboarded organization gets its own MongoDB database. This provides:
- **Complete data isolation** — no risk of cross-tenant data leakage
- **Independent backup/restore** per organization
- **Per-tenant performance** — one slow tenant doesn't affect others
- **Compliance** — data residency requirements easier to satisfy

### 2.2 Tenant Connection Manager

Located at `backend/src/config/tenantManager.js`:

```
┌─────────────────────────────────────────────┐
│           Tenant Connection Manager          │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Connection Cache (Map)                │  │
│  │                                        │  │
│  │  "db:nh_tenant_city"  → Connection #1  │  │
│  │  "db:nh_tenant_metro" → Connection #2  │  │
│  │  "uri:mongodb+srv://custom" → Conn #3  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  getTenantConnection(input)                  │
│  ├── Check cache for existing connection     │
│  ├── If found & healthy → return cached      │
│  ├── If closed → remove & recreate           │
│  └── Create new mongoose.createConnection()  │
│      └── maxPoolSize: 5                      │
│      └── serverSelectionTimeout: 5000ms      │
│      └── socketTimeout: 45000ms              │
│                                              │
│  registerTenantModels(conn)                  │
│  ├── Register User schema on connection      │
│  └── Register Patient schema on connection   │
│                                              │
│  generateDbName(slug) → "nh_tenant_<slug>"   │
│  closeAllTenantConnections() → graceful stop │
│  getActiveTenantCount() → connection metrics │
└─────────────────────────────────────────────┘
```

### 2.3 Database URI Resolution

```
buildTenantUri(dbName, dbUri):
  IF custom dbUri provided → use as-is
  ELSE take base MONGODB_URI
    → replace database name segment with tenant dbName
    → preserve query parameters (?retryWrites=true&w=majority)
```

---

## 3. Authentication Architecture

### 3.1 Dual Auth System

The platform has TWO completely separate authentication systems:

```
┌──────────────────────────────────────────────────────────┐
│                    AUTH SYSTEM                             │
│                                                           │
│  ┌─────────────────────┐  ┌───────────────────────────┐  │
│  │ Grandmaster Auth     │  │ Hospital Auth              │  │
│  │                      │  │                            │  │
│  │ Model:               │  │ Model:                     │  │
│  │  GM_GrandmasterUser  │  │  NH_User (per-tenant DB)   │  │
│  │                      │  │                            │  │
│  │ JWT Payload:          │  │ JWT Payload:               │  │
│  │  { id, role,          │  │  { id, role }              │  │
│  │    isGrandmaster:true}│  │                            │  │
│  │                      │  │                            │  │
│  │ Middleware:           │  │ Middleware:                 │  │
│  │  grandmasterAuth.js  │  │  passport JWT strategy     │  │
│  │                      │  │  + authorizeRoles()        │  │
│  │ Routes:               │  │  + visual access overrides │  │
│  │  /gm/api/v1/auth/*   │  │                            │  │
│  │                      │  │ Routes:                     │  │
│  │                      │  │  /nh/api/v1/auth/*         │  │
│  └─────────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Hospital Auth Flow (Current — Single Tenant)

```
User → POST /nh/api/v1/auth/login
  → NH_authController.login()
    → User.findOne({ email }) on DEFAULT MongoDB connection
    → comparePassword()
    → Generate JWT { id, role }
    → Return { user, token }
  → Frontend stores token + user in localStorage
  → Subsequent API calls include Bearer token
  → Passport JWT strategy validates token
    → User.findById(payload.id) on DEFAULT connection
```

### 3.3 RBAC System

```
┌────────────────────────────────────────────┐
│              RBAC Architecture              │
│                                             │
│  Layer 1: Role Hierarchy                    │
│  super_admin > hospital_admin > doctor      │
│  super_admin > hospital_admin > nurse       │
│  head_nurse > nurse                         │
│  receptionist, billing_staff (leaf roles)   │
│                                             │
│  Layer 2: Module Permissions (rbac.js)      │
│  18 modules × 4 flags per role              │
│  (canView, canCreate, canEdit, canDelete)   │
│                                             │
│  Layer 3: Visual Access Overrides           │
│  Per-user, per-module feature restrictions  │
│  (stored in NH_Settings)                    │
│                                             │
│  Layer 4: Personal Permissions              │
│  Per-user permission overrides              │
│  (stored on NH_User.personalPermissions)    │
└────────────────────────────────────────────┘
```

---

## 4. Frontend Architecture

### 4.1 Route Hierarchy

```
BrowserRouter
├── /login                          → Login (hospital portal)
├── /grandmaster/login              → GrandmasterLogin
├── /grandmaster/                   → GrandmasterLayout (sidebar + outlet)
│   ├── index                       → GrandmasterDashboard
│   ├── organizations               → Organizations
│   ├── subscriptions               → Subscriptions
│   ├── monitoring                  → Monitoring
│   ├── admins                      → Admins
│   ├── notices                     → Notices
│   └── settings                    → PlatformSettings
├── /* (DashboardLayout)            → Hospital portal
│   ├── /                           → Dashboard
│   ├── /beds                       → Beds
│   ├── /patients                   → Patients
│   ├── /patients/:id               → PatientDetails
│   ├── /admissions                 → Admissions
│   ├── /doctors                    → Doctors
│   ├── /nurses                     → Nurses
│   ├── /appointments               → Appointments
│   ├── /tasks                      → Tasks
│   ├── /facilities                 → Facilities
│   ├── /billing                    → Billing
│   ├── /reports                    → Reports
│   ├── /notifications              → Notifications
│   ├── /nurse                      → NurseDashboard
│   ├── /nurse/patients             → NursePatients
│   ├── /opd                        → OpdDashboard
│   ├── /lab                        → LabDashboard
│   ├── /radiology                  → RadiologyDashboard
│   ├── /pharmacy                   → PharmacyDashboard
│   ├── /ot                         → OTDashboard
│   ├── /prescriptions/:id/preview  → PrescriptionPreview
│   ├── /lab/:id/preview            → LabReportPreview
│   ├── /radiology/:id/preview      → RadiologyReportPreview
│   └── /settings                   → Settings
└── *                               → NotFound
```

### 4.2 State Management

```
┌─────────────────────────────────────────┐
│          State Architecture              │
│                                          │
│  AuthContext (React Context)             │
│  ├── user object (from localStorage)     │
│  ├── token (from localStorage)           │
│  ├── login() → apiClient POST            │
│  └── logout() → clear localStorage       │
│                                          │
│  React Query (TanStack Query)            │
│  ├── Server state caching                │
│  ├── Automatic refetching                │
│  └── Optimistic updates                  │
│                                          │
│  ThemeContext (React Context)             │
│  └── Dark/Light mode toggle              │
│                                          │
│  API Client (api-client.js)              │
│  ├── Auto-detect API URL (dev/prod)      │
│  ├── Auto-attach Bearer token            │
│  └── Error normalization                 │
└─────────────────────────────────────────┘
```

### 4.3 Component Architecture

```
src/
├── components/
│   ├── ui/              → shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layout/          → DashboardLayout, AppSidebar, Header
│   ├── dashboard/       → KPIs, charts, dialogs, forms
│   ├── lab/             → Lab-specific components
│   ├── pharmacy/        → Pharmacy-specific components
│   ├── radiology/       → Radiology-specific components
│   ├── ot/              → OT-specific components
│   ├── permissions/     → RBAC UI components
│   ├── tasks/           → Task management components
│   ├── shared/          → Cross-module (ModeToggle, ExternalPatientForm)
│   ├── ProtectedRoute   → Token-based route guard
│   └── AuthorizedRoute  → RBAC module-based route guard
├── pages/
│   ├── grandmaster/     → GM portal pages
│   └── *.jsx            → Hospital portal pages
├── lib/
│   ├── AuthContext       → Auth state provider
│   ├── api-client        → HTTP client
│   ├── auth.ts           → Auth API functions
│   ├── rbac.js           → Role permissions matrix
│   ├── grandmaster-api   → GM API client
│   └── *.js/ts           → Module-specific API clients
└── hooks/                → Custom hooks
```

---

## 5. Backend Architecture

### 5.1 Server Architecture

```
server.js
  ├── Express app initialization
  ├── CORS configuration (multi-origin)
  ├── JSON body parsing
  ├── Socket.io initialization
  ├── Route mounting
  │   ├── /nh/api/v1/* → Hospital routes (v1Router)
  │   └── /gm/api/v1/* → Grandmaster routes
  ├── Error handler middleware
  └── MongoDB connection + server start
```

### 5.2 Middleware Pipeline

```
Request → CORS → Body Parser → Route Matcher
  ├── /gm/* → grandmasterAuth → GM Controller → Response
  └── /nh/* → passport.authenticate('jwt') → authorizeRoles() → NH Controller → Response
                                                │
                                    ┌───────────┴───────────┐
                                    │ Visual Access Check    │
                                    │ 1. Resolve module      │
                                    │ 2. Map method→action   │
                                    │ 3. Check user override │
                                    │ 4. Fall back to RBAC   │
                                    └────────────────────────┘
```

### 5.3 Model Naming Convention

```
GM_ prefix → Platform-level models (stored in main DB)
  GM_Organization, GM_Subscription, GM_SubscriptionPlan,
  GM_GrandmasterUser, GM_PlatformNotice, GM_PlatformConfig

NH_ prefix → Tenant-level models (stored in tenant DBs)
  NH_User, NH_Patient, NH_Bed, NH_Admission, NH_Doctor,
  NH_Appointment, NH_Facility, NH_Invoice, NH_LabTest, etc.
```

---

## 6. Deployment Architecture

```
┌────────────────────────────┐
│     CDN / Static Host       │
│  (Vercel / Netlify / etc)   │
│     React SPA Bundle        │
└──────────┬─────────────────┘
           │ HTTPS
┌──────────┴─────────────────┐
│    API Server (Railway/AWS) │
│    Node.js + Express        │
│    Port 5000                │
│    Socket.io (WebSocket)    │
└──────────┬─────────────────┘
           │ mongodb+srv://
┌──────────┴─────────────────┐
│    MongoDB Atlas Cluster    │
│                             │
│  ┌──────────────────────┐   │
│  │ hospital_management  │   │  ← Platform DB (GM_ models)
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ nh_tenant_city_hosp  │   │  ← Tenant DB
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ nh_tenant_sunrise_nh │   │  ← Tenant DB
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ nh_tenant_metro_diag │   │  ← Tenant DB
│  └──────────────────────┘   │
│         ...                  │
└──────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Authentication Security
- bcrypt password hashing (12 salt rounds)
- JWT with configurable expiration
- Separate auth systems prevent privilege escalation between portals
- Password reset with time-limited tokens

### 7.2 Authorization Layers
1. **Route-level:** `authenticate` middleware ensures valid JWT
2. **Role-level:** `authorizeRoles()` checks role hierarchy
3. **Feature-level:** Visual access overrides restrict specific CRUD actions
4. **Personal-level:** Per-user permission overrides

### 7.3 Data Security
- Tenant DB URIs marked `select: false` in schema
- No cross-tenant data access possible (separate connections)
- Input validation via express-validator
- Centralized error handler prevents stack trace leakage
