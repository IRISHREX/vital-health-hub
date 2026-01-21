# Bed Allocation System - Flow Diagrams

## 1. Patient Admission Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PATIENT ADMISSION                                         │
└─────────────────────────────────────────────────────────────┘

                         POST /api/admissions
                              │
                              ▼
                  ┌─────────────────────────┐
                  │ Validate Request        │
                  │ - Patient exists?       │
                  │ - No active admission?  │
                  │ - Bed available?        │
                  └────────┬────────────────┘
                           │
                           ▼
                  ┌─────────────────────────┐
                  │ Create Admission Record │
                  │ - Set status: ADMITTED  │
                  │ - Generate admission ID │
                  │ - Record bed allocation │
                  └────────┬────────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
           ┌──────────────┐  ┌──────────────┐
           │ Update Bed   │  │ Update       │
           │ - Status:    │  │ Patient      │
           │   occupied   │  │ - Bed:       │
           │ - Current    │  │   assigned   │
           │   patient    │  │ - Admission: │
           │ - Current    │  │   set        │
           │   admission  │  └──────┬───────┘
           └──────────────┘         │
                    │               │
                    └───────┬───────┘
                            ▼
                  ┌─────────────────────────┐
                  │ Create Initial Invoice  │
                  │ - Status: draft         │
                  │ - Item: bed charge (1d) │
                  │ - Amount: 1 × price/day │
                  └────────┬────────────────┘
                           │
                           ▼
                  ┌─────────────────────────┐
                  │ Emit Real-time Update   │
                  │ - Bed status            │
                  │ - Notification          │
                  └────────┬────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │ Return: 201 OK  │
                   │ admission + inv │
                   └─────────────────┘
```

---

## 2. Patient Transfer Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 2. PATIENT TRANSFER (Bed/Ward Change)                        │
└─────────────────────────────────────────────────────────────┘

          POST /api/admissions/:id/transfer
                     │
                     ▼
          ┌──────────────────────┐
          │ Validate Request     │
          │ - Admission ADMITTED?│
          │ - Old bed exists?    │
          │ - New bed available? │
          │ - Not same bed?      │
          └─────────┬────────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │ Calculate Old Bed    │
          │ Charges              │
          │ Days = allocation_to │
          │        - from        │
          │ Charge = days ×      │
          │          price/day   │
          └─────────┬────────────┘
                    │
            ┌───────┴────────┐
            ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │ Old Bed      │  │ New Bed      │
    │ - Release    │  │ - Allocate   │
    │   (update    │  │   (update    │
    │   allocate   │  │    bed       │
    │   _to)       │  │    status)   │
    │ - Status:    │  │ - Status:    │
    │   available  │  │   occupied   │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    ▼
          ┌──────────────────────┐
          │ Add to Bed Allocations│
          │ and Transfer History │
          │ - bed allocation     │
          │ - transfer record    │
          └─────────┬────────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │ Update Invoice       │
          │ - Finalize old bed   │
          │   charge            │
          │ - Add new bed charge │
          │ - Recalculate total │
          └─────────┬────────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │ Update Patient's     │
          │ Assigned Bed         │
          └─────────┬────────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │ Emit Real-time       │
          │ Updates              │
          └─────────┬────────────┘
                    │
                    ▼
           ┌────────────────────┐
           │ Return: 200 OK     │
           │ oldBedCharges      │
           │ oldBedDays         │
           └────────────────────┘
```

---

## 3. Patient Discharge & Invoice Finalization

```
┌─────────────────────────────────────────────────────────────┐
│ 3. PATIENT DISCHARGE                                         │
└─────────────────────────────────────────────────────────────┘

     POST /api/admissions/:id/discharge
              │
              ▼
    ┌──────────────────────┐
    │ Validate Request     │
    │ - Admission ADMITTED?│
    │ - Doctor selected?   │
    └─────────┬────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ Calculate Final      │
    │ Charges              │
    │ Days = discharge_date│
    │        - last_alloc  │
    │ Charge = days ×      │
    │          price/day   │
    └─────────┬────────────┘
              │
        ┌─────┴─────┬─────────┐
        ▼           ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │Update  │ │Finalize│ │Finalize│
    │Bed     │ │All Bed │ │Invoice │
    │Status: │ │Charges │ │Status: │
    │cleaning│ │in Items│ │pending │
    └────┬───┘ └───┬────┘ └───┬────┘
         │         │          │
         └─────┬───┴──────┬───┘
               ▼          ▼
    ┌──────────────────────────┐
    │ Generate Invoice Number  │
    │ (INV-xxx)                │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Update Admission         │
    │ - Status: DISCHARGED     │
    │ - actualDischargeDate    │
    │ - Add discharge notes    │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Update Patient           │
    │ - assignedBed: null      │
    │ - currentAdmission: null │
    │ - admissionStatus:       │
    │   DISCHARGED             │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Emit Real-time Updates   │
    │ - Bed update             │
    │ - Notifications          │
    └──────────┬───────────────┘
               │
               ▼
    ┌─────────────────────────┐
    │ Return: 200 OK          │
    │ admission               │
    │ invoice ID              │
    │ totalBedCharges         │
    └─────────────────────────┘
```

