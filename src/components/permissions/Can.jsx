import { useVisualAuth } from "@/hooks/useVisualAuth";

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
 * Props:
 *   module   - RBAC module key (e.g. "patients", "billing")
 *   action   - "view" | "create" | "edit" | "delete" (default "view")
 *   feature  - optional feature name; when supplied, also checks the
 *              per-user restricted-features list from useVisualAuth.
 *   roles    - optional array of role keys; if provided, current user role
 *              must be included (in addition to the RBAC check).
 *   fallback - rendered when not allowed (default: null).
 */
export default function Can({
  module,
  action = "view",
  feature,
  roles,
  fallback = null,
  children,
}) {
  const { can, canUseFeature } = useVisualAuth();

  if (Array.isArray(roles) && roles.length > 0) {
    // Lazy import to avoid extra hook surface
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuth } = require("@/lib/AuthContext");
    const { user } = useAuth();
    if (!roles.includes(user?.role)) return fallback;
  }

  const allowed = feature
    ? canUseFeature(module, feature)
    : can(module, mapAction(action));

  return allowed ? children : fallback;
}

function mapAction(action) {
  const map = {
    view: "canView",
    create: "canCreate",
    edit: "canEdit",
    delete: "canDelete",
  };
  return map[String(action || "").toLowerCase()] || "canView";
}
