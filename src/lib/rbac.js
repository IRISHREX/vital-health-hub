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
    appointments: fullAccess,
    facilities: fullAccess,
    billing: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
    settings: fullAccess,
  },
  hospital_admin: {
    dashboard: fullAccess,
    beds: fullAccess,
    admissions: fullAccess,
    patients: fullAccess,
    doctors: fullAccess,
    appointments: fullAccess,
    facilities: fullAccess,
    billing: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
    settings: viewAndEdit,
  },
  doctor: {
    dashboard: viewOnly,
    beds: viewOnly,
    admissions: viewAndEdit,
    patients: viewAndEdit,
    doctors: viewOnly,
    appointments: viewAndEdit,
    facilities: viewOnly,
    billing: viewOnly,
    reports: viewOnly,
    notifications: viewOnly,
    settings: viewOnly,
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
    doctor: 'Doctor',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    billing_staff: 'Accountant',
  };
  return labels[role || ''] || 'User';
};
