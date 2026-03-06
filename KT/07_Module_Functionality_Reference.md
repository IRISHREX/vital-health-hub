# Module Functionality Reference
## Vital Health Hub

Version: 3.0  
Date: March 6, 2026

## 1. Grandmaster Portal Modules
### Dashboard
- Organization count/status overview
- Revenue and subscription KPIs
- Recent organization onboarding list

### Organizations
- Onboard organization
- Update metadata and modules
- Suspend/reactivate/delete organization
- View generated tenant DB metadata

### Subscriptions
- Plan management
- Assign plans to organizations
- Record and inspect payment history

### Monitoring
- Platform aggregate stats
- Organization-specific tenant stats
- Tenant connection visibility

### Notices
- Create and publish platform notices
- Target all organizations or specific organizations

### Admins
- Manage platform admin accounts

### Platform Settings
- Configure global platform-level parameters

## 2. Hospital Portal Modules
### Authentication
- Login, profile update, password change
- Tenant-aware auth context via slug/subdomain/email

### Dashboard
- Role-aware summary (`admin`, `doctor`, `nurse`)
- KPIs and daily activity counters

### Patients
- CRUD and patient detail timeline

### Beds
- Bed inventory and occupancy status
- Bed assignment support in admission flow

### Admissions
- Admission create/update/discharge lifecycle

### Doctors
- Doctor records and availability context

### Nurses
- Nurse records, assignment-related views

### Appointments
- Scheduling and status tracking

### Billing / Invoices
- Ledger entries and invoice lifecycle

### Lab Tests
- Internal and external patient modes
- Test catalog, order and reporting flows

### Radiology
- Internal and external order management

### Pharmacy
- Prescription workflows
- Medicine inventory and stock adjustments

### OT (Operating Theatre)
- OT room and surgery management

### Reports
- Operational reports across major modules

### Notifications
- User notification feed and status updates

### Tasks
- Assignment and status tracking

### Settings
- Hospital/security/notification settings
- Visual access and module operation settings
- Data management import/export controls

## 3. Cross-Cutting Capability Notes
- Tenant model resolution should use `getModel(req, ...)` per request context.
- Authorization combines role hierarchy with visual-access overrides.
- Tenant routing depends on a stable `x-org-slug` (or equivalent context).

## 4. Current Caution
- Keep tenant-isolation regression tests for settings/data-management and module operations paths.
