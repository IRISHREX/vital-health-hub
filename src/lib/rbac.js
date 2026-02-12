// Role-Based Access Control configuration for MongoDB backend

const fullAccess = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const viewOnly = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const viewAndCreate = { canView: true, canCreate: true, canEdit: false, canDelete: false };
const viewAndEdit = { canView: true, canCreate: true, canEdit: true, canDelete: false };
const noAccess = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export const rolePermissions = {
  super_admin: {
    dashboard: fullAccess,
    beds: fullAccess,
    admissions: fullAccess,
    patients: fullAccess,
    doctors: fullAccess,
    nurses: fullAccess,
    appointments: fullAccess,
    facilities: fullAccess,
    billing: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
    settings: fullAccess,
    tasks: fullAccess,
    lab: fullAccess,
    pharmacy: fullAccess,
  },
  hospital_admin: {
    dashboard: fullAccess,
    beds: fullAccess,
    admissions: fullAccess,
    patients: fullAccess,
    doctors: fullAccess,
    nurses: fullAccess,
    appointments: fullAccess,
    facilities: fullAccess,
    billing: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
    settings: viewAndEdit,
    tasks: fullAccess,
    lab: fullAccess,
    pharmacy: fullAccess,
  },
  head_nurse: {
    dashboard: viewOnly,
    beds: viewAndEdit,
    admissions: viewAndEdit,
    patients: viewAndEdit,
    doctors: viewOnly,
    nurses: viewOnly,
    appointments: viewOnly,
    facilities: viewOnly,
    billing: noAccess,
    reports: noAccess,
    notifications: viewOnly,
    settings: viewOnly,
    tasks: viewAndEdit,
    lab: viewAndEdit,
    pharmacy: viewOnly,
  },
  doctor: {
    dashboard: viewOnly,
    beds: viewOnly,
    admissions: viewAndEdit,
    patients: viewAndEdit,
    doctors: viewOnly,
    nurses: viewOnly,
    appointments: viewAndEdit,
    facilities: viewOnly,
    billing: viewOnly,
    reports: viewOnly,
    notifications: viewOnly,
    settings: viewOnly,
    tasks: viewAndEdit,
    lab: viewAndEdit,
  },
  nurse: {
    dashboard: viewOnly,
    beds: viewAndEdit,
    admissions: viewAndEdit,
    patients: viewAndEdit,
    doctors: viewOnly,
    appointments: viewOnly,
    facilities: viewOnly,
    billing: noAccess,
    reports: noAccess,
    notifications: viewOnly,
    settings: viewOnly,
    tasks: viewAndEdit,
    lab: viewAndEdit,
  },
  receptionist: {
    dashboard: viewOnly,
    beds: viewOnly,
    admissions: viewAndCreate,
    patients: viewAndCreate,
    doctors: viewOnly,
    appointments: fullAccess,
    facilities: viewOnly,
    billing: viewAndCreate,
    reports: noAccess,
    notifications: viewOnly,
    settings: viewOnly,
    lab: viewAndCreate,
  },
  billing_staff: {
    dashboard: viewOnly,
    beds: noAccess,
    admissions: viewOnly,
    patients: viewOnly,
    doctors: noAccess,
    appointments: noAccess,
    facilities: viewOnly,
    billing: fullAccess,
    reports: fullAccess,
    notifications: viewOnly,
    settings: viewOnly,
    lab: viewOnly,
  },
};

export const getPermissions = (role, module) => {
  const userRole = role || 'receptionist';
  return rolePermissions[userRole]?.[module] || noAccess;
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
