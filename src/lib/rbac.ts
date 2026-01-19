// Role-Based Access Control configuration for MongoDB backend

export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant';

export interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  beds: Permission;
  patients: Permission;
  doctors: Permission;
  appointments: Permission;
  facilities: Permission;
  billing: Permission;
  reports: Permission;
  notifications: Permission;
  settings: Permission;
}

const fullAccess: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const viewOnly: Permission = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const viewAndCreate: Permission = { canView: true, canCreate: true, canEdit: false, canDelete: false };
const viewAndEdit: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: false };
const noAccess: Permission = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export const rolePermissions: Record<UserRole, RolePermissions> = {
  super_admin: {
    dashboard: fullAccess,
    beds: fullAccess,
    patients: fullAccess,
    doctors: fullAccess,
    appointments: fullAccess,
    facilities: fullAccess,
    billing: fullAccess,
    reports: fullAccess,
    notifications: fullAccess,
    settings: fullAccess,
  },
  admin: {
    dashboard: fullAccess,
    beds: fullAccess,
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
    patients: viewAndCreate,
    doctors: viewOnly,
    appointments: fullAccess,
    facilities: viewOnly,
    billing: viewAndCreate,
    reports: noAccess,
    notifications: viewOnly,
    settings: viewOnly,
  },
  accountant: {
    dashboard: viewOnly,
    beds: noAccess,
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

export const getPermissions = (role: string | undefined, module: keyof RolePermissions): Permission => {
  const userRole = (role as UserRole) || 'receptionist';
  return rolePermissions[userRole]?.[module] || noAccess;
};

export const canAccessModule = (role: string | undefined, module: keyof RolePermissions): boolean => {
  return getPermissions(role, module).canView;
};

export const getRoleLabel = (role: string | undefined): string => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    doctor: 'Doctor',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    accountant: 'Accountant',
  };
  return labels[role || ''] || 'User';
};
