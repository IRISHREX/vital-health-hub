// Role-Based Access Control configuration for MongoDB backend

const fullAccess = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const viewOnly = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const viewAndCreate = { canView: true, canCreate: true, canEdit: false, canDelete: false };
const viewAndEdit = { canView: true, canCreate: true, canEdit: true, canDelete: false };
const noAccess = { canView: false, canCreate: false, canEdit: false, canDelete: false };
export const permissionFlags = ["canView", "canCreate", "canEdit", "canDelete"];
export const rbacModules = [
  "dashboard",
  "beds",
  "admissions",
  "patients",
  "doctors",
  "nurses",
  "appointments",
  "scheduler",
  "facilities",
  "billing",
  "pharmacy",
  "reports",
  "notifications",
  "settings",
  "tasks",
  "vitals",
  "lab",
  "radiology",
  "ot",
  "service_catalog",
  "returns",
  "medicine_indents",
  "nursing_charges",
  "handovers",
  "pac",
  "fluid_io",
];
export const moduleLabels = {
  dashboard: "Dashboard",
  beds: "Bed Management",
  admissions: "Admissions",
  patients: "Patients",
  doctors: "Doctors",
  nurses: "Nurses",
  appointments: "Appointments",
  scheduler: "Scheduler",
  facilities: "Facilities",
  billing: "Billing",
  reports: "Reports",
  notifications: "Notifications",
  settings: "Settings",
  tasks: "Tasks",
  vitals: "Vitals",
  lab: "Pathology Lab",
  pharmacy: "Pharmacy",
  radiology: "Radiology",
  ot: "Operating Theatre",
  service_catalog: "Service Catalog & Billing Rules",
  returns: "Returns & Refunds",
  medicine_indents: "Ward Medicine Indents",
  nursing_charges: "Nursing Charges",
  handovers: "Nurse Handovers (SBAR)",
  pac: "Pre-Anaesthetic Checks",
  fluid_io: "Fluid Intake/Output",
};

