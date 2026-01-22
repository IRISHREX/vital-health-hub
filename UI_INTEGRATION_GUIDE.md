# Professional UI Integration Guide

## Quick Start

### Step 1: Add Admissions Page to Your Router

In your router/routing configuration file (typically `main.jsx` or `App.jsx`):

```jsx
import Admissions from '@/components/dashboard/Admissions';

// Add to your route definitions
const routes = [
  {
    path: '/admissions',
    element: <Admissions />,
    requiredRole: ['doctor', 'nurse', 'hospital_admin', 'super_admin']
  },
  // ... other routes
];
```

### Step 2: Update Navigation Menu

Add the Admissions link to your main navigation:

```jsx
import { Bed } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NavMenu() {
  return (
    <nav>
      {/* ... other nav items */}
      <Link to="/admissions" className="flex items-center gap-2">
        <Bed className="h-5 w-5" />
        Admissions
      </Link>
    </nav>
  );
}
```

### Step 3: Verify API Endpoints

Ensure your backend has these endpoints implemented:

```
POST   /api/admissions          - Create admission
GET    /api/admissions          - List admissions
GET    /api/admissions/:id      - Get single admission
POST   /api/admissions/:id/transfer - Transfer patient
POST   /api/admissions/:id/discharge - Discharge patient
GET    /api/admissions/stats    - Get statistics
```

All endpoints should be already configured based on previous implementation.

---

## Component Integration Examples

### Example 1: Standalone Admissions Page

```jsx
import Admissions from '@/components/dashboard/Admissions';

export default function AdmissionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Admissions />
    </div>
  );
}
```

### Example 2: Modal-based Form Usage

```jsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdmissionForm from '@/components/dashboard/AdmissionForm';

export function MyComponent() {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button onClick={() => setShowForm(true)}>Admit Patient</button>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Patient Admission</DialogTitle>
          </DialogHeader>
          <AdmissionForm
            onAdmissionCreated={(admission) => {
              console.log('New admission:', admission);
              setShowForm(false);
            }}
            onClose={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Example 3: Bed Utilization Dashboard

```jsx
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import BedUtilizationGrid from '@/components/dashboard/BedUtilizationGrid';

export function BedManagement() {
  const [showBeds, setShowBeds] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  return (
    <>
      <button onClick={() => setShowBeds(true)}>View Beds</button>

      <Dialog open={showBeds} onOpenChange={setShowBeds}>
        <DialogContent className="max-w-6xl max-h-screen overflow-y-auto">
          <BedUtilizationGrid
            selectableOnly={true}
            onBedSelect={(bed) => {
              setSelectedBed(bed);
              setShowBeds(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {selectedBed && <p>Selected Bed: {selectedBed.bedNumber}</p>}
    </>
  );
}
```

### Example 4: Invoice Display

```jsx
import { useState } from 'react';
import InvoicePreview from '@/components/dashboard/InvoicePreview';

export function InvoiceViewer({ admission }) {
  const [invoice, setInvoice] = useState(null);

  const fetchInvoice = async () => {
    const response = await fetch(`/api/invoices/${admission._id}`);
    const data = await response.json();
    setInvoice(data);
  };

  return (
    <>
      <button onClick={fetchInvoice}>View Invoice</button>
      {invoice && <InvoicePreview invoice={invoice} admission={admission} />}
    </>
  );
}
```

### Example 5: Discharge Summary

```jsx
import { useState, useEffect } from 'react';
import DischargeSummary from '@/components/dashboard/DischargeSummary';

export function DischargeDocument({ admissionId }) {
  const [admission, setAdmission] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [admissionId]);

  const loadData = async () => {
    try {
      const [admRes, invRes] = await Promise.all([
        fetch(`/api/admissions/${admissionId}`),
        fetch(`/api/invoices/${admissionId}`)
      ]);

      setAdmission(await admRes.json());
      setInvoice(await invRes.json());
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return <DischargeSummary admission={admission} invoice={invoice} />;
}
```

---

## Styling & Customization

### Override Theme Colors

In your tailwind config (`tailwind.config.ts`):

```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F97316',
      },
    },
  },
}
```

### Custom CSS Classes

```css
/* In your global CSS file */

/* Admission card hover effect */
.admission-card {
  @apply border-l-4 border-l-blue-500 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02];
}

/* Status badge styles */
.status-badge {
  @apply inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border;
}

.status-admitted {
  @apply bg-blue-100 text-blue-800 border-blue-300;
}

.status-discharged {
  @apply bg-green-100 text-green-800 border-green-300;
}

.status-transferred {
  @apply bg-purple-100 text-purple-800 border-purple-300;
}