---

## 4. Invoice Charge Calculation Example

```
┌─────────────────────────────────────────────────────────────┐
│ EXAMPLE: Multi-bed Stay with Transfer                       │
└─────────────────────────────────────────────────────────────┘

Patient Journey:
─────────────────────────────────────────────────────────────

Date        Time    Event               Bed        Ward
─────────────────────────────────────────────────────────────
Jan 20      10:30   ADMITTED            ICU-01     ICU
Jan 22      14:00   TRANSFERRED         GEN-05     General  
Jan 25      09:00   DISCHARGED          -          -


Charge Calculation:
─────────────────────────────────────────────────────────────

BED 1: ICU-01 (Price: ₹5,000/day)
  From: Jan 20, 10:30
  To:   Jan 22, 14:00
  Duration: 2 days 3.5 hours = 3 days (rounded up)
  Charge: 3 × ₹5,000 = ₹15,000


BED 2: GEN-05 (Price: ₹3,000/day)
  From: Jan 22, 14:00
  To:   Jan 25, 09:00
  Duration: 2 days 19 hours = 3 days (rounded up)
  Charge: 3 × ₹3,000 = ₹9,000


TOTAL: ₹15,000 + ₹9,000 = ₹24,000


Invoice Items:
─────────────────────────────────────────────────────────────

Item 1: Bed charges - ICU (ICU-01) - 3 days
  Quantity: 3 days
  Unit Price: ₹5,000/day
  Amount: ₹15,000

Item 2: Bed charges - General (GEN-05) - 3 days
  Quantity: 3 days
  Unit Price: ₹3,000/day
  Amount: ₹9,000

─────────────────────────────────────────────────────────────
TOTAL AMOUNT: ₹24,000
PAID AMOUNT:  ₹0
DUE AMOUNT:   ₹24,000
```

---

## 5. Database State Changes

```
┌─────────────────────────────────────────────────────────────┐
│ DATABASE STATE TRANSITIONS                                   │
└─────────────────────────────────────────────────────────────┘

ADMISSION DOCUMENT:
────────────────────────────────────────────────────────────

Initial (At Admission):
{
  admissionId: "ADM-001",
  patient: "P001",
  bed: "B1",
  status: "ADMITTED",
  admissionDate: "2026-01-20T10:30",
  actualDischargeDate: null,
  bedAllocations: [
    {
      bed: "B1",
      allocatedFrom: "2026-01-20T10:30",
      allocatedTo: null,          ← Still ongoing
      pricePerDay: 5000,
      status: "ALLOCATED"
    }
  ],
  transferHistory: []
}

After Transfer:
{
  admissionId: "ADM-001",
  patient: "P001",
  bed: "B2",                      ← Changed to new bed
  status: "ADMITTED",             ← Still admitted
  bedAllocations: [
    {
      bed: "B1",
      allocatedFrom: "2026-01-20T10:30",
      allocatedTo: "2026-01-22T14:00",   ← Now closed
      pricePerDay: 5000,
      status: "RELEASED"
    }
  ],
  transferHistory: [
    {
      fromBed: "B1",
      toBed: "B2",
      transferDate: "2026-01-22T14:00",
      transferReason: "Improved"
    }
  ]
}

After Discharge:
{
  admissionId: "ADM-001",
  patient: "P001",
  bed: "B2",
  status: "DISCHARGED",           ← Changed
  admissionDate: "2026-01-20T10:30",
  actualDischargeDate: "2026-01-25T09:00",  ← Set
  totalDays: 5,                   ← Calculated
  bedAllocations: [
    {
      bed: "B1",
      allocatedFrom: "2026-01-20T10:30",
      allocatedTo: "2026-01-22T14:00",
      pricePerDay: 5000,
      status: "RELEASED"
    },
    {
      bed: "B2",
      allocatedFrom: "2026-01-22T14:00",
      allocatedTo: "2026-01-25T09:00",   ← Finalized
      pricePerDay: 3000,
      status: "RELEASED"
    }
  ]
}


BED DOCUMENT:
────────────────────────────────────────────────────────────

Before Admission (BED-01):
{ status: "available", currentPatient: null, currentAdmission: null }
         │
         ▼ (On admission)
{ status: "occupied", currentPatient: "P001", currentAdmission: "ADM-001" }
         │
         ▼ (On transfer OUT)
{ status: "available", currentPatient: null, currentAdmission: null }

Before Transfer (BED-02):
{ status: "available", currentPatient: null, currentAdmission: null }
         │
         ▼ (On transfer IN)
{ status: "occupied", currentPatient: "P001", currentAdmission: "ADM-001" }
         │
         ▼ (On discharge)
{ status: "cleaning", currentPatient: null, currentAdmission: null }


PATIENT DOCUMENT:
────────────────────────────────────────────────────────────

Before Admission:
{ assignedBed: null, currentAdmission: null, admissionStatus: "DISCHARGED" }
         │
         ▼ (On admission)
{ assignedBed: "B1", currentAdmission: "ADM-001", admissionStatus: "ADMITTED" }
         │
         ▼ (On transfer)
{ assignedBed: "B2", currentAdmission: "ADM-001", admissionStatus: "ADMITTED" }
         │
         ▼ (On discharge)
{ assignedBed: null, currentAdmission: null, admissionStatus: "DISCHARGED" }


INVOICE DOCUMENT:
────────────────────────────────────────────────────────────

Initial (On Admission):
{
  status: "draft",
  items: [
    { description: "Bed charges - ICU (ICU-01)",
      quantity: 1, unitPrice: 5000, amount: 5000 }
  ],
  subtotal: 5000,
  totalAmount: 5000,
  invoiceNumber: null
}
         │
         ▼ (On transfer)
{
  status: "draft",
  items: [
    { description: "Bed charges - ICU (ICU-01) - 3 days",
      quantity: 3, unitPrice: 5000, amount: 15000 },
    { description: "Bed charges - GEN (GEN-05)",
      quantity: 0, unitPrice: 3000, amount: 0 }
  ],
  subtotal: 15000,
  totalAmount: 15000,
  invoiceNumber: null
}
         │
         ▼ (On discharge)
{
  status: "pending",
  items: [
    { description: "Bed charges - ICU (ICU-01) - 3 days",
      quantity: 3, unitPrice: 5000, amount: 15000 },
    { description: "Bed charges - GEN (GEN-05) - 3 days",
      quantity: 3, unitPrice: 3000, amount: 9000 }
  ],
  subtotal: 24000,
  totalAmount: 24000,
  invoiceNumber: "INV-001"
}
```

