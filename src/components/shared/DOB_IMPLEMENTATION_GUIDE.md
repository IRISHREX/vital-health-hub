# DOB/Age Picker Implementation Guide

## Overview
This guide explains how to integrate the DOB/Age picker component into your forms to automatically respect the global DOB/Age setting configured in Settings > Data Settings.

## Features
- **Three Collection Modes:**
  - `required`: Always ask for DOB (traditional approach)
  - `optional`: Let users choose between DOB or Age (Age is converted to DOB automatically)
  - `none`: Don't collect DOB/age

- **Global Setting:** Configured once in Settings, applied to all forms
- **Smart Calculation:** Age-to-DOB conversion based on current date
- **Age Display:** Shows "X yrs, Y mths" format

## Quick Start

### 1. Import Required Dependencies
```jsx
import { validateDOB, validateAge, DOB_OPTIONS } from "@/lib/dobAgeUtils";
import { useDOBMode } from "@/hooks/useDOBAgeSetting";
import DOBAgePicker from "@/components/shared/DOBAgePicker";
import { useState } from "react";
```

### 2. Create Dynamic Schema
```jsx
const createMyFormSchema = (dobMode) => {
  let dobSchema = z.string().optional();

  if (dobMode === DOB_OPTIONS.REQUIRED) {
    dobSchema = z.string()
      .min(1, "Date of birth is required")
      .refine(
        (date) => {
          const selectedDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate < today;
        },
        "Date of birth cannot be today or in the future"
      );
  } else if (dobMode === DOB_OPTIONS.OPTIONAL) {
    dobSchema = z.string()
      .min(1, "Date of birth or age is required")
      .refine(
        (date) => {
          const selectedDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDate < today;
        },
        "Date of birth cannot be today or in the future"
      );
  }

  return z.object({
    // ... other fields
    dateOfBirth: dobSchema,
    // ... other fields
  });
};
```

### 3. Use in Component
```jsx
export default function MyDialog({ isOpen, onClose }) {
  const dobMode = useDOBMode("my_form_id");
  const [mySchema] = useState(() => createMyFormSchema(dobMode));
  
  const form = useForm({
    resolver: zodResolver(mySchema),
    defaultValues: {
      dateOfBirth: "",
      // ... other fields
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Other fields */}
            
            {/* DOB/Age Picker */}
            <DOBAgePicker
              value={form.watch("dateOfBirth")}
              onChange={(dob) => form.setValue("dateOfBirth", dob || "")}
              mode={dobMode}
              required={dobMode !== DOB_OPTIONS.NONE}
              disabled={false}
              error={form.formState.errors.dateOfBirth?.message || ""}
              label="Date of Birth"
              showAge={true}
            />
            
            {/* Rest of form */}
            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

## API Reference

### DOBAgePicker Component Props
```typescript
interface DOBAgePicker Props {
  value?: string;                    // ISO date string (YYYY-MM-DD)
  onChange?: (dob: string) => void; // Callback when DOB changes
  mode?: "required" | "optional" | "none"; // Collection mode
  required?: boolean;               // Whether field is required
  disabled?: boolean;               // Whether field is disabled
  error?: string;                   // Error message to display
  label?: string;                   // Field label (default: "Date of Birth")
  showAge?: boolean;               // Show calculated age (default: true)
}
```

### useDOBMode Hook
```typescript
const dobMode = useDOBMode(formId);
// Returns: "required" | "optional" | "none"
```

### Utility Functions

#### calculateAge(dateOfBirth)
Calculates age in years from DOB.
```jsx
import { calculateAge } from "@/lib/dobAgeUtils";
const age = calculateAge("2000-01-15"); // Returns 24 (or current age)
```

#### calculateDOBFromAge(age)
Calculates DOB from age (current date - age years).
```jsx
import { calculateDOBFromAge } from "@/lib/dobAgeUtils";
const dob = calculateDOBFromAge(25); // Returns ISO date string
```

#### getAgeDisplay(dateOfBirth)
Returns formatted age display.
```jsx
import { getAgeDisplay } from "@/lib/dobAgeUtils";
const display = getAgeDisplay("2000-01-15"); // Returns "24 yrs, 3 mths"
```

#### validateDOB(dateOfBirth)
Validates DOB.
```jsx
import { validateDOB } from "@/lib/dobAgeUtils";
const result = validateDOB("2000-01-15");
// Returns: { isValid: boolean, error?: string }
```

#### validateAge(age)
Validates age.
```jsx
import { validateAge } from "@/lib/dobAgeUtils";
const result = validateAge(25);
// Returns: { isValid: boolean, error?: string }
```

## Forms to Update

### Priority 1: Core Patient Forms
- [x] PatientDialog - **DONE**
- [ ] AdmissionDialog (if it has patient DOB)
- [ ] Lab Order Dialog (external patient DOB)
- [ ] Radiology Order Dialog (external patient DOB)

### Priority 2: User Management
- [ ] Doctor Dialog (if doctor DOB is collected)
- [ ] Nurse Dialog (if nurse DOB is collected)

### Priority 3: Other Modules
- [ ] Any custom forms with dateOfBirth field

## Settings Integration

### Where Users Configure It
**Settings > Data Settings > Date of Birth / Age Settings**

### Configuration Options
1. **Required - Date of Birth Only**: Always ask for DOB
2. **Optional - DOB or Age**: User can choose between DOB or Age input
3. **None - No Collection**: Don't collect DOB or age

### Auto-Applied
Once set, all forms using the DOBAgePicker component will automatically respect this setting.

## Examples

### Example 1: Patient Registration Form
[See PatientDialog.jsx](../dashboard/PatientDialog.jsx)

### Example 2: Lab Order with External Patient
```jsx
// When user selects "External Patient" instead of internal patient
<DOBAgePicker
  value={form.watch("externalPatient.dateOfBirth")}
  onChange={(dob) => form.setValue("externalPatient.dateOfBirth", dob || "")}
  mode={dobMode}
  required={dobMode !== DOB_OPTIONS.NONE}
  label="External Patient Date of Birth"
/>
```

## Backend Integration

The backend should already handle DOB correctly since:
1. DOB is always sent as ISO date string (YYYY-MM-DD)
2. The frontend handles age-to-DOB conversion before sending
3. No backend changes required

## Testing

### Test Cases
1. **DOB Required Mode**: Only DOB input is shown
2. **DOB Optional Mode**: Tabs show DOB and Age inputs with auto-conversion
3. **DOB None Mode**: No DOB/Age field appears
4. **Age to DOB Conversion**: Entering age calculates correct DOB
5. **DOB to Age Display**: DOB shows calculated age in display format

## Troubleshooting

### DOBAgePicker not appearing
- Check that `dobMode` is not `DOB_OPTIONS.NONE`
- Verify import path is correct
- Check form's defaultValues has `dateOfBirth` field

### Settings not applying
- Verify user has saved the DOB/Age setting in Settings page
- Check browser console for validation preference errors
- Try page refresh to reload preferences

### Age calculation off by 1 day
- This is expected if someone hasn't had their birthday yet this year
- System uses current date, not birthday date

## Advanced: Custom DOB Handling

If you need custom DOB logic, you can bypass the picker:

```jsx
// Manual DOB handling without DOBAgePicker
import { calculateAge, validateDOB } from "@/lib/dobAgeUtils";

const myDobValue = form.watch("dateOfBirth");
const age = calculateAge(myDobValue);
const validation = validateDOB(myDobValue);

if (validation.isValid) {
  // Custom logic
}
```