export const rolePermissions = {
  super_admin: {
    dashboard: fullAccess, beds: fullAccess, admissions: fullAccess, patients: fullAccess,
    doctors: fullAccess, nurses: fullAccess, appointments: fullAccess, scheduler: fullAccess, facilities: fullAccess,
    billing: fullAccess, reports: fullAccess, notifications: fullAccess, settings: fullAccess,
    tasks: fullAccess, vitals: fullAccess, lab: fullAccess, pharmacy: fullAccess, radiology: fullAccess, ot: fullAccess, service_catalog: fullAccess,
    returns: fullAccess, medicine_indents: fullAccess, nursing_charges: fullAccess, handovers: fullAccess, pac: fullAccess, fluid_io: fullAccess,
  },
  hospital_admin: {
    dashboard: fullAccess, beds: fullAccess, admissions: fullAccess, patients: fullAccess,
    doctors: fullAccess, nurses: fullAccess, appointments: fullAccess, scheduler: fullAccess, facilities: fullAccess,
    billing: fullAccess, reports: fullAccess, notifications: fullAccess, settings: viewAndEdit,
    tasks: fullAccess, vitals: fullAccess, lab: fullAccess, pharmacy: fullAccess, radiology: fullAccess, ot: fullAccess, service_catalog: fullAccess,
    returns: fullAccess, medicine_indents: fullAccess, nursing_charges: fullAccess, handovers: fullAccess, pac: fullAccess, fluid_io: fullAccess,
  },
  head_nurse: {
    dashboard: viewOnly, beds: viewAndEdit, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, nurses: viewOnly, appointments: viewOnly, scheduler: viewAndEdit, facilities: viewOnly,
    billing: noAccess, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewOnly, radiology: viewAndEdit, ot: viewAndEdit, service_catalog: viewOnly,
    returns: viewAndCreate, medicine_indents: fullAccess, nursing_charges: fullAccess, handovers: fullAccess, pac: viewAndEdit, fluid_io: fullAccess,
  },
  doctor: {
    dashboard: viewOnly, beds: viewOnly, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, nurses: viewOnly, appointments: viewAndEdit, scheduler: viewAndEdit, facilities: viewOnly,
    billing: viewOnly, reports: viewOnly, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewAndCreate, radiology: viewAndEdit, ot: viewAndEdit, service_catalog: viewOnly,
    returns: viewAndCreate, medicine_indents: viewAndCreate, nursing_charges: viewOnly, handovers: viewOnly, pac: fullAccess, fluid_io: viewAndCreate,
  },
  nurse: {
    dashboard: viewOnly, beds: viewAndEdit, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, appointments: viewOnly, scheduler: viewAndEdit, facilities: viewOnly,
    billing: noAccess, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewOnly, radiology: viewOnly, ot: viewOnly, service_catalog: viewOnly,
    returns: viewAndCreate, medicine_indents: viewAndCreate, nursing_charges: viewAndCreate, handovers: viewAndEdit, pac: viewOnly, fluid_io: viewAndCreate,
  },
  receptionist: {
    dashboard: viewOnly, beds: viewOnly, admissions: viewAndCreate, patients: viewAndCreate,
    doctors: viewOnly, appointments: fullAccess, scheduler: fullAccess, facilities: viewOnly,
    billing: viewAndCreate, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    vitals: noAccess, lab: viewAndCreate, pharmacy: viewOnly, radiology: viewAndCreate, ot: viewOnly, service_catalog: viewOnly,
    returns: viewAndCreate, medicine_indents: noAccess, nursing_charges: noAccess, handovers: noAccess, pac: noAccess, fluid_io: noAccess,
  },
  billing_staff: {
    dashboard: viewOnly, beds: noAccess, admissions: viewOnly, patients: viewOnly,
    doctors: noAccess, appointments: noAccess, scheduler: viewOnly, facilities: viewOnly,
    billing: fullAccess, reports: fullAccess, notifications: viewOnly, settings: viewOnly,
    vitals: noAccess, lab: viewOnly, pharmacy: viewOnly, radiology: viewOnly, ot: viewOnly, service_catalog: viewAndCreate,
    returns: fullAccess, medicine_indents: viewOnly, nursing_charges: viewOnly, handovers: noAccess, pac: noAccess, fluid_io: noAccess,
  },
  pharmacist: {
    dashboard: viewOnly, beds: noAccess, admissions: noAccess, patients: viewOnly,
    doctors: noAccess, appointments: noAccess, scheduler: viewOnly, facilities: viewOnly,
    billing: viewAndCreate, reports: viewOnly, notifications: viewOnly, settings: viewOnly,
    tasks: viewOnly, vitals: noAccess, lab: noAccess, pharmacy: fullAccess, radiology: noAccess, ot: noAccess, service_catalog: viewOnly,
    returns: fullAccess, medicine_indents: fullAccess, nursing_charges: noAccess, handovers: noAccess, pac: noAccess, fluid_io: noAccess,
  },
};

export const getPermissions = (role, module) => {
  const userRole = role || 'receptionist';
  return rolePermissions[userRole]?.[module] || noAccess;
};

export const mergePermissions = (basePermissions, overridePermissions) => {
  if (!overridePermissions) return basePermissions;
  return {
    canView: overridePermissions.canView ?? basePermissions.canView,
    canCreate: overridePermissions.canCreate ?? basePermissions.canCreate,
    canEdit: overridePermissions.canEdit ?? basePermissions.canEdit,
    canDelete: overridePermissions.canDelete ?? basePermissions.canDelete,
  };
};

export const canAccessModule = (role, module) => {
  return getPermissions(role, module).canView;
};

export const getRoleLabel = (role) => {
  const labels = {
    super_admin: 'Super Admin',
    hospital_admin: 'Admin',
    head_nurse: 'Head Nurse',
    doctor: 'Doctor',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    billing_staff: 'Accountant',
    pharmacist: 'Pharmacist',
  };
  return labels[role || ''] || 'User';
};
