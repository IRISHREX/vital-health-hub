import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getVisualAccessSettings } from "@/lib/settings";
import { getPermissions, mergePermissions } from "@/lib/rbac";

const emptyPermissions = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export function useVisualAuth() {
  const { user } = useAuth();
  const email = (user?.email || "").trim().toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ["visual-access-settings"],
    queryFn: getVisualAccessSettings,
    enabled: !!user,
    staleTime: 60 * 1000
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
    const base = getPermissions(user?.role, module) || emptyPermissions;
    const override = overrideMap[module];
    return mergePermissions(base, override);
  };

  const can = (module, action = "canView") => !!getModulePermissions(module)?.[action];
  const canManageVisualPermissions = !!user && (
    user.role === "super_admin" || permissionManagers.includes(email)
  );

  return {
    isLoading,
    getModulePermissions,
    can,
    canManageVisualPermissions,
    permissionManagers,
    canView: (module) => can(module, "canView"),
    canCreate: (module) => can(module, "canCreate"),
    canEdit: (module) => can(module, "canEdit"),
    canDelete: (module) => can(module, "canDelete")
  };
}
