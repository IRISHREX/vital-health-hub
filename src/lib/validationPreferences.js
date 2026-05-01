export const validationFormRegistry = [
  {
    id: "patient_dialog",
    module: "patients",
    label: "Patient dialog",
    description: "Register and edit patient records.",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "dateOfBirth", label: "Date of birth" },
      { key: "gender", label: "Gender" },
      { key: "contactNumber", label: "Contact number" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "emergencyContact.name", label: "Emergency contact name" },
      { key: "emergencyContact.relationship", label: "Emergency relationship" },
      { key: "emergencyContact.phone", label: "Emergency phone" },
      { key: "bloodGroup", label: "Blood group" },
      { key: "registrationType", label: "Registration type" },
      { key: "medicalHistory", label: "Medical history" },
      { key: "assignedDoctor", label: "Assigned doctor" },
      { key: "assignedBed", label: "Assigned bed" },
      { key: "assignedNurses", label: "Assigned nurses" },
      { key: "primaryNurse", label: "Primary nurse" },
    ],
  },
  {
    id: "appointment_dialog",
    label: "Appointment dialog",
    description: "Book and edit OPD appointments.",
    fields: [
      { key: "patientId", label: "Patient" },
      { key: "doctorId", label: "Doctor" },
      { key: "appointmentDate", label: "Date" },
      { key: "appointmentTime", label: "Time" },
      { key: "reason", label: "Reason" },
      { key: "notes", label: "Notes" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
    ],
  },
  {
    id: "doctor_dialog",
    label: "Doctor dialog",
    description: "Add and edit doctors.",
    fields: [
      { key: "name", label: "Full name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "specialization", label: "Specialization" },
      { key: "department", label: "Department" },
      { key: "qualification", label: "Qualification" },
      { key: "experience", label: "Experience" },
      { key: "consultationFee", label: "Consultation fee" },
      { key: "availabilityStatus", label: "Availability status" },
    ],
  },
  {
    id: "bed_dialog",
    label: "Bed dialog",
    description: "Create and edit bed records.",
    fields: [
      { key: "bedNumber", label: "Bed number" },
      { key: "bedType", label: "Bed type" },
      { key: "ward", label: "Ward" },
      { key: "floor", label: "Floor" },
      { key: "status", label: "Status" },
      { key: "pricePerDay", label: "Price per day" },
      { key: "roomNumber", label: "Room number" },
      { key: "notes", label: "Notes" },
      { key: "nurseInCharge", label: "Nurse in charge" },
    ],
  },
  {
    id: "user_dialog",
    label: "User dialog",
    description: "Create hospital users from settings.",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "password", label: "Password" },
    ],
  },
  {
    id: "quick_vital_dialog",
    label: "Quick vital dialog",
    description: "Record vital signs quickly.",
    fields: [
      { key: "patientId", label: "Patient" },
      { key: "heartRate", label: "Heart rate" },
      { key: "systolic", label: "Systolic" },
      { key: "diastolic", label: "Diastolic" },
      { key: "temperature", label: "Temperature" },
      { key: "oxygenSaturation", label: "SpO2" },
      { key: "respiratoryRate", label: "Respiratory rate" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "nurse_dialog",
    label: "Nurse dialog",
    description: "Create and edit nurse accounts.",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "password", label: "Password" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Department" },
      { key: "role", label: "Role" },
    ],
  },
  {
    id: "lab_order_dialog",
    label: "Lab order dialog",
    description: "Order pathology tests.",
    fields: [
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "externalPatient.name", label: "External patient name" },
      { key: "externalPatient.phone", label: "External patient phone" },
      { key: "tests", label: "Selected tests" },
      { key: "priority", label: "Priority" },
      { key: "discount", label: "Discount" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "radiology_order_dialog",
    label: "Radiology order dialog",
    description: "Create imaging study orders.",
    fields: [
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "externalPatient.name", label: "External patient name" },
      { key: "externalPatient.phone", label: "External patient phone" },
      { key: "studyType", label: "Study type" },
      { key: "studyName", label: "Study name" },
      { key: "bodyPart", label: "Body part" },
      { key: "priority", label: "Priority" },
      { key: "clinicalHistory", label: "Clinical history" },
      { key: "indication", label: "Indication" },
      { key: "price", label: "Price" },
      { key: "discount", label: "Discount" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    id: "medicine_dialog",
    label: "Medicine dialog",
    description: "Add and edit medicine inventory rows.",
    fields: [
      { key: "name", label: "Name" },
      { key: "genericName", label: "Generic name" },
      { key: "composition", label: "Composition" },
      { key: "category", label: "Category" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "batchNumber", label: "Batch number" },
      { key: "expiryDate", label: "Expiry date" },
      { key: "mrp", label: "MRP" },
      { key: "sellingPrice", label: "Selling price" },
      { key: "purchasePrice", label: "Purchase price" },
      { key: "stock", label: "Stock" },
      { key: "reorderLevel", label: "Reorder level" },
      { key: "unit", label: "Unit" },
      { key: "rackLocation", label: "Rack location" },
      { key: "hsnCode", label: "HSN code" },
      { key: "gstPercent", label: "GST %" },
      { key: "schedule", label: "Schedule" },
    ],
  },
  {
    id: "surgery_dialog",
    label: "Surgery request dialog",
    description: "Create OT surgery requests.",
    fields: [
      { key: "patient", label: "Patient" },
      { key: "procedureName", label: "Procedure name" },
      { key: "primarySurgeon", label: "Primary surgeon" },
      { key: "anesthetist", label: "Anesthetist" },
      { key: "procedureType", label: "Procedure type" },
      { key: "urgency", label: "Urgency" },
      { key: "diagnosis", label: "Diagnosis" },
      { key: "bodyPart", label: "Body part" },
      { key: "laterality", label: "Laterality" },
      { key: "estimatedDuration", label: "Estimated duration" },
      { key: "anesthesiaType", label: "Anesthesia type" },
      { key: "surgeonFee", label: "Surgeon fee" },
      { key: "anesthetistFee", label: "Anesthetist fee" },
      { key: "otRoomCharges", label: "OT room charges" },
      { key: "notes", label: "Notes" },
    ],
  },
];

export const createDefaultValidationPreferences = () => ({
  enabled: true,
  forms: validationFormRegistry.reduce((acc, form) => {
    acc[form.id] = {
      enabled: true,
      fields: form.fields.reduce((fieldAcc, field) => {
        fieldAcc[field.key] = true;
        return fieldAcc;
      }, {}),
    };
    return acc;
  }, {}),
});

export const normalizeValidationPreferences = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const sourceForms = source.forms && typeof source.forms === "object" ? source.forms : {};
  const defaults = createDefaultValidationPreferences();
  const forms = { ...defaults.forms };

  Object.entries(sourceForms).forEach(([formId, formConfig]) => {
    const nextForm = formConfig && typeof formConfig === "object" ? formConfig : {};
    const defaultForm = forms[formId] || { enabled: true, fields: {} };
    const fields = { ...defaultForm.fields };
    const sourceFields = nextForm.fields && typeof nextForm.fields === "object" ? nextForm.fields : {};

    Object.entries(sourceFields).forEach(([fieldKey, fieldEnabled]) => {
      fields[fieldKey] = fieldEnabled !== false;
    });

    forms[formId] = {
      enabled: nextForm.enabled !== false,
      fields,
    };
  });

  return {
    enabled: source.enabled !== false,
    forms,
  };
};

export const isValidationUIVisible = (preferences, formId, fieldName) => {
  const normalized = normalizeValidationPreferences(preferences);

  if (normalized.enabled === false) return false;
  if (!formId) return true;

  const formConfig = normalized.forms?.[formId];
  if (formConfig?.enabled === false) return false;
  if (!fieldName) return true;

  return formConfig?.fields?.[fieldName] !== false;
};

export const getValidationInputClass = (showValidation, message) =>
  showValidation && message ? "border-destructive focus-visible:ring-destructive/20" : "";
