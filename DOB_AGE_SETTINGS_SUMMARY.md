# DOB/Age Settings Implementation - Summary

## Overview
This implementation adds a flexible system for handling Date of Birth (DOB) and Age collection across all hospital forms. Administrators can configure whether to require DOB, allow both DOB and Age (with auto-calculation), or skip collection entirely.

## Files Created

### 1. **Utility Functions** - `lib/dobAgeUtils.js`
Core utilities for DOB/Age calculations:
- `calculateAge(dateOfBirth)` - Convert DOB to age in years
- `calculateDOBFromAge(age)` - Convert age to DOB (calculated from today)
- `formatDOB(dateOfBirth)` - Format DOB to DD/MM/YYYY
- `displayDateToDOB(displayDate)` - Convert DD/MM/YYYY to ISO format
- `getAgeDisplay(dateOfBirth)` - Get display string like "25 yrs, 3 mths"
- `validateDOB(dateOfBirth)` - Validate DOB (must be past, not >150 years)
- `validateAge(age)` - Validate age (0-150, must be number)
- Constants: `DOB_OPTIONS = { REQUIRED, OPTIONAL, NONE }`

### 2. **Component** - `components/shared/DOBAgePicker.jsx`
Reusable React component with three modes:
- **Required**: Simple date input for DOB
- **Optional**: Tabbed interface with DOB and Age inputs (age converts to DOB)
- **None**: No field displayed
- Features:
  - Shows calculated age in real-time
  - Validates input on change
  - Displays error messages
  - Responsive design with Tabs UI

### 3. **Hook** - `hooks/useDOBAgeSetting.js`
Custom React hook to access DOB/Age settings:
- `useDOBAgeSetting()` - Access and update global setting
- `useDOBMode(formId)` - Get mode for specific form
- Respects both global and form-level preferences

### 4. **Settings Component** - `components/settings/DOBAgeSetting.jsx`
UI component for Settings page to configure DOB collection:
- Three collection mode options
- Toggle to enable/disable age input in optional mode
- Info box explaining how it works
- Save functionality with error handling

### 5. **Documentation** - `components/shared/DOB_IMPLEMENTATION_GUIDE.md`
Complete guide for developers on how to integrate DOB/Age picker into other forms

## Files Modified

### 1. **Validation Preferences** - `lib/validationPreferences.js`
Updated to include DOB/Age settings:
- Added `dobAgeSetting` to default preferences
- Updated `createDefaultValidationPreferences()` to include DOB setting
- Updated `normalizeValidationPreferences()` to handle DOB/Age setting
- Structure:
  ```javascript
  {
    dobAgeSetting: {
      option: 'required' | 'optional' | 'none',
      allowAgeInput: boolean
    }
  }
  ```

### 2. **Settings Page** - `pages/Settings.jsx`
Added DOB/Age Settings configuration:
- Imported `DOBAgeSetting` component
- Added "Data Settings" tab in TabsList
- Added TabsContent for `data-settings` value
- Placed after Sounds tab, before Approvals tab

### 3. **Patient Dialog** - `components/dashboard/PatientDialog.jsx`
Integrated DOBAgePicker component:
- Added imports for DOB utilities and hook
- Created dynamic schema based on DOB mode
- Replaced static FormField with DOBAgePicker component
- Schema validation now respects DOB mode setting
- Auto-converts age to DOB when age is provided

## How It Works

### User Flow:
1. **Admin Configuration**: Settings > Data Settings > Date of Birth / Age Settings
2. **Select Mode**:
   - "Required" - Only DOB input
   - "Optional" - Choice between DOB or Age (age converts to DOB)
   - "None" - No collection
3. **Setting Applied**: All forms using DOBAgePicker respect this setting immediately

### Technical Flow:
1. User visits form with DOB field
2. `useDOBMode()` hook retrieves global DOB setting
3. Schema and UI updated dynamically based on mode
4. If mode is "optional" and user enters age → auto-calculates DOB
5. DOB stored in ISO format (YYYY-MM-DD)
6. Age always displayed as "X yrs, Y mths" based on DOB

## Integration Checklist

### Completed:
- ✅ Utility functions for DOB/age calculations
- ✅ DOBAgePicker component with 3 modes
- ✅ useDOBAgeSetting hook for accessing preferences
- ✅ DOBAgeSetting configuration UI
- ✅ Settings page integration
- ✅ PatientDialog updated to use DOBAgePicker
- ✅ Validation preferences updated
- ✅ Error handling and validation

### To-Do (Optional):
- [ ] Update AppointmentDialog if it uses DOB
- [ ] Update Lab/Radiology Order dialogs for external patients
- [ ] Update Doctor/Nurse dialogs if they use DOB
- [ ] Add DOB to other custom forms
- [ ] Add backend API changes if needed (current API already accepts DOB)

## Configuration Examples

### Required Mode (Default)
```jsx
<DOBAgePicker
  mode="required"
  value={dobValue}
  onChange={setDobValue}
  required={true}
/>
// Shows: Date input field only
```

### Optional Mode
```jsx
<DOBAgePicker
  mode="optional"
  value={dobValue}
  onChange={setDobValue}
/>
// Shows: Tabs with "Date of Birth" and "Age" options
// Age input auto-converts to DOB
```

### None Mode
```jsx
<DOBAgePicker
  mode="none"
/>
// Shows: Nothing (null)
```

## Key Features

1. **Global Setting**: One configuration for all forms
2. **Automatic Calculation**: Age-to-DOB conversion uses current date
3. **Form-Level Override**: Individual forms can disable DOB via validation preferences
4. **Age Display**: Shows "X yrs, Y mths" format (more accurate than just years)
5. **Smart Validation**:
   - DOB must be in past (not today)
   - Age must be 0-150
   - Age-to-DOB calculated from today
6. **No Breaking Changes**: Backward compatible with existing DOB storage

## Database/API

**No backend changes required:**
- DOB is always sent as ISO string (YYYY-MM-DD)
- Frontend converts age to DOB before submission
- Existing API endpoints work as-is
- Age is calculated from DOB on display

## Testing

Test the implementation:
1. Go to **Settings** > **Data Settings**
2. Select different DOB collection modes
3. Refresh page and go to Patient registration
4. Verify DOBAgePicker changes based on selected mode
5. Test age-to-DOB conversion
6. Test validation messages

## Code Quality

- ✅ No console errors
- ✅ No type warnings
- ✅ Follows existing code patterns
- ✅ Uses shadcn/ui components consistently
- ✅ Proper error handling
- ✅ Accessible UI with labels and error messages

## Future Enhancements

1. **Age Ranges**: Instead of exact age, allow "age range" input (0-5, 5-10, etc.)
2. **Birth Month**: Optionally collect birth month for more accurate age calculation
3. **Age-Based Workflows**: Trigger different forms/workflows based on age ranges
4. **Analytics**: Track DOB collection methods and age distributions
5. **Mobile Optimization**: Better date picker for mobile devices

## Support

For questions or issues:
1. Check `DOB_IMPLEMENTATION_GUIDE.md` for integration examples
2. Review `dobAgeUtils.js` for available functions
3. Check `DOBAgePicker.jsx` component props
4. Refer to `PatientDialog.jsx` for real-world example
