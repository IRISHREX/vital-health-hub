# Bed Allocation System - Quick Setup Guide

## 📋 Overview

A complete bed allocation and service utilization tracking system for the Nursing Home Management System. This system handles:

- ✅ Patient admission with bed allocation
- ✅ Patient transfers between beds/wards
- ✅ Patient discharge with final billing
- ✅ Automatic invoice generation with split charges
- ✅ Real-time bed status updates

---

## 🚀 What's Been Implemented

### Backend (Node.js/Express)

#### 1. **New Admission Controller** (`src/controllers/NH_admissionController.js`)
   - `createAdmission()` - Admit patient to a bed
   - `transferPatient()` - Transfer patient to different bed
   - `dischargePatient()` - Discharge and finalize invoice
   - `getAdmissions()` - List all admissions
   - `getAdmission()` - Get admission details
   - `getAdmissionStats()` - Admission statistics

#### 2. **Updated Models**
   - **NH_Admission.js** - Added `bedAllocations` and `transferHistory` arrays
   - **NH_Patient.js** - Added `currentAdmission` and `admissionStatus` fields
   - **Status enum** - Changed to uppercase: `ADMITTED | TRANSFERRED | DISCHARGED | DECEASED`

#### 3. **New Routes** (`src/routes/admissions.js`)
   ```
   POST   /api/admissions                    - Create admission
   GET    /api/admissions                    - List admissions
   GET    /api/admissions/:id                - Get admission details
   GET    /api/admissions/stats              - Get statistics
   POST   /api/admissions/:id/transfer       - Transfer patient
   POST   /api/admissions/:id/discharge      - Discharge patient
   ```

#### 4. **Invoice Integration**
   - Automatic invoice creation on admission
   - Split charges on patient transfer
   - Final invoice generation on discharge
   - Charges calculated based on actual bed duration

### Frontend (React)

#### 1. **API Integration** (`src/lib/admissions.ts`)
   ```javascript
   createAdmission(data)           // Create new admission
   getAdmissions(filters)          // List admissions
   getAdmission(id)                // Get admission
   transferPatient(id, data)       // Transfer patient
   dischargePatient(id, data)      // Discharge patient
   getAdmissionStats()             // Get statistics
   
   // Utility functions
   calculateBedCharges(from, to, price)
   getStatusColor(status)
   formatAdmissionData(admission)
   getAdmissionBedHistory(admission)
   generateInvoiceSummary(admission, invoice)
   ```

#### 2. **React Components**

   **AdmissionForm.jsx** - Create new admission
   ```jsx
   <AdmissionForm onAdmissionCreated={handleAdmitted} onClose={handleClose} />
   ```
   - Patient selection
   - Bed selection
   - Doctor selection
   - Diagnosis and symptoms
   - Treatment plan
   - Expected discharge date

   **AdmissionActionModal.jsx** - View, transfer, discharge
   ```jsx
   <AdmissionActionModal 
     admission={admission} 
     isOpen={isOpen} 
     onClose={handleClose}
     onActionComplete={handleRefresh}
   />
   ```
   - View admission details
   - Transfer to different bed (with charge preview)
   - Discharge patient (with doctor selection)

---

## 📖 Workflow Examples

### Example 1: Admit Patient to ICU

```bash
POST /api/admissions
{
  "patientId": "P001",
  "bedId": "BED-ICU-01",
  "admittingDoctorId": "DOC-001",
  "admissionType": "emergency",
  "diagnosis": { "primary": "COVID-19" },
  "symptoms": ["Fever", "Cough"],
  "expectedDischargeDate": "2026-01-25"
}

Response:
{
  "success": true,
  "data": {
    "admission": {
      "admissionId": "ADM-001",
      "status": "ADMITTED",
      "patient": {...},
      "bed": {...},
      "bedAllocations": [
        {
          "bed": "BED-ICU-01",
          "allocatedFrom": "2026-01-20T10:30",
          "allocatedTo": null,
          "pricePerDay": 5000,
          "status": "ALLOCATED"
        }
      ]
    },
    "invoice": "INV-001"
  }
}
```

