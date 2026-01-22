# Bed Allocation & Service Utilization Flow - Implementation Guide

## System Architecture

This document outlines the complete bed allocation, patient transfer, and service utilization tracking system for invoice generation in the Nursing Home Management System.

---

## 1. DATA MODELS

### 1.1 Patient Admission Schema

**Collection:** `admissions`

```javascript
{
  admissionId: "ADM-001",
  patient: ObjectId,
  bed: ObjectId,
  ward: "ICU",
  admittingDoctor: ObjectId,
  attendingDoctors: [ObjectId],
  admissionDate: "2026-01-20T10:30",
  expectedDischargeDate: "2026-01-25T10:30",
  actualDischargeDate: null,
  status: "ADMITTED | TRANSFERRED | DISCHARGED | DECEASED",
  
  // Service Utilization Tracking
  bedAllocations: [
    {
      bed: ObjectId,
      allocatedFrom: "2026-01-20T10:30",
      allocatedTo: "2026-01-22T14:00",
      pricePerDay: 5000,
      status: "RELEASED",
      allocatedAt: "2026-01-20T10:30"
    }
  ],
  
  // Transfer History
  transferHistory: [
    {
      fromBed: ObjectId,
      toBed: ObjectId,
      fromWard: "ICU",
      toWard: "General",
      transferDate: "2026-01-22T14:00",
      transferReason: "Improved condition",
      transferredBy: ObjectId
    }
  ],
  
  diagnosis: {
    primary: "COVID-19",
    secondary: ["Pneumonia"],
    icdCodes: ["U07.1"]
  },
  symptoms: ["Fever", "Cough"],
  treatmentPlan: "...",
  vitals: [...],
  medications: [...],
  procedures: [...],
  labTests: [...],
  dischargingDoctor: ObjectId,
  totalDays: 5
}
```

### 1.2 Bed Model Updates

**Collection:** `beds`

```javascript
{
  bedNumber: "ICU-01",
  bedType: "icu|ccu|general|semi_private|private|emergency|ventilator|pediatric|maternity",
  ward: "ICU",
  floor: 3,
  roomNumber: "301",
  status: "available|occupied|cleaning|reserved|maintenance|out_of_service",
  currentPatient: ObjectId,
  currentAdmission: ObjectId,
  pricePerDay: 5000,
  amenities: ["AC", "TV", "WiFi"],
  lastCleaned: "2026-01-20T08:00",
  lastOccupied: "2026-01-20T10:30",
  notes: "..."
}
```

### 1.3 Invoice Model for Bed Charges

**Collection:** `invoices`

```javascript
{
  invoiceNumber: "INV-001",
  patient: ObjectId,
  admission: ObjectId,
  type: "ipd",
  status: "draft|pending|partial|paid|overdue|cancelled|refunded",
  
  items: [
    {
      description: "Bed charges - ICU (ICU-01) - 3 days",
      category: "bed_charges",
      quantity: 3,
      unitPrice: 5000,
      discount: 0,
      tax: 0,
      amount: 15000
    },
    {
      description: "Bed charges - General (GEN-05) - 2 days",
      category: "bed_charges",
      quantity: 2,
      unitPrice: 3000,
      discount: 0,
      tax: 0,
      amount: 6000
    }
  ],
  
  subtotal: 21000,
  discountAmount: 0,
  totalTax: 0,
  totalAmount: 21000,
  paidAmount: 0,
  dueAmount: 21000,
  dueDate: "2026-02-20"
}
```

---

## 2. WORKFLOW & BUSINESS LOGIC

### 2.1 Admission Workflow (Create Admission)

**Endpoint:** `POST /api/admissions`

**Rules:**
- Bed status must be `available`
- One bed → one active patient
- Patient cannot have two concurrent admissions

**Process:**
1. Validate patient exists and has no active admission
2. Validate bed exists and status is `available`
3. Generate unique admission ID
4. Create admission record with status `ADMITTED`
5. Update bed status to `occupied`
6. Set bed's currentPatient and currentAdmission
7. Update patient's assignedBed and currentAdmission
8. Create initial invoice with first day bed charges
9. Emit real-time notifications