.status-deceased {
  @apply bg-red-100 text-red-800 border-red-300;
}
```

---

## Data Requirements

### Expected Admission Object Structure

```javascript
{
  _id: "ObjectId",
  admissionId: "ADM-001-2024",
  patient: {
    _id: "ObjectId",
    firstName: "John",
    lastName: "Doe",
    patientId: "PAT-001",
    phone: "+91-9876543210",
    age: 35,
    bloodGroup: "O+",
    // ... other patient fields
  },
  bed: {
    _id: "ObjectId",
    bedNumber: "A1",
    bedType: "standard",
    ward: "ICU",
    floor: 2,
    room: "201",
    pricePerDay: 5000,
    amenities: ["AC", "Attached Bathroom"],
    // ... other bed fields
  },
  admittingDoctor: {
    _id: "ObjectId",
    specialization: "Cardiology",
    // ... other doctor fields
  },
  status: "ADMITTED", // or DISCHARGED, TRANSFERRED, DECEASED
  admissionType: "emergency", // or elective, transfer
  admissionDate: "2024-01-20T10:30:00Z",
  dischargeDate: "2024-01-25T14:00:00Z",
  diagnosis: {
    primary: "COVID-19",
    secondary: []
  },
  symptoms: ["Fever", "Cough"],
  treatmentPlan: "...",
  bedAllocations: [
    {
      bed: { bedNumber: "A1", ... },
      startDate: "2024-01-20T10:30:00Z",
      endDate: "2024-01-23T09:00:00Z",
      dailyRate: 5000,
      totalCost: 15000,
      transferReason: "Patient recovery"
    },
    // ... more allocations
  ],
  dischargeNotes: "Patient recovered well...",
  dischargingDoctor: { /* doctor object */ }
}
```

### Expected Invoice Object Structure

```javascript
{
  _id: "ObjectId",
  invoiceNumber: "INV-001-2024",
  invoiceDate: "2024-01-25T14:00:00Z",
  dueDate: "2024-02-01T23:59:59Z",
  admission: { /* admission object */ },
  patient: { /* patient object */ },
  subtotal: 15000,
  discount: 0,
  tax: 2700,
  totalAmount: 17700,
  paidAmount: 17700,
  status: "paid", // or pending, overdue, cancelled
  serviceCharges: [
    {
      description: "Doctor Consultation",
      amount: 2000
    }
  ],
  notes: "Invoice for patient discharge"
}
```

---

## API Integration

### Fetch Admissions

```javascript
import { getAdmissions } from '@/lib/admissions';

const loadAdmissions = async () => {
  try {
    const admissions = await getAdmissions({
      limit: 50,
      status: 'ADMITTED',
      wardFilter: 'ICU'
    });
    setAdmissions(admissions);
  } catch (error) {
    console.error('Failed to load:', error);
  }
};
```

### Create Admission

```javascript
import { createAdmission } from '@/lib/admissions';

const handleAdmit = async (formData) => {
  try {
    const response = await createAdmission({
      patientId: formData.patientId,
      bedId: formData.bedId,
      admittingDoctorId: formData.admittingDoctorId,
      admissionType: formData.admissionType,
      diagnosis: formData.diagnosis,
      symptoms: formData.symptoms,
      treatmentPlan: formData.treatmentPlan
    });
    
    console.log('Admission created:', response.data.admission);
  } catch (error) {
    console.error('Failed to create admission:', error);
  }
};
```

### Transfer Patient

```javascript
import { transferPatient, calculateBedCharges } from '@/lib/admissions';

const handleTransfer = async (admissionId, newBedId, reason) => {
  try {
    // Calculate charges
    const charges = calculateBedCharges(
      admission.admissionDate,
      new Date(),
      admission.bed.pricePerDay
    );

    const response = await transferPatient(admissionId, {
      newBedId,
      transferReason: reason,
      previousCharges: charges
    });
    
    console.log('Transfer completed:', response.data);
  } catch (error) {
    console.error('Transfer failed:', error);
  }
};
```

### Discharge Patient

```javascript
import { dischargePatient } from '@/lib/admissions';

const handleDischarge = async (admissionId, doctorId, notes) => {
  try {
    const response = await dischargePatient(admissionId, {
      dischargingDoctorId: doctorId,
      dischargeNotes: notes
    });
    
    console.log('Discharge completed:', response.data);
    // Invoice automatically generated
  } catch (error) {
    console.error('Discharge failed:', error);
  }
};
```

---

## Error Handling

### Toast Notifications

```javascript
import { toast } from '@/hooks/use-toast';

// Success
toast({
  title: 'Success',
  description: 'Patient admitted successfully',
  duration: 3000
});

// Error
toast({
  title: 'Error',
  description: 'Failed to admit patient',
  variant: 'destructive',
  duration: 5000
});

// Warning
toast({
  title: 'Warning',
  description: 'No available beds in selected ward',
  variant: 'warning',
  duration: 4000
});
```

### Validation

All forms include built-in validation:
- Required field checking
- Date validation
- Email format validation
- Phone number validation
- Form state management

---

## Performance Tips

1. **Lazy Load Components**
   ```jsx
   const Admissions = lazy(() => import('@/components/dashboard/Admissions'));
   ```

2. **Memoize List Items**
   ```jsx
   const AdmissionCard = memo(({ admission, onSelect }) => {
     return <Card>...</Card>;
   });
   ```

3. **Debounce Search**
   ```jsx
   const debouncedSearch = useCallback(
     debounce((term) => filterAdmissions(term), 300),
     []
   );
   ```

4. **Use Virtual Scrolling**
   ```jsx
   import { FixedSizeList } from 'react-window';
   ```

---

## Troubleshooting

### Issue: Admissions not loading
**Solution**: Check API endpoint and ensure user has required role

### Issue: Form not submitting
**Solution**: Check browser console for validation errors, verify all required fields filled

### Issue: Images not showing
**Solution**: Ensure imageUrl field in data, check CORS headers

### Issue: Modals not closing
**Solution**: Verify onClose callback is being called, check modal state management

---

## Next Steps

1. **Deploy to Staging**: Test UI with real data
2. **User Feedback**: Gather feedback from hospital staff
3. **Performance Testing**: Load test with concurrent users
4. **Accessibility Audit**: WCAG 2.1 compliance check
5. **Mobile Testing**: Test on iOS and Android devices

---

## Support

For issues or questions:
1. Check the [UI_ENHANCEMENT_GUIDE.md](./UI_ENHANCEMENT_GUIDE.md)
2. Review API documentation
3. Check browser console for errors
4. Contact development team

