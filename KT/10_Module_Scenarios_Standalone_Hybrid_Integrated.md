# Module Scenarios: Standalone, Hybrid & Integrated Nursing Home
## Vital Health Hub — Operational Playbook

**Version:** 1.0  
**Date:** 2026-06-13

---

## 0. Scenario Definitions

Vital Health Hub is deployed across three operating modes. Every clinical
module must behave correctly in each one.

| Mode | Description | Patient Source | Billing | Auth Surface |
|------|-------------|----------------|---------|--------------|
| **Standalone** | Module runs as a single-purpose business (e.g. a neighbourhood lab, pharmacy, or diagnostic centre) with its own login portal. | Walk-in / external only | Module-local invoice + BillingLedger | `/lab-portal`, `/pharmacy-portal`, `/radiology-portal` |
| **Hybrid** | Module is part of the hospital but services both internal admitted/OPD patients **and** external walk-ins from the same screen. | Internal patient OR walk-in form (ModeToggle) | Unified `BillingLedger` with `source` tag | Main `/login` + module page |
| **Integrated (Full NH)** | Module is one cog in an end-to-end hospital workflow (admission → orders → results → billing → discharge). | Always an internal patient with an admission/encounter | Aggregated into admission invoice | Main `/login`, role-gated by RBAC |

Each mode reuses the same data model — the discriminator is the `mode`
(`internal` / `external`) and `portalContext` flag on orders.

---

## 1. Patient Registration

### Standalone
- Walk-in capture inline in Lab / Pharmacy / Radiology order dialogs.
- Minimal fields: first name, phone, gender, age (DOB optional per Validation Settings).
- Patient persisted with `source: "walk_in"` and no admission link.

### Hybrid
- Receptionist can search the existing patient list **or** create a walk-in on the fly via `ExternalPatientForm`.
- "Walk-in" badge surfaces wherever the patient is shown.

### Integrated
- Full `PatientDialog` with demographics, contact, insurance, medical history.
- Optional DOB / Age (toggle in Settings → Validation UI), last-name optional, mandatory phone subject to `phoneValidation` rules.
- Triggers downstream eligibility for Admissions, OPD, Vitals.

---

## 2. Appointments & Scheduler

### Standalone
- N/A for lab/pharmacy/radiology portals (queue-based, no slot booking).

### Hybrid
- Receptionist books a slot for a walk-in or registered patient; doctor invite created in `NH_ScheduleEvent`.
- 10/20/30-minute slot durations enforced; conflict check against doctor calendar.

### Integrated
- Scheduler module (`/scheduler`) shows global hospital calendar across doctors, OT rooms, equipment.
- Doctor slot endpoint (`/scheduler/doctors/:id/slots`) drives appointment booking with atomic conflict detection.
- Invitations to doctors/nurses with accept/reject response flow.
- Recurring blocks for breaks, leaves, surgeries.

---

## 3. Beds & Admissions

### Standalone
- Not applicable.

### Hybrid
- Day-care / short-stay beds bookable for procedures (e.g. minor surgery, IV infusion) without full admission.

### Integrated
- Bed grid by ward/floor with status (available / occupied / maintenance / reserved).
- Admission workflow: select patient → choose bed → assign doctor → create admission invoice.
- `AdmissionTimeline` tracks transfers, doctor changes, billing recalculation.
- Discharge summary auto-aggregates lab, radiology, pharmacy, OT, and room charges.

---

## 4. Pathology Lab — Dual-Mode

### Standalone (`/lab-portal`)
- Dedicated login (`pathologist`, `lab_technician`).
- Walk-in patient form on every order; collects payment up front.
- Catalog management and report generation identical to hybrid.
- Invoices stamped `portalContext: "lab_portal"`.

### Hybrid (`/lab`)
- `OrderLabTestDialog` with `ModeToggle` → internal patient picker **or** walk-in form.
- "Walk-in" badge throughout queue, sample collection, report screens.
- Billing routed to admission invoice for internal, to standalone invoice for walk-in.

### Integrated
- Doctor orders test from `PatientDetails` or admission screen.
- Section → Test → Parameter hierarchy with smart reference ranges (gender/age/unit).
- Sample collection queue → result entry → report PDF → billing ledger entry.
- Notification fires to doctor and nurse when report is verified.

---

## 5. Pharmacy — Dual-Mode

