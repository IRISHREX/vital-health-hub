# Unit Test Case Catalog
## Vital Health Hub

**Version:** 1.0  
**Date:** 2026-03-07

This document defines the backend unit test case distribution and where the runnable catalog lives.

## Scope
- Backend hospital modules under `backend/src/controllers/*`
- Supporting permission logic under:
  - `backend/src/middleware/auth.js`
  - `backend/src/utils/assignmentPermissions.js`
  - `backend/src/utils/moduleOperationsSettings.js`

## Runnable Catalog
- Vitest catalog file: `src/test/backend-unit-test-cases.spec.ts`
- Total planned unit test cases: **200**
- Format:
  - `it.todo(...)` for each case
  - One structural assertion confirms catalog size is exactly 200

## Coverage Distribution
| Module | Target Cases | Primary Sources |
|---|---:|---|
| Dashboard | 9 | `NH_dashboardController.js` |
| Bed Management | 15 | `NH_bedController.js` |
| Admissions | 20 | `NH_admissionController.js` |
| Patients | 15 | `NH_patientController.js` |
| Doctors | 10 | `NH_doctorController.js` |
| Nurses | 10 | `NH_nurseController.js` |
| Appointments | 15 | `NH_appointmentController.js` |
| Pathology Lab | 20 | `NH_labTestController.js` |
| Radiology | 10 | `NH_radiologyController.js` |
| Pharmacy | 25 | `NH_pharmacyController.js` |
| Billing | 25 | `NH_invoiceController.js`, `NH_billingLedgerController.js` |
| Notifications | 8 | `NH_notificationController.js` |
| Reports | 9 | `NH_reportController.js` |
| Settings & Permissions | 9 | `NH_settingsController.js`, `NH_personalPermissionController.js`, `auth.js`, `assignmentPermissions.js`, `moduleOperationsSettings.js` |

## Test Design Notes
- Cases are derived from current code-level behavior:
  - validation branches
  - database operations
  - calculations
  - permission checks
  - workflow/state transitions
- Many modules mix domain logic with persistence and side effects (`emitNotification`, `emitBedUpdate`, invoice/ledger writes). Unit implementation should mock models and external emitters.
- Recommended implementation order:
  1. Billing, Admissions, Pharmacy (highest regression and financial risk)
  2. Beds, Appointments, Settings/Permissions
  3. Remaining modules

## Next Implementation Step
- Convert `todo` cases to executable tests module by module with:
  - model-layer mocks (`findById`, `findOne`, `countDocuments`, `aggregate`, `create`, `save`, `updateMany`)
  - explicit request/response stubs (`req`, `res`, `next`)
  - side-effect assertions for invoice, ledger, and notification updates
