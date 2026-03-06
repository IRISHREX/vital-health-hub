# Data Flow Diagrams (DFD)
## Vital Health Hub Platform

**Version:** 2.0  
**Date:** 2026-03-06

---

## 1. Context Diagram (Level 0 DFD)

```
                          ┌─────────────────┐
                          │   Grandmaster    │
                          │   Administrator  │
                          └────────┬────────┘
                                   │
                    Onboard Orgs, Manage Subscriptions,
                    Monitor Platform, Send Notices
                                   │
                                   ▼
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│   Hospital   │◄────────►│  Vital Health    │◄────────►│   MongoDB    │
│   Staff      │  Login,  │  Hub Platform    │  Store/  │   Atlas      │
│              │  CRUD    │                  │  Retrieve │              │
│  (Doctors,   │  Data    │  (Express API +  │  Data    │  (Platform + │
│   Nurses,    │          │   React SPA)     │          │   Tenant DBs)│
│   Admins)    │          │                  │          │              │
└──────────────┘          └──────────────────┘          └──────────────┘
                                   ▲
                                   │
                          Email Notifications
                                   │
                                   ▼
                          ┌──────────────────┐
                          │   SMTP Server    │
                          │   (Nodemailer)   │
                          └──────────────────┘
```

---

## 2. Level 1 DFD — Platform Subsystems

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Vital Health Hub Platform                          │
│                                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────────┐  │
│  │  1.0              │    │  2.0              │    │  3.0                 │  │
│  │  Grandmaster      │    │  Authentication   │    │  Hospital            │  │
│  │  Management       │    │  System           │    │  Operations          │  │
│  │                   │    │                   │    │                      │  │
│  │  - Org Onboarding │    │  - GM Login       │    │  - Patient CRUD      │  │
│  │  - Subscription   │    │  - Hospital Login  │    │  - Bed Management    │  │
│  │  - Module Control │    │  - JWT Issuing     │    │  - Admissions        │  │
│  │  - Monitoring     │    │  - RBAC Check      │    │  - Appointments      │  │
│  │  - Notices        │    │  - Password Reset  │    │  - Billing           │  │
│  └────────┬─────────┘    └────────┬─────────┘    └──────────┬───────────┘  │
│           │                       │                          │              │
│           ▼                       ▼                          ▼              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────────┐  │
│  │  4.0              │    │  5.0              │    │  6.0                 │  │
│  │  Diagnostic       │    │  Pharmacy         │    │  Reporting &         │  │
│  │  Services         │    │  Management       │    │  Analytics           │  │
│  │                   │    │                   │    │                      │  │
│  │  - Lab Tests      │    │  - Prescriptions  │    │  - Dashboard KPIs    │  │
│  │  - Radiology      │    │  - Medicine Stock  │    │  - Reports           │  │
│  │  - OT Scheduling  │    │  - Dispensing      │    │  - GM Monitoring     │  │
│  │  - Internal/Ext   │    │  - Internal/Ext    │    │  - Revenue Tracking  │  │
│  └──────────────────┘    └──────────────────┘    └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Level 2 DFD — Organization Onboarding

```
                    ┌─────────────────┐
                    │   Grandmaster   │
                    │   Admin         │
                    └───────┬─────────┘
                            │
              Org Name, Type, Address,
              Admin Email, Password,
              Enabled Modules
                            │
                            ▼
                  ┌─────────────────────┐
                  │  1.1 Validate       │
                  │  Onboarding Data    │
                  └─────────┬───────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  1.2 Generate Slug  │
                  │  & Check Uniqueness │
                  └─────────┬───────────┘
                            │
                  ┌─────────┴───────────┐
                  │                     │
                  ▼                     ▼
      ┌────────────────────┐  ┌──────────────────────┐
      │  1.3 Create Org    │  │  1.4 Create Tenant   │
      │  Record in         │  │  Database &           │
      │  Platform DB       │  │  Seed Super Admin     │
      │                    │  │                       │
      │  → GM_Organization │  │  → nh_tenant_<slug>   │
      └────────────────────┘  │  → NH_User (admin)    │
                              └──────────┬────────────┘
                                         │
                              ┌──────────┴────────────┐
                              │  1.5 Activate Org     │
                              │  status → 'active'    │
                              └───────────────────────┘
```

---

## 4. Level 2 DFD — Hospital Login (Current)