### Standalone (`/pharmacy-portal`)
- Pharmacist logs in, creates OTC prescription, dispenses, prints receipt.
- Stock decrement, payment recording, daily Z-report (Future Scope).

### Hybrid (`/pharmacy`)
- `PrescriptionDialog` ModeToggle: pull doctor's prescription for an internal patient **or** capture external Rx.
- `DispenseDialog` updates stock and auto-creates a `BillingLedger` row.

### Integrated
- Doctor's prescription from PatientDetails flows into pharmacy queue.
- Discharge medication aggregated into final invoice.
- `MedicineAutocomplete`, `StockAdjustDialog`, batch & expiry tracking.

---

## 6. Radiology — Dual-Mode

### Standalone (`/radiology-portal`)
- Walk-in CT/MRI/X-ray bookings, payment at order time, report dispatched by email/print.

### Hybrid (`/radiology`)
- `OrderRadiologyDialog` ModeToggle; 7-step workflow (Order → Schedule → Prep → Acquisition → Reporting → Verification → Delivery).
- Auto-invoice on order confirmation.

### Integrated
- Linked to admission and OPD encounter.
- Report PDF stored against patient record, accessible to ordering doctor and nurse in charge.

---

## 7. Operating Theatre

### Standalone
- Not offered as standalone today (roadmap: surgery centre mode).

### Hybrid
- Day-care minor procedures bookable for walk-in patients with cash billing.

### Integrated
- 12-step surgical workflow from booking through post-op notes.
- OT room conflict detection against scheduler.
- Auto-conversion of consumables and procedures into billable items on `EndSurgeryDialog` save.

---

## 8. Billing & Service Catalog

### Standalone
- Each portal generates its own invoice and writes to a partitioned `BillingLedger` (filtered by `portalContext`).

### Hybrid
- A single unified ledger per patient; walk-in and internal entries coexist.

### Integrated
- Service Master Catalog defines included vs billable items per room type (`RoomTypeService`).
- Admission, transfer, and discharge events trigger recalculation across lab, pharmacy, radiology, OT, and room charges.
- Approval gate may be required for write-offs and discounts above threshold.

---

## 9. Doctors, Nurses & Tasks

### Standalone
- Not applicable to lab/pharmacy/radiology portals beyond the assigned staff list.

### Hybrid
- Walk-in module orders may be assigned to a doctor for verification (e.g., lab report sign-off).

### Integrated
- Doctor and nurse directories, room/floor assignment, handover request/response flow via notifications.
- Tasks board with delegation; staff dashboards (Doctor, Nurse, OPD) show personal queues.
- Personal Permissions layered on global RBAC for fine-grained delegation.

---

## 10. Vitals

### Standalone
- N/A.

### Hybrid / Integrated
- Quick vital entry from dashboard, nurse, or doctor screens.
- Linked to admission timeline; abnormal vitals trigger notifications.

---

## 11. Notifications

All modes share the notification subsystem:

- 30-second polling + Socket.io live push.
- Types: bed availability, appointment reminder, invoice generated, lab/radiology report ready, handover request/response, approval pending, SLA breach, platform notice, subscription expiry.
- Broadcast support for admins; header badge + `/notifications` feed.

Per mode:
- **Standalone:** module-scoped events only.
- **Hybrid:** module events + cross-module hand-offs (e.g., lab report ready → notify ordering doctor).
- **Integrated:** full graph of dependencies (admission → orders → bills → discharge).

---

## 12. Approvals

### Standalone
- Light-touch: discount above threshold may require approval by a portal admin.

### Hybrid / Integrated
- `ApprovalGate` wraps gated actions; rules defined in Settings → Approvals.
- Soft and hard gates, SLA, escalation, reassignment.
- `ApprovalsManager` for reviewers; diagnostics screen for admins.

---

## 13. Reports

### Standalone
- Module-scoped (daily collection, dispensing log, modality utilisation).

### Hybrid
- Same plus walk-in vs internal split.

### Integrated
- Cross-module reports: occupancy, revenue, doctor productivity, payer mix, discharge TAT.
- `ReportEditor` with contentEditable preview and PDF export.

---

## 14. Settings

All modes expose Settings filtered by role and module-access:

- Profile, Hospital Info, Branding, Sound (UI feedback), Theme.
- DOB/Age Validation, Validation UI, Approvals, Module Operations.
- Visual Access (per-user UI restrictions) + Personal Permissions panel.
- Each section now carries an `(i)` `SettingInfo` popover with purpose and precaution copy sourced from KT docs.