---

## 6. Real-time Updates Flow

```
┌─────────────────────────────────────────────────────────────┐
│ REAL-TIME UPDATES (WebSocket)                               │
└─────────────────────────────────────────────────────────────┘

                    Backend Event
                         │
                         ▼
        ┌────────────────────────────────┐
        │ emitBedUpdate(bed)             │
        │ - Send updated bed object      │
        │ - All connected clients listen │
        └────────────┬───────────────────┘
                     │
        ┌────────────┴───────────────────┐
        ▼                                 ▼
    Frontend                         Other Clients
    Component                        See Updated
    Updates                          Status
    - Bed List
    - Bed Status Badge
    - Available Beds


        ┌────────────────────────────────┐
        │ emitNotification({})           │
        │ - Type: admission|transfer|... │
        │ - Title & Message              │
        └────────────┬───────────────────┘
                     │
        ┌────────────┴───────────────────┐
        ▼                                 ▼
    Toast Alert                    Activity Log
    - Real-time popup              - Timestamp
    - Auto-dismiss                 - Event details
```

---

## 7. API Response Structure

```javascript
// Successful Admission
{
  "success": true,
  "message": "Patient admitted successfully",
  "data": {
    "admission": {
      "_id": "60d5ec49f1b51234567890",
      "admissionId": "ADM-001",
      "patient": { /* patient object */ },
      "bed": { /* bed object */ },
      "status": "ADMITTED",
      "admissionDate": "2026-01-20T10:30",
      "bedAllocations": [
        {
          "bed": "60d5ec49f1b51234567891",
          "allocatedFrom": "2026-01-20T10:30",
          "allocatedTo": null,
          "pricePerDay": 5000,
          "status": "ALLOCATED"
        }
      ]
    },
    "invoice": "60d5ec49f1b51234567892"
  }
}

// Successful Transfer
{
  "success": true,
  "message": "Patient transferred successfully",
  "data": {
    "admission": { /* updated admission */ },
    "oldBedCharges": 15000,
    "oldBedDays": 3
  }
}

// Successful Discharge
{
  "success": true,
  "message": "Patient discharged successfully",
  "data": {
    "admission": { /* discharged admission */ },
    "invoice": "60d5ec49f1b51234567892",
    "totalBedCharges": 24000
  }
}

// Error Response
{
  "success": false,
  "message": "Bed is not available. Current status: occupied",
  "statusCode": 400
}
```

---

**Last Updated:** January 20, 2026