```
          ┌───────────────┐
          │  Hospital     │
          │  Staff        │
          └──────┬────────┘
                 │
           email, password
                 │
                 ▼
      ┌──────────────────────┐
      │  2.1 POST            │
      │  /nh/api/v1/auth/    │
      │  login               │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │  2.2 Lookup User     │
      │  in DEFAULT DB       │──── ⚠️ PROBLEM: Only checks
      │  User.findOne({email})│     the main/default MongoDB
      └──────────┬───────────┘     database, NOT tenant DBs
                 │
           ┌─────┴─────┐
           │           │
        Found       Not Found
           │           │
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │ Compare  │  │ Return   │
    │ Password │  │ 401      │
    └─────┬────┘  └──────────┘
          │
    ┌─────┴─────┐
    │           │
  Match     No Match
    │           │
    ▼           ▼
┌──────────┐  ┌──────────┐
│ Generate │  │ Return   │
│ JWT      │  │ 401      │
│ {id,role}│  └──────────┘
└─────┬────┘
      │
      ▼
┌──────────────────────┐
│ 2.3 Return           │
│ { user, token }      │
│                      │
│ Frontend stores in   │
│ localStorage         │
└──────────────────────┘
```

---

## 5. Level 2 DFD — Tenant-Aware Login (PROPOSED)

```
          ┌───────────────┐
          │  Hospital     │
          │  Staff        │
          └──────┬────────┘
                 │
           email, password
                 │
                 ▼
      ┌──────────────────────┐
      │  2.1 POST            │
      │  /nh/api/v1/auth/    │
      │  login               │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────────────┐
      │  2.2 Lookup Organization     │
      │  by admin email              │
      │                              │
      │  GM_Organization.findOne({   │
      │    'adminDetails.email':email│
      │  })                          │
      │                              │
      │  OR lookup mapping table:    │
      │  GM_UserOrgMapping.findOne({ │
      │    email                     │
      │  })                          │
      └──────────┬───────────────────┘
                 │
           ┌─────┴──────┐
           │            │
     Org Found      Not Found
           │            │
           ▼            ▼
   ┌───────────────┐  ┌──────────────┐
   │ Get Tenant    │  │ Fallback to  │
   │ Connection    │  │ Default DB   │
   │               │  │ (backward-   │
   │ getTenant     │  │  compatible) │
   │ Connection({  │  └──────┬───────┘
   │  dbName,dbUri │         │
   │ })            │         │
   └──────┬────────┘         │
          │                  │
          ▼                  ▼
   ┌────────────────────────────────┐
   │  2.3 Lookup User in           │
   │  TENANT Database              │
   │                               │
   │  TenantUser.findOne({email})  │
   │  .select('+password')         │
   └──────────┬────────────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │  2.4 Validate Subscription    │
   │                               │
   │  Check org.status === 'active'│
   │  Check subscription.isValid   │
   │  Check enabledModules         │
   └──────────┬────────────────────┘
              │
        ┌─────┴──────┐
        │            │
     Valid       Expired/
        │        Suspended
        │            │
        ▼            ▼
   ┌──────────┐  ┌──────────────────┐
   │ Generate │  │ Return 403       │
   │ JWT with │  │ "Subscription    │
   │ tenant   │  │  expired" or     │
   │ context  │  │ "Org suspended"  │
   │          │  └──────────────────┘
   │ {id,role,│
   │  orgId,  │
   │  dbName, │
   │  modules}│
   └─────┬────┘
         │
         ▼
   ┌──────────────────────────────┐
   │  2.5 Return Enhanced         │
   │  { user, token,              │
   │    organization: {           │
   │      id, name, slug,         │
   │      enabledModules          │
   │    }                         │
   │  }                           │
   │                              │
   │  Frontend stores org context │
   │  + filters sidebar modules   │
   └──────────────────────────────┘
```

---

## 6. Level 2 DFD — Lab Test (Dual-Mode)

