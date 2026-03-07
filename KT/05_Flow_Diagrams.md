# Flow Diagrams
## Vital Health Hub — Key Operational Flows

**Version:** 2.0  
**Date:** 2026-03-06

---

## 1. Platform Lifecycle Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│ Grandmaster  │     │ Organization │     │ Hospital       │
│ Setup        │────►│ Onboarding   │────►│ Operations     │
└─────────────┘     └──────────────┘     └────────────────┘
      │                    │                      │
      ▼                    ▼                      ▼
  Run seeder          Fill onboarding         Daily hospital
  (seedGrandmaster)   form with:              workflow:
  Creates GM user     - Hospital details      - Patient admission
  with credentials    - Admin credentials     - Lab/radiology orders
                      - Module selection      - Prescriptions
                      System creates:         - Billing
                      - Org record            - Reports
                      - Tenant DB
                      - Super Admin user
```

---

## 2. Complete Onboarding Flow

```
Step 1: Grandmaster logs into /grandmaster/login
        │
Step 2: Navigate to Organizations → "Onboard New Organization"
        │
Step 3: Fill Organization Form
        ├── Organization Name: "City General Hospital"
        ├── Type: hospital | nursing_home | diagnostic_center | clinic
        ├── Address: street, city, state, zip, country
        ├── Contact: phone, email, website
        ├── Admin: firstName, lastName, email, phone
        ├── Admin Password: (min 8 chars)
        ├── Modules: [dashboard, patients, beds, lab, pharmacy, ...]
        ├── Limits: maxUsers (50), maxBeds (100)
        └── Database URL: (optional custom MongoDB URI)
        │
Step 4: Backend Processing
        ├── Validate all fields
        ├── Generate slug: "city-general-hospital"
        ├── Check slug uniqueness
        ├── Generate dbName: "nh_tenant_city_general_hospital"
        ├── Create GM_Organization record (status: 'onboarding')
        ├── Create tenant database connection
        ├── Hash admin password (bcrypt, 12 rounds)
        ├── Create NH_User in tenant DB (role: super_admin)
        ├── On success: status → 'active'
        └── On failure: rollback (delete GM_Organization record)
        │
Step 5: Organization appears in Grandmaster dashboard
        │
Step 6: ⚠️ CURRENT GAP: Hospital admin cannot log in via /login
        (See Tenant-Aware Login Analysis document)
```

---

## 3. Subscription Management Flow

```
┌────────────────────────────────────────────────────────────────┐
│                 SUBSCRIPTION LIFECYCLE                          │
│                                                                │
│  Create Plan          Assign to Org         Record Payments    │
│  ┌─────────┐         ┌──────────┐          ┌──────────────┐   │
│  │ Basic   │         │ Org: XYZ │          │ Amount: ₹5000│   │
│  │ ₹5000/m │────────►│ Plan:    │◄────────►│ Method: UPI  │   │
│  │ ₹50000/y│         │  Basic   │          │ Ref: TXN123  │   │
│  │ Modules:│         │ Cycle:   │          │ Date: Today  │   │
│  │  6 mods │         │  monthly │          └──────────────┘   │
│  └─────────┘         │ Status:  │                              │
│                      │  active  │          Monitor Status       │
│  ┌─────────┐         └──────────┘          ┌──────────────┐   │
│  │ Premium │                               │ active       │   │
│  │ ₹15000/m│         Status Transitions:   │ trial        │   │
│  │ ₹150K/y │         active → grace_period │ grace_period │   │
│  │ All mods│         grace → expired       │ expired      │   │
│  └─────────┘         any → cancelled       │ cancelled    │   │
│                                            └──────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Patient Admission Flow

```
Step 1: Receptionist creates patient record
        POST /patients { name, age, gender, contact, ... }
        │
Step 2: Doctor/receptionist initiates admission
        POST /admissions { patientId, bedId, admittingDoctor, ... }
        │
Step 3: Bed assignment
        ├── Select available bed from BedGrid
        ├── Bed status changes: available → occupied
        └── Patient linked to bed
        │
Step 4: During Stay
        ├── Record vitals (POST /vitals)
        ├── Order lab tests (POST /lab-tests)
        ├── Order radiology (POST /radiology)
        ├── Create prescriptions (POST /pharmacy/prescriptions)
        ├── Schedule surgeries (POST /ot/surgeries)
        ├── Assign tasks to nurses (POST /tasks)
        └── Create service orders (POST /service-orders)
        │
Step 5: Discharge
        ├── Generate discharge summary
        ├── Finalize billing
        ├── Generate invoice
        ├── Bed status: occupied → available
        └── Admission status → discharged
```

---

## 5. Dual-Mode (Internal/External) Flow

