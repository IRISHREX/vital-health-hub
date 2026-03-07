# Software Requirements Specification (SRS)
## Vital Health Hub — Multi-Tenant Healthcare Management Platform

**Version:** 2.0  
**Date:** 2026-03-06  
**Document Status:** Living Document

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Vital Health Hub platform — a multi-tenant healthcare management system that enables a central Grandmaster organization to onboard and manage multiple nursing homes, hospitals, and diagnostic centers from a single platform.

### 1.2 Scope
The platform consists of two major subsystems:
1. **Hospital Management System (HMS)** — Per-tenant system for managing daily hospital operations (patients, beds, admissions, billing, labs, pharmacy, radiology, OT, etc.)
2. **Grandmaster Module (GM)** — Central control system for platform administration, organization onboarding, subscription management, and cross-tenant monitoring.

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| **Grandmaster (GM)** | SuperSuperAdmin — the top-level platform administrator |
| **Tenant** | An individual hospital/nursing home with its own isolated database |
| **Organization** | A registered entity (hospital, nursing home, diagnostic center, clinic) |
| **HMS** | Hospital Management System (per-tenant) |
| **RBAC** | Role-Based Access Control |
| **Internal Mode** | Operations tied to admitted/registered hospital patients |
| **External Mode** | Walk-in patient operations without formal hospital registration |

### 1.4 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, React Query, React Router v6 |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (per-tenant isolation) |
| Auth | JWT + Passport.js (Local + JWT strategies) |
| Realtime | Socket.io |
| Email | Nodemailer (SMTP) |

---

## 2. Overall Description

### 2.1 Product Perspective
The platform operates in a **hub-and-spoke** model:
- The **hub** is the Grandmaster portal (`/grandmaster/*`) with its own auth system and data stored in the platform-level MongoDB database.
- Each **spoke** is a tenant hospital (`/login`, `/*`) with its own isolated MongoDB database managed by the Tenant Connection Manager.

### 2.2 User Classes

| User Class | Scope | Auth Mechanism |
|-----------|-------|----------------|
| Grandmaster | Platform-wide | GM JWT (`isGrandmaster: true`) |
| Platform Admin | Platform-wide | GM JWT |
| Super Admin | Single tenant | Tenant JWT |
| Hospital Admin | Single tenant | Tenant JWT |
| Doctor | Single tenant | Tenant JWT |
| Head Nurse | Single tenant | Tenant JWT |
| Nurse | Single tenant | Tenant JWT |
| Receptionist | Single tenant | Tenant JWT |
| Billing Staff | Single tenant | Tenant JWT |

### 2.3 Operating Environment
- **Browser:** Modern Chrome, Firefox, Edge, Safari
- **Backend:** Node.js 18+
- **Database:** MongoDB 6+
- **Deployment:** Railway / AWS / any Docker-compatible host

---

## 3. Functional Requirements

### 3.1 Grandmaster Module (FR-GM)

#### FR-GM-001: Authentication
- Grandmaster users authenticate via `/gm/api/v1/auth/login`
- Separate user model (`GM_GrandmasterUser`) with roles: `grandmaster`, `platform_admin`
- JWT tokens include `isGrandmaster: true` flag
- Protected by `grandmasterAuth` middleware

#### FR-GM-002: Organization Onboarding
- Register new organizations with: name, type, address, contact, admin details
- Auto-generate URL slug and database name (`nh_tenant_<slug>`)
- Create isolated MongoDB database for the tenant
- Seed a `super_admin` user in the tenant database during onboarding
- Support optional custom database URI for organizations with their own MongoDB instances
- Set initial enabled modules

#### FR-GM-003: Subscription Management
- CRUD operations for subscription plans (name, monthly/yearly pricing, included modules, limits)
- Assign subscriptions to organizations with billing cycle, amount, start/end dates
- Track payment history with method, reference, and notes
- Subscription statuses: `active`, `expired`, `cancelled`, `trial`, `grace_period`
- Auto-renew flag and configurable grace period

#### FR-GM-004: Module Control
- Enable/disable specific modules per organization from the `enabledModules` array
- Available modules: dashboard, beds, admissions, patients, doctors, nurses, appointments, facilities, billing, reports, notifications, settings, tasks, vitals, lab, pharmacy, radiology, ot, opd, ipd, inventory

#### FR-GM-005: Organization Monitoring
- Platform-wide dashboard: total/active/suspended orgs, revenue, subscription stats
- Per-organization stats: user count, patient count (fetched from tenant DB)
- Revenue aggregation: total and monthly revenue from payment records
- Type breakdown (nursing_home, hospital, diagnostic_center, clinic)
- Active tenant connection count

