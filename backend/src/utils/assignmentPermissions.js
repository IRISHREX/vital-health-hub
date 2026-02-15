const { VisualAccessSettings } = require('../models/NH_Settings');
const { AppError } = require('../middleware/errorHandler');

const ASSIGNMENT_TYPES = ['floor', 'room', 'patient'];

const DEFAULT_ASSIGNMENT_POLICIES = {
  floor: { assignerRoles: [], assigneeRoles: [] },
  room: { assignerRoles: [], assigneeRoles: [] },
  patient: { assignerRoles: [], assigneeRoles: [] }
};

const normalizeRoles = (roles) => (
  Array.isArray(roles)
    ? roles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean)
    : []
);

const normalizeAssignmentPolicies = (input = {}) => (
  ASSIGNMENT_TYPES.reduce((acc, type) => {
    acc[type] = {
      assignerRoles: normalizeRoles(input?.[type]?.assignerRoles),
      assigneeRoles: normalizeRoles(input?.[type]?.assigneeRoles)
    };
    return acc;
  }, {})
);

const roleAllowed = (allowedRoles, currentRole) => (
  !allowedRoles.length || allowedRoles.includes(String(currentRole || '').toLowerCase())
);

const getAssignmentPolicies = async () => {
  let settings = await VisualAccessSettings.findOne().select('assignmentPolicies');
  if (!settings) {
    settings = await VisualAccessSettings.create({
      overrides: [],
      permissionManagers: [],
      assignmentPolicies: DEFAULT_ASSIGNMENT_POLICIES
    });
  }
  return normalizeAssignmentPolicies(settings.assignmentPolicies || DEFAULT_ASSIGNMENT_POLICIES);
};

const assertAssignmentAllowed = async ({
  assignmentType,
  assignerRole,
  assigneeRole
}) => {
  const type = String(assignmentType || '').toLowerCase();
  if (!ASSIGNMENT_TYPES.includes(type)) {
    throw new AppError('Invalid assignment type', 400);
  }

  const policies = await getAssignmentPolicies();
  const policy = policies[type] || DEFAULT_ASSIGNMENT_POLICIES[type];

  if (!roleAllowed(policy.assignerRoles, assignerRole)) {
    throw new AppError(`Your role is not allowed to assign ${type}s`, 403);
  }
  if (assigneeRole && !roleAllowed(policy.assigneeRoles, assigneeRole)) {
    throw new AppError(`Selected user role is not allowed for ${type} assignment`, 403);
  }
};

module.exports = {
  ASSIGNMENT_TYPES,
  DEFAULT_ASSIGNMENT_POLICIES,
  normalizeAssignmentPolicies,
  getAssignmentPolicies,
  assertAssignmentAllowed
};
