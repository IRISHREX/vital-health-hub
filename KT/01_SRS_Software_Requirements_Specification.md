# Software Requirements Specification (SRS)
## Vital Health Hub

Version: 3.0  
Date: March 6, 2026  
Status: Active

## 1. Introduction
### 1.1 Purpose
This SRS defines the functional and non-functional requirements for Vital Health Hub, a multi-tenant healthcare platform with:
- Grandmaster portal (platform operations)
- Hospital/Nursing-home portal (tenant operations)

### 1.2 Scope
The product supports onboarding multiple healthcare organizations, assigning each organization an isolated tenant database, and running hospital operations (patients, admissions, labs, pharmacy, billing, reports, etc.) with role-based access control.

### 1.3 Stakeholders
- Grandmaster / Platform Admin
- Hospital Super Admin
- Hospital Admin
- Clinical Users (Doctor, Nurse, Head Nurse)
- Front Desk / Billing Staff
- IT/Operations Team

## 2. Product Overview
### 2.1 Product Context
- Frontend: React + Vite SPA
- Backend: Node.js + Express API
- Data: MongoDB with DB-per-tenant strategy

### 2.2 User Roles
- Platform: `grandmaster`, `platform_admin`
- Tenant: `super_admin`, `hospital_admin`, `doctor`, `head_nurse`, `nurse`, `receptionist`, `billing_staff`

### 2.3 Major Subsystems
- Grandmaster Organization & Subscription Management
- Tenant Authentication & Authorization
- Hospital Core Modules (patients, beds, admissions, appointments, billing)
- Clinical Modules (lab, radiology, pharmacy, OT)
- Monitoring, notifications, and settings

## 3. Functional Requirements
### 3.1 Grandmaster Requirements
- FR-GM-001: Platform login/logout and profile retrieval.
- FR-GM-002: Organization onboarding with slug, tenant DB name, and seeded tenant super admin.
- FR-GM-003: Organization lifecycle actions: activate, suspend, reactivate, delete.
- FR-GM-004: Module enablement per organization.
- FR-GM-005: Subscription plans, assignments, and payment tracking.
- FR-GM-006: Cross-tenant monitoring and organization stats.

### 3.2 Tenant Auth and Access
- FR-AUTH-001: Tenant users authenticate using `POST /nh/api/v1/auth/login`.
- FR-AUTH-002: Tenant DB resolution order must be:
  1. `x-org-slug` header
  2. subdomain slug
  3. login email lookup (only for `POST /auth/login` when 1 and 2 are absent)
- FR-AUTH-003: If multiple organizations match email, API returns `409` and requires explicit slug.
- FR-AUTH-004: Suspended organizations must be denied (`403`) at tenant resolution layer.
- FR-AUTH-005: Login success payload must include `organization` context.
- FR-AUTH-006: Frontend must persist resolved `organization.slug` and send it in `x-org-slug` for subsequent NH requests.

### 3.3 Tenant Operations
- FR-HMS-001: Dashboard metrics by role (`admin`, `doctor`, `nurse`).
- FR-HMS-002: Patient, bed, admission, and appointment lifecycle CRUD.
- FR-HMS-003: Invoice and billing ledger management.
- FR-HMS-004: Internal and external mode support in lab/radiology/pharmacy modules.
- FR-HMS-005: Settings, notifications, reports, and task workflows.

### 3.4 Authorization
- FR-RBAC-001: JWT-based authentication for NH APIs.
- FR-RBAC-002: Role hierarchy based authorization.
- FR-RBAC-003: Visual-access override per user/module/action.

## 4. Non-Functional Requirements
### 4.1 Security
- Password hashing via bcrypt.
- JWT-based stateless auth with expiry.
- Tenant-level data isolation at DB level.
- Access denial for suspended organizations.

### 4.2 Performance
- Connection reuse via tenant connection cache.
- Avoid per-request tenant connection creation.
- API should respond within acceptable operational SLA under normal load.

### 4.3 Scalability
- Must support increasing number of tenants with isolated DBs.
- API should support horizontal scaling (stateless auth model).

### 4.4 Reliability
- API must fail safely with explicit 4xx/5xx responses.
- Tenant resolution failures must not route to wrong tenant.

### 4.5 Maintainability
- Controller logic should use tenant-aware model resolution (`getModel` + `req.tenantConn`).
- Default-model usage in NH controllers is considered technical debt and should be removed.

## 5. External Interfaces
### 5.1 Key API Namespaces
- Grandmaster: `/gm/api/v1/*`
- Tenant (NH): `/nh/api/v1/*`

### 5.2 Key Tenant Auth Endpoints
- `POST /nh/api/v1/auth/login`
- `GET /nh/api/v1/auth/me`
- `PUT /nh/api/v1/auth/profile`
- `PUT /nh/api/v1/auth/password`
- `POST /nh/api/v1/auth/forgot-password`
- `POST /nh/api/v1/auth/reset-password`

## 6. Data Requirements
### 6.1 Platform Collections
- `GM_Organization`
- `GM_GrandmasterUser`
- `GM_SubscriptionPlan`
- `GM_Subscription`
- `GM_PlatformNotice`
- `GM_PlatformConfig`

### 6.2 Tenant Collections (per organization DB)
- `User`, `Patient`, `Bed`, `Admission`, `Appointment`, `Invoice`, `BillingLedger`
- `LabTest`, `RadiologyOrder`, `Prescription`, `Medicine`, `Surgery`, `OTRoom`, etc.

## 7. Constraints and Assumptions
- Organization slug is unique.
- `GM_Organization.adminDetails.email` should uniquely identify onboarding admin in normal operations.
- Tenant resolution by email is currently intended primarily for admin login UX.
- Frontend/browser local storage is used for token and org slug persistence.

## 8. Acceptance Criteria
- AC-001: Hospital admin can log in via `/login` with only email/password (no manual org slug) when email uniquely maps to organization.
- AC-002: Login response includes `organization.slug`, and next authenticated NH call resolves same tenant.
- AC-003: Ambiguous email returns `409` with clear guidance.
- AC-004: Suspended org login returns `403`.
- AC-005: Existing slug/subdomain tenant routing continues to work.

## 9. Known Gaps
- Add regression coverage to ensure settings/data-management paths remain tenant-aware.
- Forgot-password flow is not fully email auto-resolved across tenants.
- Passport configuration is present but not primary runtime auth path.