#### FR-GM-006: Organization Lifecycle
- Status management: `onboarding` → `active` → `suspended` / `deactivated`
- Suspend with reason, reactivate, delete (cascading subscription cleanup)
- Limits: `maxUsers`, `maxBeds` per organization

#### FR-GM-007: Admin Management
- CRUD Grandmaster/Platform Admin users
- Role assignment: `grandmaster` or `platform_admin`

#### FR-GM-008: Notice & Communication
- Create platform-wide or organization-specific notices
- Notice types: `info`, `warning`, `critical`, `maintenance`
- Target: `all` organizations or specific organization IDs
- Publish/draft/archive lifecycle

#### FR-GM-009: Platform Configuration
- Global key-value configuration store
- Categorized settings: `general`, `billing`, `modules`, `security`, `notifications`
- JSON value support with descriptions

### 3.2 Hospital Management System (FR-HMS)

#### FR-HMS-001: Authentication & Authorization
- Email/password login via `/nh/api/v1/auth/login`
- JWT-based session management
- RBAC with 7 roles and 18 module permission matrices
- Visual access override system (per-user, per-module feature restrictions)
- Password reset flow with email tokens

#### FR-HMS-002: Patient Management
- CRUD patients with demographics, contact info, medical history
- Internal patients (registered) and external/walk-in patients
- Patient details view with full history

#### FR-HMS-003: Bed Management
- Bed CRUD with ward, floor, room, status tracking
- Bed occupancy visualization (grid view)
- Bed assignment and transfer workflows

#### FR-HMS-004: Admission Management
- Admission/discharge workflow with timeline tracking
- Admission forms with bed assignment
- Discharge summary generation

#### FR-HMS-005: Doctor Management
- Doctor profiles, specializations, schedules
- Doctor dashboard with patient lists

#### FR-HMS-006: Nurse Management
- Nurse profiles with assigned rooms/wards
- Nurse dashboard and patient assignment

#### FR-HMS-007: Appointment Scheduling
- Create/view/cancel appointments
- Calendar and list views

#### FR-HMS-008: Billing & Invoicing
- Invoice generation with line items
- Billing ledger and payment tracking
- Service order management

#### FR-HMS-009: Pathology Lab (Dual-Mode)
- **Internal Mode:** Order tests for registered patients
- **External Mode:** Walk-in patients with inline form (name, age, gender, phone, address, referredBy)
- Test catalog management
- Sample collection queue
- Report generation and preview with PDF export

#### FR-HMS-010: Radiology (Dual-Mode)
- Internal/external patient support (same as lab)
- Order creation, report upload, preview

#### FR-HMS-011: Pharmacy (Dual-Mode)
- Prescription management for internal/external patients
- Medicine inventory and stock tracking
- Dispensing workflow with stock adjustment
- Prescription templates and export

#### FR-HMS-012: Operating Theatre (OT)
- OT room management
- Surgery scheduling and execution
- End surgery with notes

#### FR-HMS-013: Reports & Analytics
- Various report types with date filtering
- Dashboard KPIs and charts

#### FR-HMS-014: Notifications
- In-app notification system
- Mark read/unread

#### FR-HMS-015: Settings & Configuration
- Visual access settings (module-level feature restrictions per user)
- Module operations settings
- Facility configuration

#### FR-HMS-016: Task Management
- Task creation and assignment
- Status tracking

#### FR-HMS-017: Vitals Management
- Record and track patient vitals
- Quick vital entry from dashboard

---

## 4. Non-Functional Requirements

### 4.1 Performance
- API response time < 500ms for standard CRUD operations
- Tenant connection pooling with max 5 connections per tenant
- Connection cache with automatic stale connection cleanup

### 4.2 Scalability
- Architecture supports hundreds of tenants via dynamic connection pooling
- Per-tenant database isolation prevents noisy-neighbor problems
- Stateless JWT auth enables horizontal API scaling

### 4.3 Security
- Passwords hashed with bcrypt (salt rounds: 12)
- JWT tokens with configurable expiry (default: 7 days)
- Role-based + visual access override authorization
- Separate auth systems for Grandmaster and tenant portals
- Tenant database URIs hidden from API responses (`select: false`)
- CORS configuration with allowed origins

### 4.4 Data Isolation
- Each tenant has its own MongoDB database
- Platform-level data (organizations, subscriptions, GM users) stored in the main database
- Tenant data never leaks across organization boundaries

### 4.5 Availability
- Graceful shutdown with `closeAllTenantConnections`
- Socket timeout: 45s, server selection timeout: 5s
- Connection error logging per tenant

---

## 5. API Endpoints Summary

