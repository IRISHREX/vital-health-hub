import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getVisualAccessSettings } from "@/lib/settings";
import { getPermissions, mergePermissions } from "@/lib/rbac";
import { moduleFeatureCatalog } from "@/lib/advanced-permissions";

const emptyPermissions = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export function useVisualAuth() {
  const { user } = useAuth();
  const email = (user?.email || "").trim().toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ["visual-access-settings"],
    queryFn: getVisualAccessSettings,
    enabled: !!user,
    staleTime: 5 * 1000,
    refetchInterval: 15 * 1000
  });

  const overrides = useMemo(() => data?.data?.overrides || [], [data]);

  const emailOverride = useMemo(
    () => overrides.find((entry) => (entry?.email || "").toLowerCase() === email),
    [email, overrides]
  );
  const permissionManagers = useMemo(
    () => (data?.data?.permissionManagers || []).map((entry) => String(entry || "").toLowerCase()),
    [data]
  );

  const overrideMap = useMemo(() => {
    const map = {};
    (emailOverride?.modules || []).forEach((mod) => {
      if (mod?.module) map[mod.module] = mod;
    });
    return map;
  }, [emailOverride]);

  const getModulePermissions = (module) => {
    const hasEmailOverride = !!emailOverride;
    const override = overrideMap[module];

    // Enforce strict mode only when this module has an explicit override.
    // Unspecified modules should fall back to role-based permissions.
    if (hasEmailOverride && override) {
      return mergePermissions(emptyPermissions, override);
    }

    const base = getPermissions(user?.role, module) || emptyPermissions;
    return mergePermissions(base, override);
  };

  const can = (module, action = "canView") => !!getModulePermissions(module)?.[action];
  const getRestrictedFeatures = (module) => {
    if (!emailOverride) return [];
    const override = overrideMap[module];
    if (!override) return [];
    return (override.restrictedFeatures || []).map((feature) => String(feature || "").toLowerCase());
  };
  const isFeatureRestricted = (module, feature) => getRestrictedFeatures(module).includes(String(feature || "").toLowerCase());
  const canUseFeature = (module, feature) => {
    const actionMap = {
      view: "canView",
      create: "canCreate",
      edit: "canEdit",
      delete: "canDelete"
    };
    const action = actionMap[String(feature || "").toLowerCase()] || "canView";
    if (!can(module, action)) return false;
    return !isFeatureRestricted(module, feature);
  };

  const canManageVisualPermissions = !!user && (
    user.role === "super_admin" || permissionManagers.includes(email)
  );

  return {
    isLoading,
    getModulePermissions,
    can,
    canManageVisualPermissions,
    permissionManagers,
    getRestrictedFeatures,
    isFeatureRestricted,
    canUseFeature,
    moduleFeatureCatalog,
    canView: (module) => can(module, "canView"),
    canCreate: (module) => can(module, "canCreate"),
    canEdit: (module) => can(module, "canEdit"),
    canDelete: (module) => can(module, "canDelete")
  };
}
