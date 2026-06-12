# End-to-End Test Scenarios

**Version:** 1.0
**Date:** 2026-06-12
**Scope:** Notifications · Approvals · Scheduler

> Run all scenarios after `npm run seed` and against a fresh tenant DB. Use the
> seeded accounts in `backend/src/seeders/credentials.md` (password `Sohel@34892`).

---

## A. Notifications (30 s polling, header badge, in-app + email)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| N1 | `bed_available` | Discharge a patient occupying bed B1 | All nurses + receptionists get an in-app toast within ≤30 s; header badge increments; row appears in `/notifications` |
| N2 | `bed_assigned` | Admit a new patient and pick a bed | Assigned nurse + admitting doctor get notification linking to admission |
| N3 | `patient_admitted` | Create admission | Doctor + ward nurses notified, link → `/admissions/:id` |
| N4 | `patient_discharged` | Discharge flow → final invoice | Billing staff notified; link → invoice |
| N5 | `appointment_scheduled` | Receptionist books appt | Doctor notified; appears in doctor dashboard |
| N6 | `appointment_reminder` | Wait until T-30 min before appt | Patient (if SMS configured) + doctor get reminder |
| N7 | `appointment_cancelled` | Cancel future appt | Doctor + receptionist notified |
| N8 | `invoice_generated` | Discharge / OPD billing | Billing staff + patient (email) notified |
| N9 | `payment_received` | Record payment | Billing staff notified, payment date stamped on invoice |
| N10 | `payment_overdue` | Manually age an invoice > 30 d | Daily cron raises overdue notification, priority=high |
| N11 | `schedule_update` | Edit existing scheduler event | All invitees re-notified |
| N12 | `leave_approved` | Approve nurse leave | Requesting nurse + head nurse notified |
| N13 | `access_request` | User submits visual-access request | Hospital admin notified, requires acknowledgement |
| N14 | `access_request_resolved` | Admin approves/rejects | Original requester notified |
| N15 | `handover_request` / `handover_response` | Shift handover flow | Both parties notified |
| N16 | `prescription_shared` | Doctor shares Rx with pharmacy | Pharmacist notified, link → prescription |
| N17 | `system` / `alert` / `info` | Grandmaster broadcast | All targeted users see notice; respects audience filter |
| N18 | Mark-as-read | Click bell → click notification | Badge decrements; `readAt` set on backend |
| N19 | Mark-all-as-read | Header dropdown action | All unread cleared; badge = 0 |
| N20 | Clear read | `/notifications` page → Clear read | Read items removed from DB |
| N21 | Acknowledge | Open an acknowledgement-required item | `acknowledgedAt` + `acknowledgedBy` set; cannot delete until acknowledged |

**Checks each time**
- Network call `GET /notifications` runs every 30 s.
- Email delivery (`emailSent=true`, `emailSentAt` populated) when channel enabled in Settings → Notifications.
- Priority colour matches (`low` muted → `urgent` red).

---

## B. Approval Workflows

### Setup
1. Settings → Approval Workflows → create rules:
   - **R1** Soft, module=patients, action=delete, approver=role:hospital_admin, SLA=2 h, escalate=email:superadmin@example.com.
   - **R2** Hard, module=billing, action=edit (actionLabel=refund), custom form (amount, reason), approver=email:billingstaff@example.com, SLA=1 h.

### Scenarios
| # | Scenario | Expected |
|---|---|---|
| AP1 | Requester triggers a gated action with no matching rule | Action proceeds normally |
| AP2 | Hard-blocking rule (R2): requester submits | Underlying action **blocked** until approval; row in `/approvals` inbox |
| AP3 | Soft rule (R1): requester submits | Action proceeds, request logged with status=pending |
| AP4 | Approver approves R2 | Action executes; requester notified; `reviewedAt/By` set |
| AP5 | Approver rejects R2 with comment | Action does **not** execute; requester sees rejection reason |
| AP6 | SLA breach: leave R1 untouched > 2 h, run `POST /approvals/escalate` | `escalated=true`, `escalationTo` populated, escalation email fired |
| AP7 | Reassign request to another approver | Original approver loses it; new one sees it |
| AP8 | Disable rule → trigger action again | Treated as no-rule (AP1) |
| AP9 | Form validation: required field missing | Submit blocked with inline error |
| AP10 | Audit | `GM_AuditLog` (if grandmaster) / activity log records create/approve/reject |

---

## C. Scheduler

### Pre-conditions
- ≥2 doctors with working hours configured.
- ≥1 patient.

### Scenarios
| # | Scenario | Expected |
|---|---|---|
| SC1 | `GET /scheduler/events?from&to` | Returns only events overlapping window |
| SC2 | Create event (meeting) | Returns event, appears for all invitees |
| SC3 | Create event with overlapping doctor slot | 409 / inline error "doctor unavailable" |
| SC4 | Update event (move time) | Invitees get `schedule_update` notification (N11) |
| SC5 | Delete event | Disappears from calendar; cancellation notice sent |
| SC6 | Invite response (accept/decline) | Per-attendee status updated; calendar colour reflects state |
| SC7 | Create block (doctor unavailable) | Subsequent booking attempts in window fail |
| SC8 | `GET /scheduler/doctors/:id/slots?date&duration=30` | Returns only free 30-min windows respecting blocks + existing appointments |
| SC9 | `bookAppointment` with valid slot | Creates Appointment + ScheduleEvent atomically; serial no. assigned |
| SC10 | `bookAppointment` with conflict | Rejected; no partial records |
| SC11 | Allowed durations check | 10/20/30 min accepted, 25 min rejected |
| SC12 | RBAC | Nurse can read calendar, cannot `bookAppointment`; receptionist can |
| SC13 | Cross-doctor view (filter) | Calendar filter by doctor returns only their events |
| SC14 | Recurring event (if enabled) | Series created; editing single occurrence does not affect series |
| SC15 | Print / export day view | PDF includes all events of selected date |

---

## D. Manual Verification Checklist

For each scenario above, capture:
- HTTP status + response body
- Console errors (should be **none**)
- Notification badge delta
- Audit log entry (where applicable)
- Email/SMS delivery (if configured)

Record results in `KT/test-runs/<YYYY-MM-DD>.md`.
