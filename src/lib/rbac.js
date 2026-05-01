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
  "reports",
  "notifications",
  "settings",
  "tasks",
  "vitals",
  "lab",
  "pharmacy",
  "radiology",
  "ot",
  "service_catalog",
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
};

export const rolePermissions = {
  super_admin: {
    dashboard: fullAccess, beds: fullAccess, admissions: fullAccess, patients: fullAccess,
    doctors: fullAccess, nurses: fullAccess, appointments: fullAccess, scheduler: fullAccess, facilities: fullAccess,
    billing: fullAccess, reports: fullAccess, notifications: fullAccess, settings: fullAccess,
    tasks: fullAccess, vitals: fullAccess, lab: fullAccess, pharmacy: fullAccess, radiology: fullAccess, ot: fullAccess, service_catalog: fullAccess,
  },
  hospital_admin: {
    dashboard: fullAccess, beds: fullAccess, admissions: fullAccess, patients: fullAccess,
    doctors: fullAccess, nurses: fullAccess, appointments: fullAccess, scheduler: fullAccess, facilities: fullAccess,
    billing: fullAccess, reports: fullAccess, notifications: fullAccess, settings: viewAndEdit,
    tasks: fullAccess, vitals: fullAccess, lab: fullAccess, pharmacy: fullAccess, radiology: fullAccess, ot: fullAccess, service_catalog: fullAccess,
  },
  head_nurse: {
    dashboard: viewOnly, beds: viewAndEdit, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, nurses: viewOnly, appointments: viewOnly, scheduler: viewAndEdit, facilities: viewOnly,
    billing: noAccess, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewOnly, radiology: viewAndEdit, ot: viewAndEdit, service_catalog: viewOnly,
  },
  doctor: {
    dashboard: viewOnly, beds: viewOnly, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, nurses: viewOnly, appointments: viewAndEdit, scheduler: viewAndEdit, facilities: viewOnly,
    billing: viewOnly, reports: viewOnly, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewAndCreate, radiology: viewAndEdit, ot: viewAndEdit, service_catalog: viewOnly,
  },
  nurse: {
    dashboard: viewOnly, beds: viewAndEdit, admissions: viewAndEdit, patients: viewAndEdit,
    doctors: viewOnly, appointments: viewOnly, scheduler: viewAndEdit, facilities: viewOnly,
    billing: noAccess, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    tasks: viewAndEdit, vitals: viewAndCreate, lab: viewAndEdit, pharmacy: viewOnly, radiology: viewOnly, ot: viewOnly, service_catalog: viewOnly,
  },
  receptionist: {
    dashboard: viewOnly, beds: viewOnly, admissions: viewAndCreate, patients: viewAndCreate,
    doctors: viewOnly, appointments: fullAccess, scheduler: fullAccess, facilities: viewOnly,
    billing: viewAndCreate, reports: noAccess, notifications: viewOnly, settings: viewOnly,
    vitals: noAccess, lab: viewAndCreate, pharmacy: viewOnly, radiology: viewAndCreate, ot: viewOnly, service_catalog: viewOnly,
  },
  billing_staff: {
    dashboard: viewOnly, beds: noAccess, admissions: viewOnly, patients: viewOnly,
    doctors: noAccess, appointments: noAccess, scheduler: viewOnly, facilities: viewOnly,
    billing: fullAccess, reports: fullAccess, notifications: viewOnly, settings: viewOnly,
    vitals: noAccess, lab: viewOnly, pharmacy: viewOnly, radiology: viewOnly, ot: viewOnly, service_catalog: viewAndCreate,
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
  };
  return labels[role || ''] || 'User';
};