**What happens:**
1. ✅ Admission record created
2. ✅ Bed status: `available` → `occupied`
3. ✅ Bed's `currentPatient` and `currentAdmission` updated
4. ✅ Patient's `assignedBed` and `currentAdmission` updated
5. ✅ Initial invoice created with ₹5000 charge (first day)
6. ✅ Real-time notification sent

---

### Example 2: Transfer Patient to General Ward

```bash
POST /api/admissions/ADM-001/transfer
{
  "newBedId": "BED-GEN-05",
  "transferReason": "Improved condition"
}

Response:
{
  "success": true,
  "data": {
    "admission": {
      "status": "ADMITTED",
      "bed": "BED-GEN-05",
      "bedAllocations": [
        {
          "bed": "BED-ICU-01",
          "allocatedFrom": "2026-01-20T10:30",
          "allocatedTo": "2026-01-22T14:00",
          "pricePerDay": 5000,
          "status": "RELEASED"
        }
      ],
      "transferHistory": [
        {
          "fromBed": "BED-ICU-01",
          "toBed": "BED-GEN-05",
          "fromWard": "ICU",
          "toWard": "General",
          "transferDate": "2026-01-22T14:00",
          "transferReason": "Improved condition"
        }
      ]
    },
    "oldBedCharges": 15000,
    "oldBedDays": 3
  }
}
```

**What happens:**
1. ✅ Old bed allocation finalized (allocatedTo = transfer time)
2. ✅ Old bed: `occupied` → `available`
3. ✅ New bed: `available` → `occupied`
4. ✅ Transfer record added to `transferHistory`
5. ✅ Invoice updated:
   - Old bed charge finalized: 3 days × ₹5000 = ₹15,000
   - New bed charge added: 0 (will be calculated on discharge)
6. ✅ Real-time notification sent

---

### Example 3: Discharge Patient

```bash
POST /api/admissions/ADM-001/discharge
{
  "dischargingDoctorId": "DOC-002",
  "dischargeReason": "Fully recovered",
  "notes": "Patient stable, continue with home care"
}

Response:
{
  "success": true,
  "data": {
    "admission": {
      "status": "DISCHARGED",
      "actualDischargeDate": "2026-01-25T09:00",
      "bedAllocations": [
        { "allocatedFrom": "2026-01-20T10:30", "allocatedTo": "2026-01-22T14:00", "status": "RELEASED" },
        { "allocatedFrom": "2026-01-22T14:00", "allocatedTo": "2026-01-25T09:00", "status": "RELEASED" }
      ]
    },
    "invoice": "INV-001",
    "totalBedCharges": 24000
  }
}
```

**What happens:**
1. ✅ Current bed allocation finalized
2. ✅ Admission status: `ADMITTED` → `DISCHARGED`
3. ✅ Bed status: `occupied` → `cleaning`
4. ✅ Bed's `currentPatient` and `currentAdmission` cleared
5. ✅ Patient's `assignedBed` and `currentAdmission` cleared
6. ✅ Invoice finalized:
   - ICU charges: 3 days × ₹5000 = ₹15,000
   - General charges: 2.75 days × ₹3000 = ₹8,250
   - **Total: ₹23,250**
7. ✅ Invoice status: `draft` → `pending`
8. ✅ Invoice number generated
9. ✅ Real-time notification sent

---

## 🔌 Integration Steps

### Step 1: Ensure Backend is Running
```bash
cd BMS-NURSHINGHOME-BE
npm start
```

The admission routes will be available at `http://localhost:5000/api/admissions`

### Step 2: Import Functions in React Components

```jsx
import { 
  createAdmission, 
  transferPatient, 
  dischargePatient,
  getAdmissions 
} from '@/lib/admissions';
```

### Step 3: Use Components