---

## 15. Grandmaster (Platform) — Affects All Modes

- Onboards organisations with module mix (which modules are enabled).
- `useVisualAuth` enforces enabled modules even for super-admins.
- Audit log (`GM_AuditLog`) tracks sensitive platform actions.
- Subscription / plan management gates module access (enforcement on roadmap, see 06).

---

## 16. End-to-End Cross-Module Scenarios

### S1. Integrated NH — Admission with Lab + Pharmacy + Discharge
1. Receptionist registers patient and admits to a bed.
2. Doctor orders blood panel from PatientDetails (mode = internal).
3. Lab section accepts sample, enters results, verifies → notification to doctor.
4. Doctor prescribes medication; pharmacy dispenses → BillingLedger updated.
5. Doctor initiates discharge → invoice aggregates room + lab + pharmacy charges → approval if discount > threshold → final invoice printed.

### S2. Hybrid Lab — Walk-in Plus Admitted Patient Same Shift
1. Lab technician opens OrderLabTestDialog.
2. Toggles to External, captures walk-in patient, books CBC, collects cash.
3. Toggles back to Internal for next order from the admission queue.
4. Both flow into the same SampleCollectionQueue with a "Walk-in" badge differentiating sources.
5. Daily report shows split by `mode` for reconciliation.

### S3. Standalone Pharmacy — Independent Operations
1. Pharmacist logs into `/pharmacy-portal`.
2. Walk-in customer presents external Rx; pharmacist creates prescription record.
3. Dispenses meds, stock decrements, invoice prints.
4. Day-end Z-report exported.

### S4. Standalone Radiology Centre with Referring Doctor
1. Front desk logs into `/radiology-portal`.
2. Walk-in patient registered with external referring doctor name captured.
3. Order placed → modality scheduled → technician acquires → radiologist reports.
4. Report PDF emailed / printed; invoice paid at counter.

### S5. Approval-Gated Action
1. Billing staff applies 30% discount on a discharge invoice.
2. ApprovalGate detects threshold breach → creates `NH_ApprovalRequest`.
3. Notification to approver role; SLA timer starts.
4. Approver accepts/rejects in `ApprovalsManager`; outcome notification back to requester.

### S6. Scheduler Conflict Resolution
1. Receptionist tries to book Dr. A at a time overlapping an existing OT.
2. Atomic conflict check rejects with a clear error.
3. Alternative slots fetched from `/scheduler/doctors/:id/slots` and offered.

---

## 17. Mode-Compatibility Matrix

| Module | Standalone | Hybrid | Integrated |
|--------|:----------:|:------:|:----------:|
| Patient Registration | ✅ (walk-in) | ✅ | ✅ |
| Appointments / Scheduler | ❌ | ✅ | ✅ |
| Beds & Admissions | ❌ | ⚠️ (day-care) | ✅ |
| Pathology Lab | ✅ | ✅ | ✅ |
| Pharmacy | ✅ | ✅ | ✅ |
| Radiology | ✅ | ✅ | ✅ |
| OT | ❌ | ⚠️ | ✅ |
| Billing | ✅ (module-local) | ✅ | ✅ |
| Doctors / Nurses / Tasks | ⚠️ (staff only) | ✅ | ✅ |
| Vitals | ❌ | ✅ | ✅ |
| Notifications | ✅ (scoped) | ✅ | ✅ |
| Approvals | ⚠️ (light) | ✅ | ✅ |
| Reports | ✅ (scoped) | ✅ | ✅ |
| Settings | ✅ (scoped) | ✅ | ✅ |

Legend: ✅ supported · ⚠️ limited / roadmap · ❌ not applicable

---

## 18. Where the Mode Lives in Code

- `NH_LabTest.mode`, `NH_RadiologyOrder.mode`, `NH_Prescription.mode` — `internal` / `external`.
- `portalContext` on invoices and audit entries — `main`, `lab_portal`, `pharmacy_portal`, `radiology_portal`.
- `PortalContext` (React) — drives sidebar, branding, and API base URL for standalone portals.
- `useVisualAuth` — hides modules disabled at the organisation level.
- `ModeToggle` component — used by Lab, Radiology, Pharmacy order dialogs.

---

## 19. Test Coverage Mapping

See `09_E2E_Test_Scenarios.md` — every scenario above maps to one or more
E2E IDs. New scenarios introduced here (S1–S6) should be appended to the
E2E catalogue on the next test pass.
