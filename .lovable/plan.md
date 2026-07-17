# Nursing Modules Integration Roadmap

Extends the HMS with **Return workflows across modules** plus five new nursing features: **Medicine Indent/Return, Nursing Billing, Nurse Handover (SBAR), PAC (Pre‑Anesthesia Check) Requests, Fluid I/O Charts** — all wired into the existing tenant DB, RBAC, `BillingLedger`, `StockAdjustment`, `Notification`, and Approval systems without breaking current flows.

---

## 1. Codebase Analysis (what we build on)

| Existing asset | Reuse for |
|---|---|
| `NH_Medicine`, `NH_StockAdjustment` (types: purchase/dispense/return/expired/damaged/adjustment) | Indent/Return already has `return` type — extend, don't replace |
| `NH_BillingLedger` (`sourceType`: pharmacy/nursing/procedure…, `category`: nursing/medication…) | Nursing Billing + Return credits — enums already accommodate |
| `NH_Prescription` + `dispensePrescription` | Return-against-dispense linkage |
| `NH_Admission`, `NH_Bed`, `NH_Vital` | I/O chart parenting, nursing charges by bed |
| `NH_nurseController` handover endpoint (`/nurse/handover`) | Upgrade to SBAR payload — endpoint exists, expand schema |
| `NH_ApprovalRequest` + `ApprovalGate` | PAC sign-off, high-value returns, indent approvals |
| `NH_Notification` + Socket.io | Real-time alerts for indents, PAC, handover |
| `useVisualAuth`, `rbac.js`, `PersonalPermissions` | Gate new routes with existing pattern — no new auth system |
| `Module Operations Settings` | Add nursing toggles into existing settings shell |
| Sequence generator, `tenantModel.getModel` | ID generation + multi-tenant safety |

**Non-negotiables observed:** JS/JSX only, MongoDB per tenant, `NH_` prefix on new models, blue/teal medical theme, `useSound` feedback, server-side pagination, skeleton loaders, `SettingInfo` popovers on new settings sections.

---

## 2. Cross-cutting: Return Workflow (all modules)

A single return engine used by Pharmacy, Lab, Radiology, OT, Admission billables.

**Model — `NH_ReturnRequest`** (new):
- `module` (pharmacy | lab | radiology | ot | service), `sourceType`, `sourceId` (dispense/order/invoice ref)
- `items[]` { itemRef, qty, reason, condition (unused/opened/damaged/expired) }
- `patient`, `admission`, `requestedBy`, `status` (pending/approved/rejected/completed), `approvalRequest` ref
- `refundMode` (credit_note | cash | adjust_invoice | none), `refundAmount`

**Flow (ACID via mongoose sessions):**
```text
Request → ApprovalRequest (if amount > threshold) → Approve
   ├─ Stock: create StockAdjustment(type='return', qty+)
   ├─ Ledger: reverse BillingLedger (negative amount, sourceType='return')
   ├─ Invoice: if invoice.status='paid' → credit note; else reduce line
   └─ Notify: requester + billing_staff
```

All writes wrapped in `mongoose.startSession()` + `withTransaction()` — MongoDB replica set required (Atlas has it). Idempotency key = `returnRequest._id + itemRef`.

---

## 3. Feature Modules

### 3.1 Medicine Indent / Return
- **Indent**: ward nurse requests stock from pharmacy. Model `NH_MedicineIndent` { ward, items, requestedBy, status, issuedBy, issuedAt }.
- **Issue**: pharmacist issues → `StockAdjustment(type='dispense', reference=indentId)`; no ledger entry (internal transfer).
- **Return**: unused ward stock back → `StockAdjustment(type='return')`; reverses indent qty.
- Routes: `POST/GET /pharmacy/indents`, `POST /pharmacy/indents/:id/issue|return|approve`.
- UI: new tab in `PharmacyDashboard` + widget in `NurseDashboard`.

### 3.2 Nursing Billing
- **Model** `NH_NursingCharge` { admission, chargeType (procedure|iv_line|dressing|catheter|monitoring|injection), catalogItemRef (`ServiceCatalog`), qty, performedBy, performedAt }.
- On save → auto `BillingLedger` insert (`sourceType='nursing'`, `category='nursing'`, `sourceId=nursingCharge._id`) inside a transaction.
- Reuses **Service Catalog** included-vs-billable rules — no bypass.
- UI: "Nursing Actions" panel on `PatientDetails` + bulk entry on `NursePatients`.

### 3.3 Nurse Handover (SBAR)
- Extend existing `/nurse/handover` payload:
  - `situation`, `background`, `assessment`, `recommendation` (SBAR)
  - `vitalsSnapshot` (embed last `NH_Vital`), `pendingTasks[]`, `activeIVs[]`, `alerts[]`
- Persist as `NH_Handover` (new) — keeps handover history for audit; existing endpoint becomes thin wrapper.
- PDF export via existing report utility, includes QR from `src/lib/document-codes.js`.
- Notification on submit → incoming nurse; accept/reject via existing `/handover/:id/respond`.