```
          ┌───────────────┐
          │  Lab Tech     │
          │  / Doctor     │
          └──────┬────────┘
                 │
           mode = 'internal' | 'external'
                 │
           ┌─────┴──────────┐
           │                │
      Internal           External
           │                │
           ▼                ▼
   ┌──────────────┐  ┌──────────────────┐
   │ Select       │  │ Fill Walk-in     │
   │ Registered   │  │ Patient Form     │
   │ Patient      │  │ (name, age,      │
   └──────┬───────┘  │  gender, phone,  │
          │          │  referredBy)     │
          │          └──────┬───────────┘
          │                 │
          ▼                 ▼
   ┌────────────────────────────────┐
   │  Select Test(s) from Catalog  │
   │  + Priority + Notes           │
   └──────────┬────────────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │  POST /nh/api/v1/lab-tests    │
   │  { mode, patient OR           │
   │    externalPatient, tests }   │
   └──────────┬────────────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │  Backend validates mode:      │
   │  internal → requires patient  │
   │  external → requires inline   │
   │             patient data      │
   └──────────┬────────────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │  Create LabTest record        │
   │  Create billing record        │
   │  (separated for external)     │
   └────────────────────────────────┘
```

---

## 7. Level 2 DFD — Subscription Lifecycle

```
   ┌─────────────────┐
   │   Grandmaster   │
   │   Admin         │
   └───────┬─────────┘
           │
     Create Plan (name,
     pricing, modules)
           │
           ▼
   ┌───────────────────┐     ┌───────────────────┐
   │  GM_Subscription  │     │  GM_Subscription  │
   │  Plan             │────►│                   │
   │  (Template)       │     │  Assign to Org    │
   └───────────────────┘     │  with billing     │
                             │  cycle + dates    │
                             └────────┬──────────┘
                                      │
                            ┌─────────┴──────────┐
                            │                    │
                        Active              Approaching
                            │               Expiry
                            │                    │
                            ▼                    ▼
                     ┌──────────────┐    ┌──────────────────┐
                     │  Normal      │    │  Send Renewal    │
                     │  Operations  │    │  Reminder        │
                     └──────────────┘    └────────┬─────────┘
                                                  │
                                        ┌─────────┴──────────┐
                                        │                    │
                                    Renewed            Not Renewed
                                        │                    │
                                        ▼                    ▼
                                 ┌──────────────┐    ┌──────────────┐
                                 │  Record      │    │  grace_period │
                                 │  Payment     │    │  (7 days)     │
                                 │  Extend Date │    └──────┬───────┘
                                 └──────────────┘           │
                                                     ┌──────┴───────┐
                                                     │              │
                                                  Paid         Not Paid
                                                     │              │
                                                     ▼              ▼
                                              ┌──────────┐  ┌──────────────┐
                                              │ Reactivate│  │  expired     │
                                              └──────────┘  │  Restrict    │
                                                            │  Access      │
                                                            └──────────────┘
```

---

## 8. Data Store Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORES                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  D1: Platform Database (hospital_management)         │    │
│  │                                                      │    │
│  │  GM_GrandmasterUser  ←── GM Auth                     │    │
│  │  GM_Organization     ←── Org management               │    │
│  │  GM_SubscriptionPlan ←── Plan templates               │    │
│  │  GM_Subscription     ←── Active subscriptions         │    │
│  │  GM_PlatformNotice   ←── Notices/alerts               │    │
│  │  GM_PlatformConfig   ←── Global config                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  D2: Tenant Database (nh_tenant_<slug>)  × N         │    │
│  │                                                      │    │
│  │  NH_User             ←── Staff accounts               │    │
│  │  NH_Patient          ←── Patient records               │    │
│  │  NH_Bed              ←── Bed inventory                 │    │
│  │  NH_Admission        ←── Admission records             │    │
│  │  NH_Doctor           ←── Doctor profiles               │    │
│  │  NH_Appointment      ←── Appointments                  │    │
│  │  NH_Invoice          ←── Invoices                      │    │
│  │  NH_LabTest          ←── Lab orders (int/ext)          │    │
│  │  NH_RadiologyOrder   ←── Radiology orders (int/ext)    │    │
│  │  NH_Prescription     ←── Prescriptions (int/ext)       │    │
│  │  NH_Medicine         ←── Medicine inventory             │    │
│  │  NH_Surgery          ←── Surgery records               │    │
│  │  NH_Vital            ←── Patient vitals                 │    │
│  │  NH_Task             ←── Task assignments               │    │
│  │  NH_Notification     ←── In-app notifications           │    │
│  │  NH_Settings         ←── Tenant config                  │    │
│  │  ...and more                                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  D3: localStorage (Browser)                          │    │
│  │                                                      │    │
│  │  token       ←── JWT string                           │    │
│  │  user        ←── JSON user object                     │    │
│  │  gm_token    ←── Grandmaster JWT                      │    │
│  │  gm_user     ←── Grandmaster user object              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```
