import { useVisualAuth } from "@/hooks/useVisualAuth";
import { useAuth } from "@/lib/AuthContext";

/**
 * Contextual permission gate. Renders children only if the current user
 * is allowed to perform the given action on the module (and the optional
 * `feature` is not personally restricted).
 *
 * Usage:
 *   <Can module="patients" action="create">
 *     <Button>Register Patient</Button>
 *   </Can>
 *
 *   <Can module="billing" action="delete" fallback={<ReadOnlyHint />}>
 *     <Button variant="destructive">Delete Invoice</Button>
 *   </Can>
 *
 *   <Can roles={["super_admin", "hospital_admin"]}>
 *     <AdminPanel />
 *   </Can>
 *
 * Props:
 *   module   - RBAC module key (e.g. "patients", "billing"). Optional when
 *              only `roles` is used.
 *   action   - "view" | "create" | "edit" | "delete" (default "view")
 *   feature  - optional feature name; when supplied, also checks the
 *              per-user restricted-features list.
 *   roles    - optional array of role keys; current user role must be
 *              included (combined with the RBAC check via AND).
 *   fallback - rendered when not allowed (default: null).
 */
const ACTION_MAP = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
};

export default function Can({
  module,
  action = "view",
  feature,
  roles,
  fallback = null,
  children,
}) {
  const { can, canUseFeature } = useVisualAuth();
  const { user } = useAuth();

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user?.role)) {
    return fallback;
  }

  if (!module) return children;

  const allowed = feature
    ? canUseFeature(module, feature)
    : can(module, ACTION_MAP[String(action).toLowerCase()] || "canView");

  return allowed ? children : fallback;
}