### 3.4 PAC (Pre‑Anesthesia Check) Requests
- **Model** `NH_PACRequest` { surgery (ref `NH_Surgery`), patient, anesthetist, status (requested|scheduled|completed|cleared|deferred), assessment{airway, ASA_grade, comorbidities, labs[], allergies, fastingStatus}, clearance{ status, notes, signedBy, signedAt } }.
- Auto-created when `CreateSurgeryDialog` schedules a surgery (backend hook in `NH_otController`).
- OT flow gated: `endSurgery` and `startSurgery` verify `pac.clearance.status='cleared'` else block with `ApprovalGate` override.
- UI: `/ot/pac` list, PAC dialog on surgery card; nurse dashboard shows "PAC due" queue.

### 3.5 Fluid I/O Charts
- **Model** `NH_FluidIO` { admission, patient, ts, direction ('in'|'out'), source (IV|Oral|NG|Urine|Drain|Vomit|Stool|Blood), volumeMl, notes, recordedBy }.
- Aggregation endpoint: `/nurse/io/:admissionId?range=shift|24h|custom` → totals + hourly buckets.
- UI: chart tab in `PatientDetails` (Recharts, already in deps), quick-entry FAB in `NurseDashboard`.
- Alert rule: negative balance > configurable threshold → `Notification` to head_nurse.

---

## 4. Data Integrity Strategy (ACID)

- **Transactions**: every write that touches ≥2 collections (stock+ledger, indent+adjustment, return+invoice, nursing charge+ledger, PAC+surgery gating) uses `session.withTransaction()`.
- **Optimistic concurrency**: `__v` version key on `Medicine.stock` and `Invoice.totals` updates; retry on `WriteConflict`.
- **Idempotency**: client mutation keys stored on new endpoints (`Idempotency-Key` header → hash into a small `NH_IdemKey` collection with TTL).
- **Audit**: reuse `NH_ActivityLog` for all new mutations; sensitive ops (return approve, PAC override) also write `GM_AuditLog`.
- **Validation triggers over CHECK**: reason/qty guards live in mongoose pre-save hooks.

---

## 5. RBAC & Settings

- New RBAC keys in `src/lib/rbac.js`: `medicine_indent`, `nursing_charges`, `handover`, `pac`, `fluid_io`, `returns`.
- Default matrix: `nurse` r/w on handover/fluid_io/indent/nursing_charges; `pharmacist` on indent issue + returns; `anesthetist`/`doctor` on PAC; `billing_staff` on return refund; `super_admin`/`hospital_admin` all.
- Module Operations Settings: add toggles under new "Nursing" section — `enableIndent`, `enableNursingBilling`, `enableFluidIO`, `enforcePACBeforeSurgery`, `returnApprovalThreshold`.
- Each section ships a `SettingInfo` popover (existing pattern).

---

## 6. Phased Delivery (5 phases, ship each independently)

```text
Phase 1 — Foundation (no user-facing break)
  ├─ Return engine (model + service + transactions + RBAC keys)
  ├─ Idempotency helper, activity log wiring
  └─ Settings toggles (default OFF for new features)

Phase 2 — Pharmacy uplift
  ├─ Medicine Indent (request → issue → return)
  ├─ Pharmacy Return against dispense (uses Phase 1 engine)
  └─ Ward stock ledger view

Phase 3 — Nursing Ops
  ├─ Nursing Billing (charges → auto ledger)
  ├─ Fluid I/O Chart + threshold alerts
  └─ Widgets on NurseDashboard

Phase 4 — Clinical handoffs
  ├─ SBAR handover model + PDF/QR export
  └─ PAC requests + OT gating (soft gate first, hard gate via setting)

Phase 5 — Cross-module returns
  ├─ Lab / Radiology / OT / Service returns using Phase 1 engine
  ├─ Credit-note invoices
  └─ Reports: returns register, nursing revenue, I/O compliance
```

Each phase has: migration script (idempotent — checks existing indexes), seed updates, RBAC defaults, feature-flag gate, e2e scenario in `KT/09_E2E_Test_Scenarios.md`.

---

## 7. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Existing pharmacy dispense flow regression | Return engine only *adds* `StockAdjustment` rows; dispense path untouched. Feature-flag Phase 2. |
| Invoice recalculation drift | Credit notes are new `Invoice` docs linked via `relatedInvoice`; original invoices immutable after payment. |
| OT PAC gate blocks legitimate emergencies | Setting `enforcePACBeforeSurgery` (soft/hard/off) + `ApprovalGate` override with audit. |
| Transactions require replica set | Confirm each tenant's Mongo URI is RS-enabled during onboarding; fallback path logs + queues rather than fails. |
| RBAC drift across 9 roles × new modules | Extend `rbac.js` matrix in one PR with unit tests in `src/test/backend-unit-test-cases.spec.ts`. |

---

## 8. Deliverables per Phase

Backend: models under `backend/src/models/NH_*.js`, controllers, routes registered in `backend/src/routes/index.js`, seed updates.
Frontend: `src/lib/*.js` API wrappers, page components under `src/pages/` and dialogs under `src/components/nursing|pharmacy|ot/`, RBAC gates via `Can`/`RestrictedAction`, sounds via `useSound`, skeletons.
Docs: update `KT/07_Module_Functionality_Reference.md`, add `KT/11_Nursing_Modules.md`, DFDs in `KT/03`.

---

**Next step:** confirm the roadmap, then I start with **Phase 1 (Return engine + settings + RBAC keys)** — no user-facing change, safe to land first.