**Request Body:**
```json
{
  "patientId": "ObjectId",
  "bedId": "ObjectId",
  "admittingDoctorId": "ObjectId",
  "attendingDoctors": ["ObjectId"],
  "admissionType": "emergency|elective|transfer",
  "diagnosis": {
    "primary": "COVID-19",
    "secondary": ["Pneumonia"],
    "icdCodes": ["U07.1"]
  },
  "symptoms": ["Fever", "Cough"],
  "treatmentPlan": "...",
  "expectedDischargeDate": "2026-01-25",
  "notes": "..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient admitted successfully",
  "data": {
    "admission": { /* admission object */ },
    "invoice": "ObjectId"
  }
}
```

---

### 2.2 Transfer Workflow (Patient Transfer)

**Endpoint:** `POST /api/admissions/:admissionId/transfer`

**Rules:**
- Old bed must be released
- New bed must be available
- Transfer does NOT close admission
- Admission status remains `ADMITTED`
- Calculate charges for old bed based on duration
- Update invoice with split charges

**Process:**
1. Get current admission (must be ADMITTED)
2. Validate old and new beds exist
3. Validate new bed is available
4. Create bed utilization record for old bed with end time
5. Release old bed (status → available)
6. Allocate new bed (status → occupied)
7. Update bed allocation history in admission
8. Add transfer record to transferHistory
9. Update invoice:
   - Finalize charges for old bed
   - Add new bed charge line item
   - Recalculate totals
10. Emit notifications

**Request Body:**
```json
{
  "newBedId": "ObjectId",
  "transferReason": "Improved condition, transferred to general ward"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient transferred successfully",
  "data": {
    "admission": { /* updated admission */ },
    "oldBedCharges": 15000,
    "oldBedDays": 3
  }
}
```

**Charge Calculation Example:**
- Patient admitted to ICU on Day 1
- Transferred to General ward on Day 3 at 14:00
- Old bed (ICU): Days 1-2 + partial Day 3 = 2.5 days × 5000 = 12500
- New bed (General): From Day 3 onwards = X days × 3000

---

### 2.3 Discharge Workflow (Patient Discharge)

**Endpoint:** `POST /api/admissions/:admissionId/discharge`

**Rules:**
- Admission must be in ADMITTED status
- Close current bed allocation with end time
- Finalize invoice with all charges
- Update admission status to DISCHARGED
- Release bed to cleaning status
- Calculate total length of stay

**Process:**
1. Get admission (must be ADMITTED)
2. Get current bed
3. Calculate final bed charges from last allocation start to discharge date
4. Create final bed utilization record
5. Update bed status to `cleaning`
6. Update admission:
   - status → DISCHARGED
   - actualDischargeDate → now
   - Add to bedAllocations
7. Update patient:
   - assignedBed → null
   - currentAdmission → null
   - admissionStatus → DISCHARGED
8. Finalize invoice:
   - Update all bed charge items with actual quantities and amounts
   - Recalculate totals
   - Generate invoice number
   - status → pending (no longer draft)
9. Calculate and store total length of stay
10. Emit notifications

**Request Body:**
```json
{
  "dischargeReason": "Fully recovered",
  "dischargingDoctorId": "ObjectId",
  "notes": "Patient stable and ready for discharge"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Patient discharged successfully",
  "data": {
    "admission": { /* discharge admission */ },
    "invoice": "ObjectId",
    "totalBedCharges": 28500
  }
}
```

---

## 3. INVOICE GENERATION LOGIC

### 3.1 Invoice Lifecycle

**States:** `draft` → `pending` → `partial` → `paid`

**Initial State (On Admission):**
- Status: `draft`
- Items: Single bed charge for first day
- Amount: 1 × bedPricePerDay

**Intermediate State (On Transfer):**
- Status: `draft` (still not finalized)
- Items: Multiple bed charges (old bed finalized, new bed ongoing)
- Amount: Sum of all bed charges so far

**Final State (On Discharge):**
- Status: `pending` (finalized)
- Items: All bed charges for all allocations (finalized)
- InvoiceNumber: Generated
- Amount: Total charges for entire stay

### 3.2 Bed Charge Calculation

