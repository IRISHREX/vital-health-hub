# Module Functionality Reference
## Vital Health Hub — Complete Module Guide

**Version:** 2.0  
**Date:** 2026-03-06

---

## 1. Grandmaster Portal Modules

### 1.1 Dashboard (`/grandmaster`)
- **KPIs:** Total orgs, active orgs, total revenue, monthly revenue, active subscriptions
- **Widgets:** Org type breakdown, upcoming renewals, recent onboardings
- **Data Source:** `GM_Organization`, `GM_Subscription` aggregations

### 1.2 Organizations (`/grandmaster/organizations`)
- **List:** Filterable by status (active, suspended, onboarding) and type
- **Onboard:** Form with org details, admin credentials, module selection, optional custom DB URL
- **Actions:** Edit, suspend (with reason), reactivate, delete, update modules
- **Detail View:** Org info + active subscription + tenant stats

### 1.3 Subscriptions (`/grandmaster/subscriptions`)
- **Plans:** CRUD subscription plans with monthly/yearly pricing and included modules
- **Assignments:** Assign plans to organizations with billing cycle and dates
- **Payments:** Record payments with amount, method, reference, and notes
- **Tracking:** View all subscriptions with status badges

### 1.4 Monitoring (`/grandmaster/monitoring`)
- **Platform Stats:** Aggregated dashboard of all organizations
- **Per-Org Stats:** User count, patient count from tenant databases
- **Health:** Active tenant connection count

### 1.5 Admins (`/grandmaster/admins`)
- **CRUD:** Manage Grandmaster and Platform Admin users
- **Roles:** `grandmaster` (full access) and `platform_admin`

### 1.6 Notices (`/grandmaster/notices`)
- **Create:** Title, message, type (info/warning/critical/maintenance), target audience
- **Lifecycle:** Draft → Published → Archived
- **Targeting:** All organizations or specific org IDs

### 1.7 Platform Settings (`/grandmaster/settings`)
- **Config Store:** Key-value pairs with categories
- **Categories:** General, billing, modules, security, notifications

---

## 2. Hospital Portal Modules

### 2.1 Dashboard (`/`)
- **KPIs:** Total patients, admissions, bed occupancy, today's appointments
- **Charts:** Admission trends, bed occupancy
- **Quick Actions:** New patient, new admission, quick vital entry
- **Recent Patients:** Latest patient activity

### 2.2 Bed Management (`/beds`)
- **Bed Grid:** Visual representation of all beds by ward/floor
- **Status:** Available, occupied, maintenance, reserved
- **Actions:** Add bed, change status, assign patient, transfer
- **Dialogs:** BedDialog (add/edit), BedActionModal (status change), RoomAssignDialog

### 2.3 Admissions (`/admissions`)
- **List:** All admissions with status filters
- **Create:** AdmissionForm with patient selection, bed assignment, doctor assignment
- **Timeline:** AdmissionTimeline showing key events
- **Discharge:** DischargeSummary generation
- **Actions:** AdmissionActionModal for status changes

### 2.4 Patients (`/patients`, `/patients/:id`)
- **List:** Searchable, sortable patient directory
- **Create/Edit:** PatientDialog with demographics, contact, medical history
- **Detail View:** Complete patient profile with linked admissions, vitals, tests

### 2.5 Doctors (`/doctors`)
- **List:** Doctor directory with specialization
- **Create/Edit:** DoctorDialog
- **View:** ViewDoctorDialog with full profile

### 2.6 Nurses (`/nurses`)
- **List:** Nurse directory
- **Create:** AddNurseDialog with room assignments
- **Nurse Dashboard** (`/nurse`): Assigned patients, pending tasks, vitals
- **Nurse Patients** (`/nurse/patients`): Patients in assigned rooms

### 2.7 Appointments (`/appointments`)
- **List:** All appointments with date/status filters
- **Create:** AppointmentDialog with patient, doctor, date/time selection
- **View:** ViewAppointmentDialog with full details

### 2.8 Facilities (`/facilities`)
- **List:** Hospital facilities (wards, departments, rooms)
- **Create:** AddFacilityDialog

### 2.9 Billing (`/billing`)
- **Ledger:** BillingLedger with all financial transactions
- **Invoices:** Invoice list, creation (AddInvoiceDialog), preview (InvoicePreview)
- **Service Orders:** Linked service orders and charges

### 2.10 Pathology Lab (`/lab`) — Dual-Mode
- **Dashboard:** Test queue with status filters, mode filter (internal/external)
- **Order Test:** OrderLabTestDialog with ModeToggle
  - Internal: Select registered patient
  - External: Fill walk-in form (ExternalPatientForm)
- **Sample Collection:** SampleCollectionQueue
- **Catalog:** LabCatalogManager for test definitions
- **Reports:** LabReportDialog for entering results
- **Preview:** LabReportPreview with PDF generation (jsPDF)
- **Badges:** "Walk-in" badge for external patient tests

### 2.11 Radiology (`/radiology`) — Dual-Mode
- **Dashboard:** Order queue with status and mode filters
- **Order:** OrderRadiologyDialog with internal/external mode
- **Reports:** RadiologyReportDialog
- **Preview:** RadiologyReportPreview with PDF generation

### 2.12 Pharmacy (`/pharmacy`) — Dual-Mode
- **Dashboard:** Prescription queue, medicine inventory
- **Prescriptions:** PrescriptionDialog with internal/external mode
- **Dispensing:** DispenseDialog
- **Inventory:** AddMedicineDialog, StockAdjustDialog
- **Templates:** Prescription templates
- **Preview:** PrescriptionPreview with PDF export
- **Autocomplete:** MedicineAutocomplete for searching medicines

### 2.13 Operating Theatre (`/ot`)
- **OT Rooms:** OTRoomDialog for room management
- **Surgeries:** CreateSurgeryDialog, ScheduleSurgeryDialog
- **Execution:** EndSurgeryDialog with post-op notes
- **Schedule:** Calendar view of scheduled surgeries

### 2.14 OPD Dashboard (`/opd`)
- **Overview:** Outpatient department statistics and queue

### 2.15 Reports (`/reports`)
- **Report Types:** Various filterable reports
- **Date Ranges:** Configurable report periods

### 2.16 Tasks (`/tasks`)
- **List:** Task board with status tracking
- **Assign:** AssignTaskDialog with user/role selection

### 2.17 Notifications (`/notifications`)
- **List:** In-app notification feed
- **Actions:** Mark read/unread, clear

### 2.18 Settings (`/settings`)
- **Visual Access:** Per-user module feature restrictions
- **Module Operations:** Configure module-specific settings
- **Facility Settings:** Hospital-level configuration

---

## 3. Cross-Cutting Concerns

### 3.1 Authentication
- Email/password login
- JWT-based sessions (7-day expiry)
- Password reset with email tokens
- Profile update

### 3.2 Authorization (RBAC)
- 7 roles × 18 modules × 4 permissions = 504 permission combinations
- Role hierarchy with inheritance
- Visual access override system
- Personal permission overrides

### 3.3 Theme Support
- Light/Dark mode toggle
- Persistent theme preference
- shadcn/ui design system with semantic tokens

### 3.4 Responsive Design
- Mobile-responsive sidebar
- Touch-friendly UI components
- Adaptive layouts

### 3.5 PDF Generation
- Lab reports, radiology reports, prescriptions
- Uses jsPDF + jspdf-autotable
- Branded headers with hospital info