### 5.1 Grandmaster API (`/gm/api/v1/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Grandmaster login |
| GET | `/auth/me` | Current GM user |
| GET | `/organizations` | List all orgs |
| POST | `/organizations` | Onboard new org |
| GET | `/organizations/:id` | Get org details |
| PUT | `/organizations/:id` | Update org |
| PUT | `/organizations/:id/modules` | Update modules |
| PUT | `/organizations/:id/suspend` | Suspend org |
| PUT | `/organizations/:id/reactivate` | Reactivate org |
| DELETE | `/organizations/:id` | Delete org |
| GET | `/subscriptions/plans` | List plans |
| POST | `/subscriptions/plans` | Create plan |
| POST | `/subscriptions` | Create subscription |
| POST | `/subscriptions/:id/payment` | Record payment |
| GET | `/monitoring/stats` | Platform stats |
| GET | `/monitoring/org/:id` | Org stats |
| GET | `/monitoring/recent` | Recent orgs |
| GET | `/notices` | List notices |
| POST | `/notices` | Create notice |
| GET | `/admins` | List admins |
| POST | `/admins` | Create admin |
| GET | `/config` | Get config |
| PUT | `/config` | Update config |

### 5.2 Hospital API (`/nh/api/v1/`)

| Prefix | Module |
|--------|--------|
| `/auth` | Authentication |
| `/patients` | Patient management |
| `/beds` | Bed management |
| `/admissions` | Admissions |
| `/doctors` | Doctor profiles |
| `/nurse` | Nurse management |
| `/appointments` | Scheduling |
| `/facilities` | Facility management |
| `/billing` | Billing ledger |
| `/invoices` | Invoice management |
| `/lab-tests` | Pathology lab |
| `/pharmacy` | Pharmacy |
| `/radiology` | Radiology |
| `/ot` | Operating theatre |
| `/reports` | Reports |
| `/notifications` | Notifications |
| `/settings` | Settings |
| `/tasks` | Tasks |
| `/vitals` | Vitals |
| `/users` | User management |
| `/dashboard` | Dashboard stats |
| `/service-orders` | Service orders |
| `/doctor-dashboard` | Doctor-specific stats |
| `/personal-permissions` | Per-user permissions |

---

## 6. Data Models Summary

### 6.1 Platform-Level Models (GM_ prefix)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `GM_GrandmasterUser` | Platform admins | email, password, role (grandmaster/platform_admin) |
| `GM_Organization` | Registered tenants | name, slug, type, dbName, dbUri, enabledModules, status |
| `GM_SubscriptionPlan` | Billing plans | name, code, pricing, includedModules, limits |
| `GM_Subscription` | Active subscriptions | organization, plan, billingCycle, amount, dates, payments[] |
| `GM_PlatformNotice` | Notices/alerts | title, message, type, target, status |
| `GM_PlatformConfig` | Global settings | key, value, category, description |

### 6.2 Tenant-Level Models (NH_ prefix)

| Model | Purpose |
|-------|---------|
| `NH_User` | Hospital staff accounts |
| `NH_Patient` | Patient records |
| `NH_Bed` | Bed inventory |
| `NH_Admission` | Admission records |
| `NH_Doctor` | Doctor profiles |
| `NH_Appointment` | Appointments |
| `NH_Facility` | Facility details |
| `NH_Invoice` | Invoices |
| `NH_BillingLedger` | Billing entries |
| `NH_LabTest` | Lab test orders (internal/external) |
| `NH_LabTestCatalog` | Lab test definitions |
| `NH_RadiologyOrder` | Radiology orders (internal/external) |
| `NH_Prescription` | Prescriptions (internal/external) |
| `NH_Medicine` | Medicine inventory |
| `NH_StockAdjustment` | Stock changes |
| `NH_OTRoom` | OT rooms |
| `NH_Surgery` | Surgery records |
| `NH_Vital` | Patient vitals |
| `NH_Notification` | In-app notifications |
| `NH_Task` | Task assignments |
| `NH_Settings` | Tenant settings |
| `NH_ActivityLog` | Audit trail |
| `NH_AccessRequest` | Access requests |
| `NH_ServiceOrder` | Service orders |

---

## 7. Constraints & Assumptions

1. Each organization MUST have a unique slug and database name
2. Tenant databases are prefixed with `nh_tenant_`
3. Grandmaster and hospital portals share the same frontend application but have separate route hierarchies
4. The platform database (main MongoDB) stores all GM_ models
5. Walk-in/external patients are embedded documents, not referenced
6. Module availability at the tenant level is controlled by BOTH the Grandmaster (`enabledModules` on the organization) and the subscription plan (`includedModules`)