```jsx
import AdmissionForm from '@/components/dashboard/AdmissionForm';
import AdmissionActionModal from '@/components/dashboard/AdmissionActionModal';

export default function AdmissionsPage() {
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [admissions, setAdmissions] = useState([]);

  const handleAdmissionCreated = (admission) => {
    setAdmissions([admission, ...admissions]);
    setShowAdmissionForm(false);
  };

  const handleActionComplete = (updatedAdmission) => {
    setAdmissions(admissions.map(a => 
      a._id === updatedAdmission._id ? updatedAdmission : a
    ));
    setSelectedAdmission(null);
  };

  return (
    <div>
      <button onClick={() => setShowAdmissionForm(true)}>
        New Admission
      </button>

      {showAdmissionForm && (
        <AdmissionForm 
          onAdmissionCreated={handleAdmissionCreated}
          onClose={() => setShowAdmissionForm(false)}
        />
      )}

      <AdmissionActionModal
        admission={selectedAdmission}
        isOpen={!!selectedAdmission}
        onClose={() => setSelectedAdmission(null)}
        onActionComplete={handleActionComplete}
      />

      {/* List admissions */}
      {admissions.map(admission => (
        <div key={admission._id} onClick={() => setSelectedAdmission(admission)}>
          {admission.admissionId} - {admission.patient?.firstName}
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Key Data Structures

### Admission Object
```javascript
{
  _id: ObjectId,
  admissionId: "ADM-001",
  patient: PatientRef,
  bed: BedRef,
  status: "ADMITTED|TRANSFERRED|DISCHARGED|DECEASED",
  
  // Bed utilization tracking
  bedAllocations: [
    {
      bed: BedRef,
      allocatedFrom: Date,
      allocatedTo: Date,
      pricePerDay: Number,
      status: "ALLOCATED|RELEASED"
    }
  ],
  
  // Transfer history
  transferHistory: [
    {
      fromBed: BedRef,
      toBed: BedRef,
      fromWard: String,
      toWard: String,
      transferDate: Date,
      transferReason: String
    }
  ],
  
  admissionDate: Date,
  actualDischargeDate: Date,
  totalDays: Number
}
```

### Invoice Item (Bed Charges)
```javascript
{
  description: "Bed charges - ICU (BED-001) - 3 days",
  category: "bed_charges",
  quantity: 3,           // Days
  unitPrice: 5000,       // Per day
  amount: 15000          // Total charge
}
```

---

## 🧪 Testing Checklist

- [ ] Create admission → Invoice created
- [ ] Transfer patient → Charges split correctly
- [ ] Discharge patient → Final invoice generated
- [ ] Verify bed status changes
- [ ] Verify patient's assignedBed updates
- [ ] Check real-time notifications
- [ ] Test multiple transfers in one admission
- [ ] Verify charge calculations
- [ ] Test invalid bed selection
- [ ] Test discharge without admission

---

## 📚 Files Created/Modified

### Backend Files
```
src/controllers/NH_admissionController.js    [NEW]
src/routes/admissions.js                     [NEW]
src/models/NH_Admission.js                   [MODIFIED]
src/models/NH_Patient.js                     [MODIFIED]
src/routes/index.js                          [MODIFIED]
BED_ALLOCATION_GUIDE.md                      [NEW]
```

### Frontend Files
```
src/lib/admissions.ts                        [NEW]
src/components/dashboard/AdmissionForm.jsx   [NEW]
src/components/dashboard/AdmissionActionModal.jsx [NEW]
```

---

## 🔗 API Documentation

Full API documentation available in [BED_ALLOCATION_GUIDE.md](./BED_ALLOCATION_GUIDE.md)

---

## 💡 Tips

1. **Invoice Preview**: Before discharge, check the invoice to see all charges
2. **Transfer Reason**: Always provide a reason for transfers (for auditing)
3. **Real-time Updates**: Bed status updates are sent via WebSocket in real-time
4. **Length of Stay**: Automatically calculated from admission to discharge
5. **Charge Calculation**: Always based on actual calendar days (rounded up)

---

## ❓ Troubleshooting

### Admission fails with "Bed is not available"
- Ensure the selected bed has status `available`
- Check if bed is already occupied by another patient

### Invoice not generated
- Check if admission was created successfully
- Verify invoice model is properly connected

### Transfer fails
- Ensure destination bed status is `available`
- Cannot transfer to the same bed

### Discharge shows incorrect charges
- Verify bed allocation times are correct
- Check bed pricePerDay is set

---

**System Version**: 1.0.0  
**Last Updated**: January 20, 2026  
**Tested On**: Node.js 18+, MongoDB 5+