```javascript
// For each bed allocation:
durationInDays = Math.ceil((allocatedTo - allocatedFrom) / (1000 * 60 * 60 * 24))
bedCharge = durationInDays * pricePerDay

// Example:
// Admitted: 2026-01-20 10:30 to ICU (5000/day)
// Transferred: 2026-01-22 14:00 to General (3000/day)
// Discharged: 2026-01-25 09:00

// ICU Charges: Jan 20 10:30 → Jan 22 14:00 = 2.17 days = 3 days × 5000 = 15000
// General Charges: Jan 22 14:00 → Jan 25 09:00 = 2.8 days = 3 days × 3000 = 9000
// Total = 24000
```

### 3.3 Invoice Item Categories

```javascript
{
  category: "bed_charges",
  description: "Bed charges - [BedType] ([BedNumber]) - [X] days",
  quantity: daysStayed,
  unitPrice: bedPricePerDay,
  amount: totalBedCharges
}
```

---

## 4. API ENDPOINTS

### 4.1 Admission Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admissions` | Create new admission |
| `GET` | `/api/admissions` | List all admissions |
| `GET` | `/api/admissions/:id` | Get admission details |
| `GET` | `/api/admissions/stats` | Get admission statistics |
| `POST` | `/api/admissions/:admissionId/transfer` | Transfer patient |
| `POST` | `/api/admissions/:admissionId/discharge` | Discharge patient |

### 4.2 Query Parameters

**GET /api/admissions**
- `patientId` - Filter by patient
- `status` - Filter by status (ADMITTED, DISCHARGED, etc.)
- `bedId` - Filter by bed
- `page` - Pagination (default: 1)
- `limit` - Records per page (default: 20)

---

## 5. SERVICE UTILIZATION TRACKING

### 5.1 Bed Utilization Report

```javascript
// For reporting and billing:
admission.bedAllocations.map(allocation => ({
  bed: allocation.bed,
  allocatedFrom: allocation.allocatedFrom,
  allocatedTo: allocation.allocatedTo,
  durationDays: calculateDays(allocatedFrom, allocatedTo),
  pricePerDay: allocation.pricePerDay,
  totalCharge: calculateDays(...) * pricePerDay,
  status: allocation.status
}))
```

### 5.2 Key Metrics

- **Length of Stay (LOS):** Days from admission to discharge
- **Occupancy Rate:** (Admitted / Total Active) × 100
- **Average LOS:** Sum of all LOS / Number of discharged patients
- **Bed Utilization:** Total allocated days / Total bed capacity days

---

## 6. REAL-TIME UPDATES

### 6.1 Socket Events

```javascript
// Bed updates
emitBedUpdate(bed)
// Notification
emitNotification({
  type: 'admission|transfer|discharge',
  title: '...',
  message: '...',
  data: {...}
})
```

---

## 7. ERROR HANDLING

### Common Errors

| Error | Status | Message |
|-------|--------|---------|
| Missing fields | 400 | Missing required fields: ... |
| Patient not found | 404 | Patient not found |
| Bed not found | 404 | Bed not found |
| Bed not available | 400 | Bed is not available. Current status: ... |
| Active admission exists | 400 | Patient already has an active admission |
| Invalid status | 400 | Can only transfer patients with ADMITTED status |
| Admission not found | 404 | Admission not found |

---

## 8. USAGE EXAMPLES

### Example 1: Complete Patient Journey

