
# Enhancements & Bug Fixes Plan

Breaking the request into 6 focused work areas. Items 5 & 6 partially overlap with already-shipped work (payment date input, day/doctor/user/due grouping, date range filter) — I'll verify and fill gaps rather than rebuild.

## 1. Patient Registration — Configurable Required Fields

**Default required:** `firstName`, `gender`, `phone` only. Everything else (lastName, DOB, email, address, blood group, etc.) becomes optional by default.

- Extend the existing **Validation Preferences** system (`src/lib/validationPreferences.js` + `ValidationPreferencesContext`) with a new per-field `required` flag (currently it only toggles UI visibility).
- Update `patient_dialog` form registry: mark only `firstName`, `gender`, `phone` as `requiredByDefault: true`.
- Update `PatientDialog` (frontend) to read the required flag and apply it to validation + asterisks.
- Update `backend/src/routes/patients.js` validators: keep `firstName`, `gender`, `phone` required; make `lastName` and `dateOfBirth` optional (still validate format when present).
- Settings UI (`src/components/settings/` Validation tab): add a "Required" toggle next to each field's visibility toggle.

## 2. Appointment Dialog — "New Patient" Button + Remove Time

- In `AppointmentDialog.jsx`, add a **+ New Patient** button next to the patient selector that opens the existing `PatientDialog` inline; on save, auto-select the newly created patient.
- Remove the **Time** input from the form. Backend still accepts a time, so default it to `00:00` (or current time) when submitting to preserve the existing schema without a migration.

## 3. Appointment Dialog — Expanded Fields

New / surfaced inputs in order:
1. Serial No. (auto-generated, read-only — derive from count of that day's appointments + 1; backend already orders by createdAt)
2. Patient name (existing selector + new-patient button)
3. Select doctor (existing)
4. Appointment date (existing, date-only)
5. **Appointment priority** — new (`routine` / `urgent` / `emergency`)
6. **Doctor fees** — new (prefilled from doctor.consultationFee, editable)
7. **Payment mode** — new (`cash` / `card` / `upi` / `net_banking` / `pending`)
8. Status (existing)
9. **Referred by** — new (free text, optionally linked to a referral doctor from #4)
10. Message / notes (existing `notes`/`reason`)

Backend (`NH_Appointment.js` model + controller): add `serialNo`, `priority`, `consultationFee`, `paymentMode`, `referredBy` fields. Serial No. computed server-side on create (per-day per-doctor). Existing receipt/token logic stays.

## 4. Doctor Tagging — Hospital vs Referral

- Extend `NH_Doctor.js` with `doctorType` enum: `hospital` (default) | `referral` | other custom tags via `tags: [String]`.
- Doctor dialog: add a "Doctor type" select + free-form tags input.
- Doctors page: add a filter chip group (All / Hospital / Referral / + tags) above the list.
- Appointment "Referred by" selector pulls from doctors where `doctorType === 'referral'` (plus free text fallback).

## 5. Date-wise Appointment Search + Payment Date in Invoice

- Appointments page: add **Date From / Date To** range filter (and a quick "Today / This Week" preset). Backend `getAppointments` already accepts `startDate`/`endDate` — wire UI to it.
- **Payment date in invoice** is already implemented (`addPayment` accepts `paidAt`, Billing dialog has the input, InvoicePreview shows "Last Payment Date"). I'll verify the PDF section actually renders the date and add it to the printed invoice header line if missing.

## 6. Billing Reports — Verify & Polish

Already shipped: day/doctor/user grouping, due-only toggle, date range filter on Billing page.

Remaining polish:
- Ensure **Reports → Billing** tab exposes a CSV/PDF export of each grouped report using the branding header/footer helper.
- Add a clear **Due Report** preset (one-click filter: groupBy=patient, dueOnly=true) with patient + outstanding amount + last payment date columns.
- Add date-range presets (Today / This Week / This Month / Custom) on both Billing and Reports pages.

## Files to Create
- `src/components/appointments/AppointmentPriorityField.jsx` (small reusable)
- No new pages.

## Files to Edit (high level)
- `src/lib/validationPreferences.js`, `src/lib/ValidationPreferencesContext.jsx`, validation Settings tab, `PatientDialog.jsx`
- `backend/src/routes/patients.js`
- `src/components/dashboard/AppointmentDialog.jsx`, `src/pages/Appointments.jsx`
- `backend/src/models/NH_Appointment.js`, `backend/src/controllers/NH_appointmentController.js`
- `backend/src/models/NH_Doctor.js`, `backend/src/controllers/NH_doctorController.js`, `src/pages/Doctors.jsx`, doctor dialog
- `src/components/dashboard/InvoicePreview.jsx` (PDF payment-date polish)
- `src/pages/Reports.jsx`, `src/pages/Billing.jsx` (presets + Due Report preset + export)

## Technical Notes
- No DB migration tool needed (Mongo, dynamic schema). Mongoose model edits suffice.
- Required-field setting is enforced both client-side (asterisk + form validation) and server-side (express-validator). Server keeps a hard minimum of `firstName + phone + gender` regardless of settings, to prevent garbage records.
- Serial No. is informational only (not unique-indexed) to avoid collisions on concurrent inserts.

## Out of Scope (please confirm if you want these)
- Migrating existing appointments to backfill `serialNo` — new appointments only.
- Sending the appointment receipt via SMS/WhatsApp (still print/PDF only).