```
┌───────────────────────────────────────────────────────────────┐
│              DUAL MODE OPERATION                               │
│                                                                │
│  ┌─────────────────────────┐  ┌────────────────────────────┐  │
│  │  INTERNAL MODE           │  │  EXTERNAL MODE              │  │
│  │                          │  │                             │  │
│  │  Patient: Registered     │  │  Patient: Walk-in           │  │
│  │  Source: Patient DB      │  │  Source: Inline Form         │  │
│  │  Billing: Hospital      │  │  Billing: Separate           │  │
│  │  invoice system          │  │  walk-in billing             │  │
│  │                          │  │                             │  │
│  │  ┌──────────────────┐   │  │  ┌──────────────────────┐   │  │
│  │  │ Select Patient   │   │  │  │ Fill: Name, Age,     │   │  │
│  │  │ from dropdown    │   │  │  │ Gender, Phone,       │   │  │
│  │  └────────┬─────────┘   │  │  │ Address, ReferredBy  │   │  │
│  │           │              │  │  └────────┬─────────────┘   │  │
│  │           ▼              │  │           ▼                  │  │
│  │  ┌──────────────────┐   │  │  ┌──────────────────────┐   │  │
│  │  │ Order Test /     │   │  │  │ Order Test /          │   │  │
│  │  │ Prescription     │   │  │  │ Prescription          │   │  │
│  │  └────────┬─────────┘   │  │  └────────┬─────────────┘   │  │
│  │           │              │  │           │                  │  │
│  │           ▼              │  │           ▼                  │  │
│  │  ┌──────────────────┐   │  │  ┌──────────────────────┐   │  │
│  │  │ Linked to        │   │  │  │ Stored as embedded   │   │  │
│  │  │ patient record   │   │  │  │ externalPatient      │   │  │
│  │  │ via ObjectId ref │   │  │  │ document             │   │  │
│  │  └──────────────────┘   │  │  └──────────────────────┘   │  │
│  └─────────────────────────┘  └────────────────────────────┘  │
│                                                                │
│  Modules supporting dual-mode:                                 │
│  ✅ Pathology Lab (NH_LabTest)                                 │
│  ✅ Radiology (NH_RadiologyOrder)                              │
│  ✅ Pharmacy (NH_Prescription)                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. RBAC Authorization Flow

```
API Request arrives
     │
     ▼
┌─────────────────────────────────┐
│ passport.authenticate('jwt')    │
│ Extracts & validates JWT        │
│ Loads user from DB              │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ authorizeRoles(...allowedRoles) │
│                                  │
│ Step 1: Resolve module from URL │
│ /patients → 'patients'          │
│ /lab-tests → 'lab'              │
│                                  │
│ Step 2: Map HTTP method to action│
│ GET → canView                    │
│ POST → canCreate                 │
│ PUT/PATCH → canEdit              │
│ DELETE → canDelete               │
│                                  │
│ Step 3: Check Visual Overrides  │
│ ┌───────────────────────────┐   │
│ │ VisualAccessSettings      │   │
│ │ .findOne() (cached 5s)    │   │
│ │                           │   │
│ │ Look for user email in    │   │
│ │ overrides array           │   │
│ │                           │   │
│ │ If module override found: │   │
│ │   Check action permission │   │
│ │   Check restrictedFeatures│   │
│ │   → Allow or 403          │   │
│ └───────────────────────────┘   │
│                                  │
│ Step 4: Fall back to role check │
│ ┌───────────────────────────┐   │
│ │ roleHierarchy check       │   │
│ │ super_admin includes all  │   │
│ │ hospital_admin includes   │   │
│ │   doctor, nurse, etc.     │   │
│ │ → Allow or 403            │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 7. Grandmaster Monitoring Flow

```
Grandmaster Dashboard (/grandmaster)
     │
     ▼
┌─────────────────────────────────┐
│ GET /gm/api/v1/monitoring/stats │
│                                  │
│ Aggregates from Platform DB:    │
│ ├── Organization counts by status│
│ ├── Subscription counts          │
│ ├── Revenue (total + monthly)    │
│ ├── Org type breakdown           │
│ ├── Upcoming renewals (30 days)  │
│ └── Active tenant connections    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Per-Org Monitoring                   │
│ GET /gm/api/v1/monitoring/org/:id   │
│                                      │
│ From Platform DB:                    │
│ ├── Organization details             │
│ └── Active subscription              │
│                                      │
│ From Tenant DB (via getTenantConn):  │
│ ├── User count                       │
│ └── Patient count                    │
└─────────────────────────────────────┘
```

---

## 8. Notice Broadcasting Flow

```
Grandmaster Admin
     │
     ▼
Create Notice
├── Title + Message
├── Type: info | warning | critical | maintenance
├── Target: 'all' or [specific orgIds]
├── Status: draft → published
     │
     ▼
Published notices are fetched by:
├── All organizations (target: 'all')
└── Specific organizations (target matches orgId)
     │
     ▼
Hospitals see notices on their dashboard
(⚠️ CURRENT GAP: No frontend display of GM notices
in the hospital portal yet)
```

---

## 9. Error Handling Flow

```
Controller throws error
     │
     ├── AppError (custom) → { statusCode, message }
     │
     └── Unexpected error → 500 Internal Server Error
     │
     ▼
errorHandler middleware
├── Log error details (dev mode: full stack)
├── Format response: { success: false, message, errors? }
├── Mongoose ValidationError → 400 with field errors
├── Mongoose CastError → 400 "Invalid ID"
├── Mongoose 11000 → 400 "Duplicate key"
└── Send JSON response
```