```bash
# 1. Admit patient to ICU
POST /api/admissions
{
  "patientId": "60d5ec49f3e1b51234567890",
  "bedId": "60d5ec49f3e1b51234567891",
  "admittingDoctorId": "60d5ec49f3e1b51234567892",
  "admissionType": "emergency",
  "diagnosis": {"primary": "COVID-19"},
  "expectedDischargeDate": "2026-01-25"
}

# Response:
# admission: {
#   admissionId: "ADM123",
#   status: "ADMITTED",
#   bedAllocations: [{
#     bed: "60d5ec49f3e1b51234567891",
#     allocatedFrom: "2026-01-20T10:30",
#     allocatedTo: null,
#     pricePerDay: 5000
#   }]
# }
# invoice: "60d5ec49f3e1b51234567893" (with 5000 charge)

# 2. Transfer to General ward (after 3 days)
POST /api/admissions/60d5ec49f3e1b51234567894/transfer
{
  "newBedId": "60d5ec49f3e1b51234567895",
  "transferReason": "Improved condition"
}

# Response:
# admission: {
#   status: "ADMITTED",
#   bed: "60d5ec49f3e1b51234567895",
#   bedAllocations: [
#     {
#       bed: "60d5ec49f3e1b51234567891",
#       allocatedFrom: "2026-01-20T10:30",
#       allocatedTo: "2026-01-22T14:00",
#       pricePerDay: 5000,
#       status: "RELEASED"
#     }
#   ],
#   transferHistory: [{
#     fromBed: "60d5ec49f3e1b51234567891",
#     toBed: "60d5ec49f3e1b51234567895",
#     transferDate: "2026-01-22T14:00",
#     transferReason: "Improved condition"
#   }]
# }
# invoice: (Updated with split charges: 15000 for ICU + 0 for General ongoing)

# 3. Discharge patient (after 5 days total)
POST /api/admissions/60d5ec49f3e1b51234567894/discharge
{
  "dischargingDoctorId": "60d5ec49f3e1b51234567892",
  "dischargeReason": "Fully recovered",
  "notes": "Patient stable"
}

# Response:
# admission: {
#   status: "DISCHARGED",
#   actualDischargeDate: "2026-01-25T09:00",
#   bedAllocations: [
#     { allocatedFrom: ..., allocatedTo: "2026-01-22T14:00", status: "RELEASED" },
#     { allocatedFrom: "2026-01-22T14:00", allocatedTo: "2026-01-25T09:00", status: "RELEASED" }
#   ]
# }
# invoice: (Final invoice with all charges: 15000 + 9000 = 24000)
```

---

## 9. DATABASE INDEXES

Recommended indexes for performance:

```javascript
// Admissions
db.admissions.createIndex({ patient: 1, status: 1 })
db.admissions.createIndex({ bed: 1 })
db.admissions.createIndex({ admissionDate: -1 })
db.admissions.createIndex({ status: 1 })

// Beds
db.beds.createIndex({ status: 1, bedType: 1 })
db.beds.createIndex({ ward: 1, floor: 1 })
db.beds.createIndex({ currentPatient: 1 })

// Invoices
db.invoices.createIndex({ admission: 1 })
db.invoices.createIndex({ patient: 1, status: 1 })
db.invoices.createIndex({ createdAt: -1 })
```

---

## 10. TESTING CHECKLIST

- [ ] Create admission with valid bed
- [ ] Prevent admission when bed is occupied
- [ ] Prevent multiple concurrent admissions for same patient
- [ ] Transfer patient to different bed
- [ ] Verify bed charges are split correctly on transfer
- [ ] Discharge patient and finalize invoice
- [ ] Verify total charges equal sum of all bed allocations
- [ ] Test with multiple transfers in one admission
- [ ] Verify real-time bed status updates
- [ ] Test pagination and filters
- [ ] Verify admission statistics

---

## 11. FRONTEND INTEGRATION

### React Components Needed

1. **AdmissionForm** - Create new admission
2. **TransferModal** - Transfer patient dialog
3. **DischargeForm** - Discharge patient dialog
4. **AdmissionList** - List all admissions
5. **AdmissionDetail** - View admission with bed history
6. **BedUtilizationChart** - Visualize bed allocations
7. **InvoicePreview** - Show charges before discharge

### Integration Points

```javascript
// Import API functions
import { 
  createAdmission, 
  transferPatient, 
  dischargePatient,
  getAdmissions,
  getAdmissionStats
} from '@/lib/admissions';

// Usage
const handleAdmit = async (data) => {
  const result = await createAdmission(data);
  // Handle result and update UI
};

const handleTransfer = async (admissionId, newBedId) => {
  const result = await transferPatient(admissionId, { newBedId });
  // Refresh bed status and invoice
};

const handleDischarge = async (admissionId, data) => {
  const result = await dischargePatient(admissionId, data);
  // Generate invoice and show summary
};
```

---

## 12. FUTURE ENHANCEMENTS

1. **Multiple Services:** Track not just bed charges but also medication, procedures, lab tests
2. **Automatic Billing:** Generate invoices automatically at scheduled intervals
3. **Insurance Integration:** Auto-submit claims to insurance providers
4. **Revenue Reports:** Generate detailed revenue reports by bed type, ward, doctor
5. **Discharge Summary:** Auto-generate discharge summaries with treatment details
6. **Follow-up Scheduling:** Auto-schedule follow-up appointments
7. **Feedback Collection:** Post-discharge patient satisfaction surveys

---

**Last Updated:** January 20, 2026
