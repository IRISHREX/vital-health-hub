import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingInfo from "@/components/settings/SettingInfo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Users,
  Shield,
  Bell,
  Database,
  Save,
  Loader2,
  User,
  Camera,
  Sun,
  Moon,
  Monitor,
  Search,
  Filter,
  UsersRound,
  UserCog,
  ShieldCheck,
  Mail,
  Send,
  Inbox,
  Clock3,
  Check,
  X,
  BellRing,
  LayoutPanelTop,
  Upload,
  Download,
  Play,
  FileSpreadsheet,
  CalendarClock,
  Copy,
  AlertCircle,
  Eye,
  Volume2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import ApprovalsManager from "@/components/approvals/ApprovalsManager";
import ApprovalsDiagnostics from "@/components/approvals/ApprovalsDiagnostics";
import { isValidPhone } from "@/lib/phoneValidation";
import {
  getAllSettings,
  updateHospitalSettings,
  updateSecuritySettings,
  updateNotificationSettings,
  getUserStats,
  getVisualAccessSettings,
  updateVisualAccessSettings,
  createAccessRequest,
  getPendingAccessRequests,
  respondToAccessRequest,
  getDataManagementSettings,
  updateModuleOperationsSettings,
  updateDataManagementSettings,
  getDataImportTemplate,
  bulkImportData,
  exportDataByEntity,
  runAutoExportNow,
  getAllowedSettingsTabs,
} from "@/lib/settings";
import { getNotifications } from "@/lib/notifications";
import { updateProfile } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { setUser as setStoredUser } from "@/lib/api-client";
import UserDialog from "@/components/dashboard/UserDialog";
import { getUsers } from "@/lib/users";
import { moduleLabels, rbacModules } from "@/lib/rbac";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { moduleFeatureCatalog, featureLabels } from "@/lib/advanced-permissions";
import SoundSettings from "@/components/settings/SoundSettings";
import { useRowActionsStyle } from "@/hooks/useRowActionsStyle";
import DOBAgeSetting from "@/components/settings/DOBAgeSetting";
import BrandingSettings from "@/components/settings/BrandingSettings";
import { normalizeValidationPreferences, validationFormRegistry } from "@/lib/validationPreferences";

const assignmentRoleOptions = ["super_admin", "hospital_admin", "doctor", "head_nurse", "nurse"];
const assignmentTypeLabels = {
  floor: "Floor Assignment",
  room: "Room Assignment",
  patient: "Patient Assignment",
};
const defaultAssignmentPolicies = {
  floor: { assignerRoles: [], assigneeRoles: [] },
  room: { assignerRoles: [], assigneeRoles: [] },
  patient: { assignerRoles: [], assigneeRoles: [] },
};
const permissionRequestFeatures = ["view", "create", "edit", "delete"];
const settingsTabTriggerClass = "h-9 shrink-0 gap-2 px-3 text-xs sm:text-sm";
const settingsRowClass = "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between";
const settingsPlainRowClass = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

function SettingsLoadingState() {
  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <div className="absolute h-9 w-9 rounded-full bg-primary/10 motion-safe:animate-pulse" />
        <Loader2 className="relative h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">Loading settings</p>
        <p className="text-xs text-muted-foreground">Preparing controls, permissions, and preferences.</p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="h-3 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
            <div className="h-8 rounded bg-muted/70 motion-safe:animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted/60 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

const moduleIconMap = {
  dashboard: LayoutPanelTop,
  beds: Building2,
  admissions: UsersRound,
  patients: Users,
  doctors: User,
  nurses: UserCog,
  appointments: Clock3,
  facilities: Building2,
  billing: Database,
  reports: Database,
  notifications: BellRing,
  settings: Shield,
  tasks: Check,
  vitals: ShieldCheck,
  lab: Database,
  pharmacy: Database,
  radiology: Database,
};

const dataEntityOptions = [
  { key: "beds", label: "Beds" },
  { key: "doctors", label: "Doctors" },
  { key: "nurses", label: "Nurses" },
  { key: "medicines", label: "Medicines" },
  { key: "tests", label: "Tests" },
  { key: "patients", label: "Patients" },
  { key: "patient_history", label: "Patient History" },
  { key: "billings", label: "Billings" },
];

const moduleOperationKeys = ["pathology", "radiology", "pharmacy"];
const moduleOperationLabels = {
  pathology: "Pathology Lab",
  radiology: "Radiology",
  pharmacy: "Pharmacy",
};
const createDefaultModuleOperationConfig = () => ({
  enabled: true,
  runIndependently: true,
  integrateWithHospitalCore: true,
  allowExternalWalkIns: true,
  externalBillingEnabled: true,
  trackExternalBillingSeparately: true,
});
const createDefaultModuleOperationsSettings = () => ({
  deploymentMode: "hybrid",
  modules: {
    pathology: createDefaultModuleOperationConfig(),
    radiology: createDefaultModuleOperationConfig(),
    pharmacy: createDefaultModuleOperationConfig(),
  },
  userOverrides: [],
});

const parseSpreadsheetText = (text) => {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return [];
  const lines = source.split("\n").filter((line) => line.trim());
  if (!lines.length) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const parseLine = (line) => {
    if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim());
    const out = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
};

const toCsv = (headers, rows) => [
  headers.join(","),
  ...rows.map((row) =>
    headers.map((header) => `"${String(row?.[header] ?? "").replace(/"/g, '""')}"`).join(",")
  ),
].join("\n");

export default function Settings() {
  const { user, logout } = useAuth();
  const { canManageVisualPermissions, canCreate, isModuleEnabled, enabledModules } = useVisualAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    preferences: validationPreferences,
    savePreferences: saveValidationPreferences,
    isLoading: validationPreferencesLoading,
  } = useValidationPreferences();
  const isAdmin = user?.role === "super_admin" || user?.role === "hospital_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const importFileInputRef = useRef(null);
  
  // Profile state
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    avatar: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profilePhoneError, setProfilePhoneError] = useState("");
  const [validationPreferencesDraft, setValidationPreferencesDraft] = useState(() => normalizeValidationPreferences());
  const [savingValidationPreferences, setSavingValidationPreferences] = useState(false);
  
  // Hospital settings state
  const [hospitalSettings, setHospitalSettings] = useState({
    hospitalName: "",
    registrationNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    gstNumber: "",
    defaultTaxRate: 18,
  });
  const [hospitalPhoneError, setHospitalPhoneError] = useState("");

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    pushNotifications: true,
    perModule: {},
  });

  // User stats state
  const [userStats, setUserStats] = useState({
    superAdmin: 0,
    hospitalAdmin: 0,
    doctor: 0,
    nurse: 0,
    receptionist: 0,
    billingStaff: 0,
  });

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userEmails, setUserEmails] = useState([]);
  const [userDirectory, setUserDirectory] = useState([]);
  const [moduleOperationsSettings, setModuleOperationsSettings] = useState(createDefaultModuleOperationsSettings);
  const [selectedModuleOverrideUserId, setSelectedModuleOverrideUserId] = useState("__none__");
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [permissionEmail, setPermissionEmail] = useState("");
  const [permissionManagers, setPermissionManagers] = useState([]);
  const [managerEmailInput, setManagerEmailInput] = useState("");
  const [assignmentPolicies, setAssignmentPolicies] = useState(defaultAssignmentPolicies);
  const [permissionModuleSearch, setPermissionModuleSearch] = useState("");
  const [permissionModuleFilter, setPermissionModuleFilter] = useState("all");
  const [permissionVisibleModules, setPermissionVisibleModules] = useState(rbacModules);
  const [permissionSubtab, setPermissionSubtab] = useState("matrix");
  const [requestForm, setRequestForm] = useState({ module: "billing", feature: "view", reason: "" });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState([]);
  const [permissionNotifications, setPermissionNotifications] = useState([]);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState("");

  // Data management (Super Admin)
  const [dataManagementSettings, setDataManagementSettings] = useState({
    autoExport: {
      enabled: false,
      frequency: "weekly",
      time: "02:00",
      dayOfWeek: 0,
      dayOfMonth: 1,
      format: "csv",
      entities: ["beds", "doctors", "nurses", "medicines", "tests"],
      recipients: [],
    },
    lastRunAt: "",
    lastRunStatus: "",
    lastRunMessage: "",
  });
  const [selectedImportEntity, setSelectedImportEntity] = useState("beds");
  const [selectedExportEntity, setSelectedExportEntity] = useState("beds");
  const [importText, setImportText] = useState("");
  const [importRowsPreview, setImportRowsPreview] = useState([]);
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [runningAutoExport, setRunningAutoExport] = useState(false);

  // Fetch user stats using react-query (v5 object syntax)
  useQuery({
    queryKey: ["user-stats"],
    queryFn: getUserStats,
    enabled: isAdmin,
    onSuccess: (res) => {
      if (res && res.success && res.data) {
        setUserStats(res.data);
      }
    }
  });

  // Load all settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const adminUser = isAdmin;
        
        // Set profile from user context
        if (user) {
          setProfile({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            avatar: user.avatar || "",
          });
          setAvatarPreview(user.avatar || "");
        }
        
        const [settingsRes, statsRes, visualAccessRes, usersRes, dataManagementRes] = await Promise.all([
          adminUser ? getAllSettings() : Promise.resolve(null),
          adminUser ? getUserStats() : Promise.resolve(null),
          getVisualAccessSettings(),
          (adminUser || canManageVisualPermissions) ? getUsers() : Promise.resolve(null),
          isSuperAdmin ? getDataManagementSettings().catch(() => null) : Promise.resolve(null),
        ]);
        const [pendingRes, permissionNotifRes] = await Promise.all([
          user?.role === "super_admin" ? getPendingAccessRequests().catch(() => null) : Promise.resolve(null),
          getNotifications({ limit: 50 }).catch(() => null),
        ]);

        if (settingsRes?.success && settingsRes?.data) {
          const { hospital, security, notifications, dataManagement, moduleOperations } = settingsRes.data;
          
          setHospitalSettings({
            hospitalName: hospital?.hospitalName || "",
            registrationNumber: hospital?.registrationNumber || "",
            address: hospital?.address || "",
            phone: hospital?.phone || "",
            email: hospital?.email || "",
            website: hospital?.website || "",
            gstNumber: hospital?.gstNumber || "",
            defaultTaxRate: hospital?.defaultTaxRate || 18,
          });

          setSecuritySettings({
            twoFactorEnabled: security?.twoFactorEnabled || false,
            sessionTimeout: String(security?.sessionTimeout || 30),
            passwordExpiry: security?.passwordExpiry || "90",
          });

          setNotificationSettings({
            emailNotifications: notifications?.emailNotifications ?? true,
            smsAlerts: notifications?.smsAlerts ?? false,
            pushNotifications: notifications?.pushNotifications ?? true,
          });

          if (moduleOperations) {
            setModuleOperationsSettings({
              deploymentMode: moduleOperations?.deploymentMode || "hybrid",
              modules: {
                pathology: {
                  ...createDefaultModuleOperationConfig(),
                  ...(moduleOperations?.modules?.pathology || {}),
                },
                radiology: {
                  ...createDefaultModuleOperationConfig(),
                  ...(moduleOperations?.modules?.radiology || {}),
                },
                pharmacy: {
                  ...createDefaultModuleOperationConfig(),
                  ...(moduleOperations?.modules?.pharmacy || {}),
                },
              },
              userOverrides: Array.isArray(moduleOperations?.userOverrides) ? moduleOperations.userOverrides : [],
            });
          }

          if (isSuperAdmin && dataManagement) {
            const nextDataSettings = {
              autoExport: {
                enabled: !!dataManagement?.autoExport?.enabled,
                frequency: dataManagement?.autoExport?.frequency || "weekly",
                time: dataManagement?.autoExport?.time || "02:00",
                dayOfWeek: Number(dataManagement?.autoExport?.dayOfWeek ?? 0),
                dayOfMonth: Number(dataManagement?.autoExport?.dayOfMonth ?? 1),
                format: dataManagement?.autoExport?.format || "csv",
                entities: dataManagement?.autoExport?.entities || ["beds", "doctors", "nurses", "medicines", "tests"],
                recipients: dataManagement?.autoExport?.recipients || [],
              },
              lastRunAt: dataManagement?.lastRunAt || "",
              lastRunStatus: dataManagement?.lastRunStatus || "",
              lastRunMessage: dataManagement?.lastRunMessage || "",
            };
            setDataManagementSettings(nextDataSettings);
            setRecipientsInput((nextDataSettings.autoExport.recipients || []).join(", "));
          }
        }

        if (isSuperAdmin && dataManagementRes?.success && dataManagementRes?.data) {
          const dm = dataManagementRes.data;
          const nextDataSettings = {
            autoExport: {
              enabled: !!dm?.autoExport?.enabled,
              frequency: dm?.autoExport?.frequency || "weekly",
              time: dm?.autoExport?.time || "02:00",
              dayOfWeek: Number(dm?.autoExport?.dayOfWeek ?? 0),
              dayOfMonth: Number(dm?.autoExport?.dayOfMonth ?? 1),
              format: dm?.autoExport?.format || "csv",
              entities: dm?.autoExport?.entities || ["beds", "doctors", "nurses", "medicines", "tests"],
              recipients: dm?.autoExport?.recipients || [],
            },
            lastRunAt: dm?.lastRunAt || "",
            lastRunStatus: dm?.lastRunStatus || "",
            lastRunMessage: dm?.lastRunMessage || "",
          };
          setDataManagementSettings(nextDataSettings);
          setRecipientsInput((nextDataSettings.autoExport.recipients || []).join(", "));
        }

        if (statsRes?.success && statsRes?.data) {
          setUserStats(statsRes.data);
        }

        if (visualAccessRes?.success && visualAccessRes?.data) {
          setPermissionOverrides(visualAccessRes.data.overrides || []);
          setPermissionManagers(visualAccessRes.data.permissionManagers || []);
          setAssignmentPolicies({
            floor: {
              assignerRoles: visualAccessRes.data.assignmentPolicies?.floor?.assignerRoles || [],
              assigneeRoles: visualAccessRes.data.assignmentPolicies?.floor?.assigneeRoles || [],
            },
            room: {
              assignerRoles: visualAccessRes.data.assignmentPolicies?.room?.assignerRoles || [],
              assigneeRoles: visualAccessRes.data.assignmentPolicies?.room?.assigneeRoles || [],
            },
            patient: {
              assignerRoles: visualAccessRes.data.assignmentPolicies?.patient?.assignerRoles || [],
              assigneeRoles: visualAccessRes.data.assignmentPolicies?.patient?.assigneeRoles || [],
            },
          });
          if (!permissionEmail && visualAccessRes.data.overrides?.length) {
            setPermissionEmail(visualAccessRes.data.overrides[0].email);
          }
        }

        if (usersRes?.success && usersRes?.data?.users) {
          setUserDirectory(usersRes.data.users || []);
          const emails = usersRes.data.users
            .map((u) => u.email)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setUserEmails(emails);
        }
        if (pendingRes?.success && Array.isArray(pendingRes.data)) {
          setPendingAccessRequests(pendingRes.data);
        } else {
          setPendingAccessRequests([]);
        }
        const notifList = permissionNotifRes?.data?.notifications || [];
        setPermissionNotifications(
          notifList.filter((n) => ["access_request", "access_request_resolved"].includes(n.type))
        );
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, isAdmin, isSuperAdmin, canManageVisualPermissions]);

  useEffect(() => {
    setValidationPreferencesDraft(normalizeValidationPreferences(validationPreferences));
  }, [validationPreferences]);

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setProfile((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await updateProfile(profile);
      
      if (response.success && response.data?.user) {
        // Update stored user
        const updatedUser = { ...user, ...response.data.user };
        setStoredUser(updatedUser);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Save hospital settings
  const handleSaveHospital = async () => {
    try {
      setSaving(true);
      await updateHospitalSettings(hospitalSettings);
      toast.success("Hospital settings saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save hospital settings");
    } finally {
      setSaving(false);
    }
  };

  // Save security settings
  const handleSaveSecurity = async () => {
    try {
      setSaving(true);
      await updateSecuritySettings({
        ...securitySettings,
        sessionTimeout: parseInt(securitySettings.sessionTimeout),
        passwordExpiry: parseInt(securitySettings.passwordExpiry),
      });
      toast.success("Security settings saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save security settings");
    } finally {
      setSaving(false);
    }
  };

  // Save notification settings
  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await updateNotificationSettings(notificationSettings);
      toast.success("Notification settings saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const updateValidationFormState = (formId, enabled) => {
    setValidationPreferencesDraft((prev) => {
      const next = normalizeValidationPreferences(prev);
      next.forms[formId] = {
        ...next.forms[formId],
        enabled,
      };
      return next;
    });
  };

  const updateValidationFieldState = (formId, fieldKey, enabled) => {
    setValidationPreferencesDraft((prev) => {
      const next = normalizeValidationPreferences(prev);
      next.forms[formId] = {
        ...next.forms[formId],
        fields: {
          ...(next.forms[formId]?.fields || {}),
          [fieldKey]: enabled,
        },
      };
      return next;
    });
  };

  const handleSaveValidationPreferences = async () => {
    try {
      setSavingValidationPreferences(true);
      await saveValidationPreferences(validationPreferencesDraft);
      toast.success("Validation preferences saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save validation preferences");
    } finally {
      setSavingValidationPreferences(false);
    }
  };

  const selectedPermissionOverride = useMemo(
    () => permissionOverrides.find((item) => item.email === permissionEmail) || null,
    [permissionOverrides, permissionEmail]
  );

  // Only allow editing permissions for modules enabled by Grandmaster.
  // This ensures super_admin cannot override GM-level module restrictions.
  const gmAllowedRbacModules = useMemo(
    () => rbacModules.filter((module) => isModuleEnabled(module)),
    [isModuleEnabled, enabledModules]
  );

  const selectedPermissionModules = useMemo(() => {
    const byModule = new Map((selectedPermissionOverride?.modules || []).map((item) => [item.module, item]));
    return gmAllowedRbacModules.map((module) => {
      const entry = byModule.get(module);
      return {
        module,
        canView: !!entry?.canView,
        canCreate: !!entry?.canCreate,
        canEdit: !!entry?.canEdit,
        canDelete: !!entry?.canDelete,
        restrictedFeatures: (entry?.restrictedFeatures || []).map((feature) => String(feature || "").toLowerCase()),
      };
    });
  }, [selectedPermissionOverride, gmAllowedRbacModules]);

  const filteredPermissionModules = useMemo(() => {
    const query = permissionModuleSearch.trim().toLowerCase();
    return selectedPermissionModules.filter((mod) => {
      const label = (moduleLabels[mod.module] || mod.module).toLowerCase();
      const byFilter = permissionModuleFilter === "all" || mod.module === permissionModuleFilter;
      const byVisibility = permissionVisibleModules.includes(mod.module);
      const bySearch = !query || label.includes(query) || mod.module.toLowerCase().includes(query);
      return byFilter && byVisibility && bySearch;
    });
  }, [selectedPermissionModules, permissionModuleSearch, permissionModuleFilter, permissionVisibleModules]);

  const togglePermissionModuleVisibility = (module, checked) => {
    setPermissionVisibleModules((prev) => {
      if (!checked) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== module);
      }
      return prev.includes(module) ? prev : [...prev, module];
    });
  };

  const ensureEmailOverride = (email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return null;

    if (permissionOverrides.some((item) => item.email === normalizedEmail)) {
      return normalizedEmail;
    }

    const newEntry = { email: normalizedEmail, modules: [] };
    setPermissionOverrides((prev) => [...prev, newEntry]);
    return normalizedEmail;
  };

  const handlePermissionToggle = (module, key, checked) => {
    const normalizedEmail = ensureEmailOverride(permissionEmail);
    if (!normalizedEmail) return;

    setPermissionOverrides((prev) =>
      prev.map((entry) => {
        if (entry.email !== normalizedEmail) return entry;
        const existing = entry.modules || [];
        const found = existing.find((m) => m.module === module);
        const updatedModule = {
          module,
          canView: found?.canView || false,
          canCreate: found?.canCreate || false,
          canEdit: found?.canEdit || false,
          canDelete: found?.canDelete || false,
          restrictedFeatures: (found?.restrictedFeatures || []).map((feature) => String(feature || "").toLowerCase()),
          [key]: checked,
        };
        if (key !== "canView" && checked) updatedModule.canView = true;
        if (key === "canView" && !checked) {
          updatedModule.canCreate = false;
          updatedModule.canEdit = false;
          updatedModule.canDelete = false;
        }
        const nextModules = found
          ? existing.map((m) => (m.module === module ? updatedModule : m))
          : [...existing, updatedModule];
        return { ...entry, modules: nextModules };
      })
    );
  };

  const handleRestrictedFeatureToggle = (module, feature, checked) => {
    const normalizedEmail = ensureEmailOverride(permissionEmail);
    if (!normalizedEmail) return;

    setPermissionOverrides((prev) =>
      prev.map((entry) => {
        if (entry.email !== normalizedEmail) return entry;
        const existing = entry.modules || [];
        const found = existing.find((m) => m.module === module);
        const currentRestricted = new Set((found?.restrictedFeatures || []).map((f) => String(f || "").toLowerCase()));
        if (checked) currentRestricted.add(feature);
        else currentRestricted.delete(feature);

        const updatedModule = {
          module,
          canView: found?.canView || false,
          canCreate: found?.canCreate || false,
          canEdit: found?.canEdit || false,
          canDelete: found?.canDelete || false,
          restrictedFeatures: Array.from(currentRestricted)
        };

        const nextModules = found
          ? existing.map((m) => (m.module === module ? updatedModule : m))
          : [...existing, updatedModule];
        return { ...entry, modules: nextModules };
      })
    );
  };

  const handleSaveVisualPermissions = async () => {
    try {
      setSaving(true);
      const payload = {
        permissionManagers: user?.role === "super_admin" ? permissionManagers : undefined,
        assignmentPolicies,
        overrides: permissionOverrides
          .filter((entry) => entry.email)
          .map((entry) => ({
            email: entry.email,
            modules: (entry.modules || []).filter((m) => m.module),
          })),
      };
      await updateVisualAccessSettings(payload);
      toast.success("Visual permissions updated");
    } catch (error) {
      toast.error(error.message || "Failed to update visual permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOverride = () => {
    if (!permissionEmail) return;
    const next = permissionOverrides.filter((entry) => entry.email !== permissionEmail);
    setPermissionOverrides(next);
    setPermissionEmail(next[0]?.email || "");
  };

  const handleAddPermissionManager = () => {
    if (user?.role !== "super_admin") return;
    const email = String(managerEmailInput || "").trim().toLowerCase();
    if (!email) return;
    if (!permissionManagers.includes(email)) {
      setPermissionManagers((prev) => [...prev, email]);
    }
    setManagerEmailInput("");
  };

  const handleRemovePermissionManager = (email) => {
    if (user?.role !== "super_admin") return;
    setPermissionManagers((prev) => prev.filter((item) => item !== email));
  };

  const handleSubmitPermissionRequest = async () => {
    if (!requestForm.module || !requestForm.feature) return;
    try {
      setSubmittingRequest(true);
      await createAccessRequest({
        module: requestForm.module,
        feature: requestForm.feature,
        reason: requestForm.reason
      });
      toast.success("Permission request submitted");
      setRequestForm((prev) => ({ ...prev, reason: "" }));
    } catch (error) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleLoadImportTemplate = async (entity = selectedImportEntity) => {
    try {
      const res = await getDataImportTemplate(entity);
      const headers = res?.data?.headers || [];
      setTemplateHeaders(headers);
      if (headers.length) {
        const headerLine = headers.join(",");
        setImportText((prev) => (prev.trim() ? prev : `${headerLine}\n`));
      }
    } catch (error) {
      toast.error(error.message || "Failed to load import template");
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    handleLoadImportTemplate(selectedImportEntity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, selectedImportEntity]);

  const handleImportTextChange = (value) => {
    setImportText(value);
    const rows = parseSpreadsheetText(value);
    setImportRowsPreview(rows.slice(0, 5));
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleImportTextChange(text);
      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error(error.message || "Failed to read file");
    } finally {
      event.target.value = "";
    }
  };

  const handleBulkImportSubmit = async () => {
    try {
      const rows = parseSpreadsheetText(importText);
      if (!rows.length) {
        toast.error("Provide spreadsheet data with header row");
        return;
      }
      setSaving(true);
      const response = await bulkImportData({ entity: selectedImportEntity, rows });
      const summary = response?.data || {};
      toast.success(`Import complete. Created: ${summary.created || 0}, Updated: ${summary.updated || 0}, Skipped: ${summary.skipped || 0}`);
      if ((summary.errors || []).length) {
        toast.warning(`${summary.errors.length} row(s) had errors`);
      }
    } catch (error) {
      toast.error(error.message || "Bulk import failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExportEntity = async (entity) => {
    try {
      const response = await exportDataByEntity(entity);
      const headers = response?.data?.headers || [];
      const rows = response?.data?.rows || [];
      const csv = toCsv(headers, rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${entity}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} ${entity} record(s)`);
    } catch (error) {
      toast.error(error.message || "Export failed");
    }
  };

  const toggleAutoExportEntity = (entity, checked) => {
    setDataManagementSettings((prev) => {
      const existing = prev.autoExport?.entities || [];
      const nextEntities = checked
        ? Array.from(new Set([...existing, entity]))
        : existing.filter((item) => item !== entity);
      return {
        ...prev,
        autoExport: {
          ...prev.autoExport,
          entities: nextEntities,
        },
      };
    });
  };

  const handleSaveDataManagement = async () => {
    try {
      setSaving(true);
      const recipients = recipientsInput
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        autoExport: {
          ...dataManagementSettings.autoExport,
          recipients,
        },
      };
      const response = await updateDataManagementSettings(payload);
      const next = response?.data || null;
      if (next) {
        setDataManagementSettings((prev) => ({
          ...prev,
          autoExport: {
            ...prev.autoExport,
            ...next.autoExport,
          },
          lastRunAt: next.lastRunAt || prev.lastRunAt,
          lastRunStatus: next.lastRunStatus || prev.lastRunStatus,
          lastRunMessage: next.lastRunMessage || prev.lastRunMessage,
        }));
      }
      toast.success("Data management settings updated");
    } catch (error) {
      toast.error(error.message || "Failed to save data management settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutoExport = async () => {
    try {
      setRunningAutoExport(true);
      const response = await runAutoExportNow();
      const runAt = response?.data?.runAt || new Date().toISOString();
      setDataManagementSettings((prev) => ({
        ...prev,
        lastRunAt: runAt,
        lastRunStatus: "success",
        lastRunMessage: response?.message || "Auto export run completed",
      }));
      toast.success(response?.message || "Auto export run completed");
    } catch (error) {
      toast.error(error.message || "Failed to run auto export");
    } finally {
      setRunningAutoExport(false);
    }
  };

  const updateGlobalModuleOperation = (moduleKey, field, checked) => {
    setModuleOperationsSettings((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: {
          ...(prev.modules?.[moduleKey] || createDefaultModuleOperationConfig()),
          [field]: checked,
        },
      },
    }));
  };

  const selectedModuleOverride = useMemo(() => {
    if (selectedModuleOverrideUserId === "__none__") return null;
    return (moduleOperationsSettings.userOverrides || []).find(
      (entry) => String(entry?.user) === String(selectedModuleOverrideUserId)
    ) || null;
  }, [moduleOperationsSettings.userOverrides, selectedModuleOverrideUserId]);

  const updateUserModuleOperation = (moduleKey, field, checked) => {
    if (selectedModuleOverrideUserId === "__none__") return;
    setModuleOperationsSettings((prev) => {
      const overrides = Array.isArray(prev.userOverrides) ? [...prev.userOverrides] : [];
      const existingIdx = overrides.findIndex(
        (entry) => String(entry?.user) === String(selectedModuleOverrideUserId)
      );
      const baseModules = existingIdx >= 0 ? (overrides[existingIdx].modules || {}) : {};
      const moduleBase = {
        ...(prev.modules?.[moduleKey] || createDefaultModuleOperationConfig()),
        ...(baseModules?.[moduleKey] || {}),
        [field]: checked,
      };

      if (existingIdx >= 0) {
        overrides[existingIdx] = {
          ...overrides[existingIdx],
          modules: {
            ...baseModules,
            [moduleKey]: moduleBase,
          },
        };
      } else {
        overrides.push({
          user: selectedModuleOverrideUserId,
          modules: {
            [moduleKey]: moduleBase,
          },
        });
      }

      return {
        ...prev,
        userOverrides: overrides,
      };
    });
  };

  const handleRemoveUserOverride = () => {
    if (selectedModuleOverrideUserId === "__none__") return;
    setModuleOperationsSettings((prev) => ({
      ...prev,
      userOverrides: (prev.userOverrides || []).filter(
        (entry) => String(entry?.user) !== String(selectedModuleOverrideUserId)
      ),
    }));
  };

  const handleSaveModuleOperations = async () => {
    try {
      setSaving(true);
      await updateModuleOperationsSettings({
        deploymentMode: moduleOperationsSettings.deploymentMode,
        modules: moduleOperationsSettings.modules,
        userOverrides: (moduleOperationsSettings.userOverrides || []).map((entry) => ({
          user: entry.user,
          modules: entry.modules || {},
        })),
      });
      toast.success("Module operations settings updated");
    } catch (error) {
      toast.error(error.message || "Failed to update module operations settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDecision = async (requestId, decision) => {
    try {
      setRequestActionLoadingId(requestId);
      await respondToAccessRequest(requestId, { decision });
      toast.success(`Request ${decision}`);
      setPendingAccessRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (error) {
      toast.error(error.message || `Failed to ${decision} request`);
    } finally {
      setRequestActionLoadingId("");
    }
  };

  const toggleAssignmentPolicyRole = (assignmentType, policyKey, role, checked) => {
    setAssignmentPolicies((prev) => {
      const current = prev?.[assignmentType]?.[policyKey] || [];
      const nextRoles = checked
        ? Array.from(new Set([...current, role]))
        : current.filter((item) => item !== role);
      return {
        ...prev,
        [assignmentType]: {
          ...(prev?.[assignmentType] || {}),
          [policyKey]: nextRoles
        }
      };
    });
  };

  // Fetch allowed settings tabs from grandmaster config
  const { data: allowedTabsRes } = useQuery({
    queryKey: ["allowed-settings-tabs"],
    queryFn: getAllowedSettingsTabs,
  });
  const allowedGmTabs = allowedTabsRes?.data;

  if (loading) {
    return <SettingsLoadingState />;
  }

  const roleDisplayNames = {
    superAdmin: "Super Admin",
    hospitalAdmin: "Hospital Admin",
    doctor: "Doctor",
    nurse: "Nurse",
    receptionist: "Receptionist",
    billingStaff: "Billing Staff",
    pharmacist: "Pharmacist",
  };

  const userInitials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";
  const moduleOverrideUsers = (userDirectory || []).filter((entry) => entry?._id);
  const canSeeVisualPermissionsTab = true;
  const canEditVisualPermissions = user?.role === "super_admin" || canManageVisualPermissions;
  const canEditDelegation = user?.role === "super_admin";

  // Map GM tab values to frontend tab values
  // GM uses: general, users, security, notifications, data, visual_access, module_operations
  // Frontend uses: general, users, security, notifications, data, permissions (=visual_access), modules (=module_operations)
  const isTabAllowed = (frontendTab) => {
    if (!allowedGmTabs) return true; // default: show all until loaded
    const mapping = {
      permissions: 'visual_access',
      modules: 'module_operations',
    };
    const gmKey = mapping[frontendTab] || frontendTab;
    return allowedGmTabs.includes(gmKey);
  };

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Manage hospital system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="min-w-0 space-y-6">
        <TabsList className="flex h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-lg p-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
          <TabsTrigger value="profile" className={settingsTabTriggerClass}>
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && isTabAllowed('general') && (
            <TabsTrigger value="general" className={settingsTabTriggerClass}>
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
          )}
          {isAdmin && isTabAllowed('users') && (
            <TabsTrigger value="users" className={settingsTabTriggerClass}>
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          )}
          {isAdmin && isTabAllowed('security') && (
            <TabsTrigger value="security" className={settingsTabTriggerClass}>
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          )}
          {isAdmin && isTabAllowed('notifications') && (
            <TabsTrigger value="notifications" className={settingsTabTriggerClass}>
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          )}
          {isAdmin && isTabAllowed('modules') && (
            <TabsTrigger value="modules" className={settingsTabTriggerClass}>
              <Database className="h-4 w-4" />
              Modules
            </TabsTrigger>
          )}
          {isAdmin && isTabAllowed('data') && (
            <TabsTrigger value="data" className={settingsTabTriggerClass}>
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
          )}
          {canSeeVisualPermissionsTab && isTabAllowed('permissions') && (
            <TabsTrigger value="permissions" className={settingsTabTriggerClass}>
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="approvals" className={settingsTabTriggerClass}>
              <ShieldCheck className="h-4 w-4" />
              Approvals
            </TabsTrigger>
          )}
          <TabsTrigger value="sounds" className={settingsTabTriggerClass}>
            <Volume2 className="h-4 w-4" />
            Sounds
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="branding" className={settingsTabTriggerClass}>
              <ImageIcon className="h-4 w-4" />
              Branding
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="data-settings" className={settingsTabTriggerClass}>
              <Database className="h-4 w-4" />
              Data Settings
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="branding" className="space-y-6">
            <BrandingSettings />
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">My Profile<SettingInfo title="My Profile" purpose="Your personal account details, display name, avatar, contact info and theme preference. Changes here only affect your login." precaution="Email is your login identifier — update with care; you may be signed out." /></CardTitle>
              <CardDescription>
                Update your personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <h3 className="font-medium">{user?.fullName || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.role?.replace("_", " ")}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Profile Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profileEmail">Email</Label>
                  <Input
                    id="profileEmail"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePhone">Phone</Label>
                  <Input
                    id="profilePhone"
                    value={profile.phone}
                    onChange={(e) => {
                      setProfile((prev) => ({ ...prev, phone: e.target.value }));
                      const value = e.target.value;
                      if (value.trim() === "") {
                        setProfilePhoneError("");
                      } else if (!isValidPhone(value)) {
                        setProfilePhoneError("Phone number must contain exactly 10 digits");
                      } else {
                        setProfilePhoneError("");
                      }
                    }}
                    placeholder="Enter 10-digit phone number"
                    className={profilePhoneError ? "border-red-500" : ""}
                  />
                  {profilePhoneError && <p className="text-sm text-red-500 mt-1">{profilePhoneError}</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Hospital Information<SettingInfo title="Hospital Information" purpose="Organization name, address, phone, registration numbers and timings printed on invoices, prescriptions and reports." precaution="Updating these values changes every printed document organization-wide; verify spelling and tax/registration IDs before saving." /></CardTitle>
                  <CardDescription>
                    Basic information about your hospital
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hospital-name">Hospital Name</Label>
                      <Input
                        id="hospital-name"
                        value={hospitalSettings.hospitalName}
                        onChange={(e) =>
                          setHospitalSettings((prev) => ({
                            ...prev,
                            hospitalName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration">Registration Number</Label>
                      <Input
                        id="registration"
                        value={hospitalSettings.registrationNumber}
                        onChange={(e) =>
                          setHospitalSettings((prev) => ({
                            ...prev,
                            registrationNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={hospitalSettings.address}
                      onChange={(e) =>
                        setHospitalSettings((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={hospitalSettings.phone}
                        onChange={(e) => {
                          setHospitalSettings((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }));
                          const value = e.target.value;
                          if (value.trim() === "") {
                            setHospitalPhoneError("");
                          } else if (!isValidPhone(value)) {
                            setHospitalPhoneError("Phone number must contain exactly 10 digits");
                          } else {
                            setHospitalPhoneError("");
                          }
                        }}
                        placeholder="Enter 10-digit phone number"
                        className={hospitalPhoneError ? "border-red-500" : ""}
                      />
                      {hospitalPhoneError && <p className="text-sm text-red-500 mt-1">{hospitalPhoneError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={hospitalSettings.email}
                        onChange={(e) =>
                          setHospitalSettings((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={hospitalSettings.website}
                        onChange={(e) =>
                          setHospitalSettings((prev) => ({
                            ...prev,
                            website: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Billing Configuration</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="gst">GST Number</Label>
                        <Input
                          id="gst"
                          value={hospitalSettings.gstNumber}
                          onChange={(e) =>
                            setHospitalSettings((prev) => ({
                              ...prev,
                              gstNumber: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                        <Input
                          id="tax-rate"
                          type="number"
                          value={hospitalSettings.defaultTaxRate}
                          onChange={(e) =>
                            setHospitalSettings((prev) => ({
                              ...prev,
                              defaultTaxRate: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto" onClick={handleSaveHospital} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">User Management<SettingInfo title="User Management" purpose="Create, edit and deactivate staff accounts. Assign RBAC roles (doctor, nurse, receptionist, billing, admin) that determine what each user can access." precaution="Role changes apply on the user's next login. Deactivating a user revokes access immediately but does not delete their historical records." /></CardTitle>
                  <CardDescription>
                    Manage user roles and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Role Configuration</h3>
                    <div className="space-y-3">
                      {Object.entries(userStats).map(([role, count]) => (
                        <div
                          key={role}
                          className={settingsRowClass}
                        >
                          <div>
                            <p className="font-medium">{roleDisplayNames[role]}</p>
                            <p className="text-sm text-muted-foreground">
                              {count} user{count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {canCreate("settings") && <Button className="w-full sm:w-auto" variant="outline">Add Role</Button>}
                    {canCreate("settings") && <Button className="w-full sm:w-auto" onClick={() => setIsUserDialogOpen(true)}>Add User</Button>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User dialog */}
            <UserDialog isOpen={isUserDialogOpen} onClose={() => setIsUserDialogOpen(false)} />

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Security Settings<SettingInfo title="Security Settings" purpose="Password policy, session timeout, two-factor authentication and audit logging controls for the organization." precaution="Stricter policies (short session timeout, forced 2FA) can lock out users without configured devices — communicate changes to staff first." /></CardTitle>
                  <CardDescription>
                    Configure authentication and security options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all admin accounts
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Coming Soon</Badge>
                      <Switch
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            twoFactorEnabled: checked,
                          }))
                        }
                        disabled
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out inactive users
                      </p>
                    </div>
                    <Select
                      value={securitySettings.sessionTimeout}
                      onValueChange={(value) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          sessionTimeout: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="20">20 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>Password Expiry</Label>
                      <p className="text-sm text-muted-foreground">
                        Force password change periodically
                      </p>
                    </div>
                    <Select
                      value={securitySettings.passwordExpiry}
                      onValueChange={(value) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          passwordExpiry: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="15">15 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={handleSaveSecurity}
                      disabled={saving || user?.role !== "super_admin"}
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Notification Settings<SettingInfo title="Notification Settings" purpose="Toggle in-app, email and SMS alerts per event type (bed availability, appointments, invoices, schedule changes). Polled every 30 s." precaution="Disabling critical channels (e.g. payment overdue) may cause missed follow-ups. Email/SMS require working SMTP / gateway credentials." /></CardTitle>
                  <CardDescription>
                    Configure system-wide notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) => ({
                          ...prev,
                          emailNotifications: checked,
                        }))
                      }
                    />
                  </div>

                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>SMS Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Send critical alerts via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.smsAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) => ({
                          ...prev,
                          smsAlerts: checked,
                        }))
                      }
                    />
                  </div>

                  <div className={settingsPlainRowClass}>
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Browser push notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) => ({
                          ...prev,
                          pushNotifications: checked,
                        }))
                      }
                    />
                  </div>

                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-medium">Per-module notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Only modules enabled for your organization are shown.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rbacModules
                        .filter((mod) => isModuleEnabled(mod) && !["dashboard", "settings", "notifications"].includes(mod))
                        .map((mod) => {
                          const enabled = notificationSettings.perModule?.[mod] !== false;
                          return (
                            <label
                              key={`notif-${mod}`}
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                            >
                              <span className="text-sm">{moduleLabels[mod] || mod}</span>
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) =>
                                  setNotificationSettings((prev) => ({
                                    ...prev,
                                    perModule: { ...(prev.perModule || {}), [mod]: checked },
                                  }))
                                }
                              />
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto" onClick={handleSaveNotifications} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Module Operations<SettingInfo title="Module Operations" purpose="Per-module switches: deployment mode (integrated vs standalone), walk-in patient support and how each module posts to the central billing ledger." precaution="Switching a module between integrated and standalone changes data routing and may hide existing records from the regular workflow. Coordinate with affected departments." /></CardTitle>
                  <CardDescription>
                    Configure Pathology, Radiology, and Pharmacy for integrated or standalone workflows, including per-user external walk-in controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Deployment Mode</Label>
                    <Select
                      value={moduleOperationsSettings.deploymentMode || "hybrid"}
                      onValueChange={(value) =>
                        setModuleOperationsSettings((prev) => ({
                          ...prev,
                          deploymentMode: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select deployment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="integrated">Integrated with Hospital Core</SelectItem>
                        <SelectItem value="independent">Independent Module Deployment</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Both Modes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Global Module Controls</h3>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {moduleOperationKeys.map((moduleKey) => {
                        const moduleConfig = moduleOperationsSettings.modules?.[moduleKey] || createDefaultModuleOperationConfig();
                        return (
                          <div key={`global-${moduleKey}`} className="rounded-lg border p-4 space-y-2">
                            <p className="text-sm font-semibold">{moduleOperationLabels[moduleKey]}</p>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Module Enabled</span>
                              <Switch checked={!!moduleConfig.enabled} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "enabled", checked)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Standalone Mode</span>
                              <Switch checked={!!moduleConfig.runIndependently} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "runIndependently", checked)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Integrated Mode</span>
                              <Switch checked={!!moduleConfig.integrateWithHospitalCore} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "integrateWithHospitalCore", checked)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Allow External Walk-ins</span>
                              <Switch checked={!!moduleConfig.allowExternalWalkIns} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "allowExternalWalkIns", checked)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Enable External Billing</span>
                              <Switch checked={!!moduleConfig.externalBillingEnabled} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "externalBillingEnabled", checked)} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                              <span>Track External Billing Separately</span>
                              <Switch checked={!!moduleConfig.trackExternalBillingSeparately} onCheckedChange={(checked) => updateGlobalModuleOperation(moduleKey, "trackExternalBillingSeparately", checked)} />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Per User Override</h3>
                    <p className="text-xs text-muted-foreground">
                      Use this when a specific user should allow/deny external walk-ins differently from global module rules.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedModuleOverrideUserId} onValueChange={setSelectedModuleOverrideUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select user</SelectItem>
                            {moduleOverrideUsers.map((entry) => (
                              <SelectItem key={entry._id} value={entry._id}>
                                {`${entry.firstName || ""} ${entry.lastName || ""}`.trim() || entry.email} ({entry.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full sm:w-auto" variant="outline" onClick={handleRemoveUserOverride} disabled={selectedModuleOverrideUserId === "__none__"}>
                          Remove User Override
                        </Button>
                      </div>
                    </div>

                    {selectedModuleOverrideUserId !== "__none__" ? (
                      <div className="grid gap-3 lg:grid-cols-3">
                        {moduleOperationKeys.map((moduleKey) => {
                          const globalConfig = moduleOperationsSettings.modules?.[moduleKey] || createDefaultModuleOperationConfig();
                          const overrideConfig = selectedModuleOverride?.modules?.[moduleKey] || {};
                          const moduleConfig = { ...globalConfig, ...overrideConfig };
                          return (
                            <div key={`override-${moduleKey}`} className="rounded-lg border p-4 space-y-2">
                              <p className="text-sm font-semibold">{moduleOperationLabels[moduleKey]}</p>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Module Enabled</span>
                                <Switch checked={!!moduleConfig.enabled} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "enabled", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Standalone Mode</span>
                                <Switch checked={!!moduleConfig.runIndependently} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "runIndependently", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Integrated Mode</span>
                                <Switch checked={!!moduleConfig.integrateWithHospitalCore} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "integrateWithHospitalCore", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Allow External Walk-ins</span>
                                <Switch checked={!!moduleConfig.allowExternalWalkIns} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "allowExternalWalkIns", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Enable External Billing</span>
                                <Switch checked={!!moduleConfig.externalBillingEnabled} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "externalBillingEnabled", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Track External Billing Separately</span>
                                <Switch checked={!!moduleConfig.trackExternalBillingSeparately} onCheckedChange={(checked) => updateUserModuleOperation(moduleKey, "trackExternalBillingSeparately", checked)} />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                        Select a user to configure per-user module operation overrides.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button className="w-full sm:w-auto" onClick={handleSaveModuleOperations} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Module Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Data Management<SettingInfo title="Data Management" purpose="Bulk import (CSV) and export of patients, doctors, services, etc. Configure scheduled auto-exports for backup." precaution="Imports are append/overwrite — always download a template first and back up before a large import. Auto-exports may include PHI; store the destination securely." /></CardTitle>
                  <CardDescription>
                    Backup, export, and manage hospital data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isSuperAdmin ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                      Data Management (bulk import/export and scheduler) is restricted to Super Admin.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Bulk Import (Excel / Google Sheet)</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Upload CSV exported from Excel/Google Sheets, or paste tabular data directly.
                            </p>
                          </div>
                          <div className="w-full sm:w-52">
                            <Select value={selectedImportEntity} onValueChange={setSelectedImportEntity}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {dataEntityOptions.filter((item) => ["beds", "doctors", "nurses", "medicines", "tests"].includes(item.key)).map((item) => (
                                  <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleLoadImportTemplate(selectedImportEntity)}>
                            <Copy className="mr-2 h-4 w-4" />Load Template Headers
                          </Button>
                          <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            className="hidden"
                            onChange={handleImportFile}
                          />
                          <Button variant="outline" size="sm" onClick={() => importFileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />Upload CSV
                          </Button>
                          <Button size="sm" onClick={handleBulkImportSubmit} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Import {selectedImportEntity}
                          </Button>
                        </div>

                        {templateHeaders.length > 0 && (
                          <div className="rounded-md border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">Template headers</p>
                            <p className="text-xs mt-1 break-all">{templateHeaders.join(", ")}</p>
                          </div>
                        )}

                        <div>
                          <Label>Spreadsheet Data</Label>
                          <textarea
                            value={importText}
                            onChange={(e) => handleImportTextChange(e.target.value)}
                            className="mt-1 h-40 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            placeholder="Paste rows from Google Sheet / Excel (with header row)"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">Preview rows: {importRowsPreview.length}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 space-y-4">
                        <h3 className="font-medium flex items-center gap-2"><Download className="h-4 w-4" />Export Data</h3>
                        <p className="text-sm text-muted-foreground">Export master and operational datasets as CSV.</p>
                        <div className="flex flex-wrap gap-2">
                          <Select value={selectedExportEntity} onValueChange={setSelectedExportEntity}>
                            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {dataEntityOptions.map((item) => (
                                <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" onClick={() => handleExportEntity(selectedExportEntity)}>
                            <Download className="mr-2 h-4 w-4" />Export Selected
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {dataEntityOptions.map((item) => (
                            <Button key={item.key} variant="ghost" className="justify-start border" onClick={() => handleExportEntity(item.key)}>
                              <Download className="mr-2 h-4 w-4" />{item.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 space-y-4">
                        <h3 className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4" />Auto Export Scheduler</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className={settingsRowClass}>
                            <Label>Enable Scheduler</Label>
                            <Switch
                              checked={!!dataManagementSettings.autoExport.enabled}
                              onCheckedChange={(checked) =>
                                setDataManagementSettings((prev) => ({
                                  ...prev,
                                  autoExport: { ...prev.autoExport, enabled: checked },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Frequency</Label>
                            <Select
                              value={dataManagementSettings.autoExport.frequency}
                              onValueChange={(value) =>
                                setDataManagementSettings((prev) => ({
                                  ...prev,
                                  autoExport: { ...prev.autoExport, frequency: value },
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Run Time</Label>
                            <Input
                              type="time"
                              value={dataManagementSettings.autoExport.time}
                              onChange={(e) =>
                                setDataManagementSettings((prev) => ({
                                  ...prev,
                                  autoExport: { ...prev.autoExport, time: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Format</Label>
                            <Select
                              value={dataManagementSettings.autoExport.format}
                              onValueChange={(value) =>
                                setDataManagementSettings((prev) => ({
                                  ...prev,
                                  autoExport: { ...prev.autoExport, format: value },
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="csv">CSV</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Datasets</Label>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {dataEntityOptions.map((item) => (
                              <label key={`auto-${item.key}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                <span>{item.label}</span>
                                <Switch
                                  checked={dataManagementSettings.autoExport.entities.includes(item.key)}
                                  onCheckedChange={(checked) => toggleAutoExportEntity(item.key, checked)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Recipients (comma separated emails)</Label>
                          <Input
                            value={recipientsInput}
                            onChange={(e) => setRecipientsInput(e.target.value)}
                            placeholder="admin@hospital.com, audit@hospital.com"
                          />
                        </div>

                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                          <p><strong>Last Run:</strong> {dataManagementSettings.lastRunAt ? new Date(dataManagementSettings.lastRunAt).toLocaleString() : "Never"}</p>
                          <p><strong>Status:</strong> {dataManagementSettings.lastRunStatus || "N/A"}</p>
                          {dataManagementSettings.lastRunMessage ? <p><strong>Message:</strong> {dataManagementSettings.lastRunMessage}</p> : null}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button variant="outline" onClick={handleRunAutoExport} disabled={runningAutoExport}>
                            {runningAutoExport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Run Export Now
                          </Button>
                          <Button onClick={handleSaveDataManagement} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Scheduler
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        Only CSV/TXT parsing is supported directly. For Excel/Google Sheets, export/download as CSV, or paste sheet rows directly.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {canSeeVisualPermissionsTab && (
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Visual Access Permissions<SettingInfo title="Visual Access Permissions" purpose="Per-user, per-module overrides layered on top of the RBAC matrix. Grant or revoke view/create/edit/delete and handle access requests." precaution="These overrides cannot exceed what the Grandmaster has enabled for the organization. Removing access for the currently signed-in admin can lock you out." /></CardTitle>
                <CardDescription>
                  Manage module visibility, action restrictions, and permission workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Edit Mode</p>
                    <p className="mt-1 text-sm font-semibold">
                      {canEditVisualPermissions ? "Enabled" : "Read-only"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Delegated Managers</p>
                    <p className="mt-1 text-sm font-semibold">{permissionManagers.length}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Overrides</p>
                    <p className="mt-1 text-sm font-semibold">{permissionOverrides.length}</p>
                  </div>
                </div>

                <Tabs value={permissionSubtab} onValueChange={setPermissionSubtab} className="space-y-4">
                  <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-2">
                    <TabsTrigger value="matrix" className={settingsTabTriggerClass}>
                      <ShieldCheck className="h-4 w-4" />
                      Access Matrix
                    </TabsTrigger>
                    <TabsTrigger value="requests" className={settingsTabTriggerClass}>
                      <BellRing className="h-4 w-4" />
                      Requests & Notifications
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="matrix" className="space-y-4">
                    <div className="space-y-3 rounded-lg border p-4">
                      <Label className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Delegated Permission Managers
                      </Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="manager@hospital.com"
                          value={managerEmailInput}
                          disabled={!canEditDelegation}
                          onChange={(e) => setManagerEmailInput(e.target.value)}
                        />
                        <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={!canEditDelegation} onClick={handleAddPermissionManager}>
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {permissionManagers.length === 0 && (
                          <span className="text-sm text-muted-foreground">No delegated managers. Super Admin only.</span>
                        )}
                        {permissionManagers.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-2">
                            {email}
                            {canEditDelegation && (
                              <button type="button" onClick={() => handleRemovePermissionManager(email)} className="text-xs">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 rounded-lg border p-4">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Select User Email
                        </Label>
                        <Select
                          value={permissionEmail || "__none__"}
                          onValueChange={(value) => setPermissionEmail(value === "__none__" ? "" : value)}
                          disabled={!canEditVisualPermissions}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose user email" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select email</SelectItem>
                            {userEmails.map((email) => (
                              <SelectItem key={email} value={email}>{email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 rounded-lg border p-4">
                        <Label>Or Enter Email</Label>
                        <Input
                          placeholder="user@hospital.com"
                          value={permissionEmail}
                          disabled={!canEditVisualPermissions}
                          onChange={(e) => setPermissionEmail(e.target.value.trim().toLowerCase())}
                        />
                      </div>
                    </div>

                    {Array.isArray(enabledModules) && rbacModules.some((m) => !isModuleEnabled(m)) && (
                      <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <p className="font-semibold text-amber-700 dark:text-amber-400">
                            Platform-restricted modules
                          </p>
                        </div>
                        <p className="text-muted-foreground">
                          The following modules are disabled by the platform administrator (Grandmaster)
                          and cannot be granted to any user, including Super Admin. Permission controls
                          for these modules are intentionally hidden below.
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {rbacModules
                            .filter((m) => !isModuleEnabled(m))
                            .map((m) => (
                              <li key={`restricted-${m}`}>
                                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                  {moduleLabels[m] || m}
                                </Badge>
                              </li>
                            ))}
                        </ul>
                        <p className="text-muted-foreground">
                          Source:{" "}
                          <span className="font-medium text-foreground">
                            Grandmaster &rsaquo; Organizations &rsaquo; {user?.organization?.name || "Your Organization"} &rsaquo; Enabled Modules
                          </span>
                          . Contact your platform administrator to request access to additional modules.
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          placeholder="Search modules..."
                          value={permissionModuleSearch}
                          onChange={(e) => setPermissionModuleSearch(e.target.value)}
                        />
                      </div>
                      <Select value={permissionModuleFilter} onValueChange={setPermissionModuleFilter}>
                        <SelectTrigger>
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All modules</SelectItem>
                          {gmAllowedRbacModules.map((module) => (
                            <SelectItem key={module} value={module}>{moduleLabels[module] || module}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="justify-start">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Show / Hide Permission Modules</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {gmAllowedRbacModules.map((module) => (
                            <DropdownMenuCheckboxItem
                              key={`permission-view-${module}`}
                              checked={permissionVisibleModules.includes(module)}
                              onCheckedChange={(checked) => togglePermissionModuleVisibility(module, checked)}
                            >
                              {moduleLabels[module] || module}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {filteredPermissionModules.map((mod) => {
                        const Icon = moduleIconMap[mod.module] || Shield;
                        return (
                          <div key={mod.module} className="rounded-lg border p-4">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">{moduleLabels[mod.module] || mod.module}</span>
                              </div>
                              <Badge variant={mod.canView ? "default" : "secondary"}>
                                {mod.canView ? "Visible" : "Hidden"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>View</span>
                                <Switch checked={mod.canView} disabled={!canEditVisualPermissions || !permissionEmail} onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canView", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Create</span>
                                <Switch checked={mod.canCreate} disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView} onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canCreate", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Edit</span>
                                <Switch checked={mod.canEdit} disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView} onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canEdit", checked)} />
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                <span>Delete</span>
                                <Switch checked={mod.canDelete} disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView} onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canDelete", checked)} />
                              </label>
                            </div>
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">Advanced Restrictions</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(moduleFeatureCatalog[mod.module] || []).map((feature) => (
                                  <label key={`${mod.module}-${feature}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                                    <span>{featureLabels[feature] || feature}</span>
                                    <Switch
                                      checked={mod.restrictedFeatures.includes(feature)}
                                      disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView}
                                      onCheckedChange={(checked) => handleRestrictedFeatureToggle(mod.module, feature, checked)}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg border">
                      <div className="border-b p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Assignment Policies (Who Can Assign and Who Can Be Assigned)
                      </div>
                      <div className="space-y-3 p-3">
                        {Object.keys(assignmentTypeLabels).map((assignmentType) => (
                          <div key={assignmentType} className="rounded-md border p-3">
                            <div className="mb-3 text-sm font-medium">{assignmentTypeLabels[assignmentType]}</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs uppercase text-muted-foreground">Roles Who Can Assign</Label>
                                {assignmentRoleOptions.map((role) => (
                                  <div key={`${assignmentType}-assigner-${role}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                    <span>{role.replace(/_/g, " ")}</span>
                                    <Switch checked={(assignmentPolicies?.[assignmentType]?.assignerRoles || []).includes(role)} disabled={!canEditVisualPermissions} onCheckedChange={(checked) => toggleAssignmentPolicyRole(assignmentType, "assignerRoles", role, checked)} />
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase text-muted-foreground">Roles Who Can Be Assigned</Label>
                                {assignmentRoleOptions.map((role) => (
                                  <div key={`${assignmentType}-assignee-${role}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                    <span>{role.replace(/_/g, " ")}</span>
                                    <Switch checked={(assignmentPolicies?.[assignmentType]?.assigneeRoles || []).includes(role)} disabled={!canEditVisualPermissions} onCheckedChange={(checked) => toggleAssignmentPolicyRole(assignmentType, "assigneeRoles", role, checked)} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button className="w-full sm:w-auto" variant="outline" onClick={handleRemoveOverride} disabled={!canEditVisualPermissions || !permissionEmail}>
                        Remove Override
                      </Button>
                      <Button className="w-full sm:w-auto" onClick={handleSaveVisualPermissions} disabled={saving || !canEditVisualPermissions}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Permissions
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="requests" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-semibold">Create Permission Request</p>
                        </div>
                        <div className="grid gap-3">
                          <div>
                            <Label>Module</Label>
                            <Select value={requestForm.module} onValueChange={(value) => setRequestForm((prev) => ({ ...prev, module: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {gmAllowedRbacModules.map((module) => (
                                  <SelectItem key={module} value={module}>{moduleLabels[module] || module}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Feature</Label>
                            <Select value={requestForm.feature} onValueChange={(value) => setRequestForm((prev) => ({ ...prev, feature: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {permissionRequestFeatures.map((feature) => (
                                  <SelectItem key={feature} value={feature}>{featureLabels[feature] || feature}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Input placeholder="Why do you need this access?" value={requestForm.reason} onChange={(e) => setRequestForm((prev) => ({ ...prev, reason: e.target.value }))} />
                          </div>
                          <Button onClick={handleSubmitPermissionRequest} disabled={submittingRequest}>
                            {submittingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit Request
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Inbox className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-semibold">Pending Requests</p>
                          <Badge variant="secondary">{pendingAccessRequests.length}</Badge>
                        </div>
                        {user?.role !== "super_admin" && (
                          <p className="text-sm text-muted-foreground">Only Super Admin can approve/reject requests.</p>
                        )}
                        <div className="space-y-2">
                          {pendingAccessRequests.length === 0 && (
                            <p className="text-sm text-muted-foreground">No pending requests.</p>
                          )}
                          {pendingAccessRequests.map((req) => (
                            <div key={req._id} className="rounded-md border p-3">
                              <p className="text-sm font-medium">{req.requesterEmail}</p>
                              <p className="text-xs text-muted-foreground">Module: {req.module} | Feature: {req.feature}</p>
                              {req.reason && <p className="mt-1 text-xs text-muted-foreground">{req.reason}</p>}
                              {user?.role === "super_admin" && (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                  <Button className="w-full sm:w-auto" size="sm" variant="outline" disabled={requestActionLoadingId === req._id} onClick={() => handleRequestDecision(req._id, "approved")}>
                                    <Check className="mr-1 h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button className="w-full sm:w-auto" size="sm" variant="destructive" disabled={requestActionLoadingId === req._id} onClick={() => handleRequestDecision(req._id, "rejected")}>
                                    <X className="mr-1 h-3 w-3" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Permission Notifications</p>
                      </div>
                      <div className="space-y-2">
                        {permissionNotifications.length === 0 && (
                          <p className="text-sm text-muted-foreground">No permission notifications yet.</p>
                        )}
                        {permissionNotifications.map((n) => (
                          <div key={n._id} className="rounded-md border p-3">
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="sounds">
          <SoundSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="data-settings" className="space-y-6">
            <DOBAgeSetting />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Validation UI<SettingInfo title="Validation UI" purpose="Choose how form validation appears (inline messages vs toasts) and which non-critical fields are mandatory across forms." precaution="Making fields optional that downstream reports depend on (e.g. patient DOB for age-band statistics) may produce incomplete analytics." /></CardTitle>
                <CardDescription>
                  Control inline validation feedback globally, per form, and per field. Validation rules still run even when the UI is hidden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={settingsRowClass}>
                  <div className="space-y-1">
                    <p className="font-medium">Enable validation UI everywhere</p>
                    <p className="text-sm text-muted-foreground">
                      Turn all inline validation feedback on or off at once.
                    </p>
                  </div>
                  <Switch
                    checked={validationPreferencesDraft.enabled}
                    onCheckedChange={(enabled) =>
                      setValidationPreferencesDraft((prev) => ({
                        ...normalizeValidationPreferences(prev),
                        enabled,
                      }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-medium">Per form and per field</h3>
                    <p className="text-sm text-muted-foreground">
                      Disable validation UI form-by-form, then drill down to individual fields if needed.
                    </p>
                  </div>
                  <Accordion type="multiple" className="w-full rounded-lg border px-4">
                    {validationFormRegistry
                      .filter((formConfig) => !formConfig.module || isModuleEnabled(formConfig.module))
                      .map((formConfig) => {
                      const formState = validationPreferencesDraft.forms?.[formConfig.id];
                      return (
                        <AccordionItem key={formConfig.id} value={formConfig.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="text-left">
                              <p className="font-medium">{formConfig.label}</p>
                              <p className="text-xs text-muted-foreground">{formConfig.description}</p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="flex flex-col gap-3 rounded-md border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-medium">Show validation for this form</p>
                                <p className="text-xs text-muted-foreground">
                                  This is the one-by-one switch for the whole form.
                                </p>
                              </div>
                              <Switch
                                checked={formState?.enabled ?? true}
                                onCheckedChange={(enabled) => updateValidationFormState(formConfig.id, enabled)}
                                disabled={!validationPreferencesDraft.enabled}
                              />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {formConfig.fields.map((field) => (
                                <div key={`${formConfig.id}-${field.key}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                                  <div className="pr-3">
                                    <p className="text-sm font-medium">{field.label}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{field.key}</p>
                                  </div>
                                  <Switch
                                    checked={formState?.fields?.[field.key] ?? true}
                                    onCheckedChange={(enabled) => updateValidationFieldState(formConfig.id, field.key, enabled)}
                                    disabled={!validationPreferencesDraft.enabled || formState?.enabled === false}
                                  />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {validationPreferencesLoading ? "Loading current validation preferences..." : "Preferences are saved per user profile."}
                  </p>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      type="button"
                      variant="outline"
                      onClick={() => setValidationPreferencesDraft(normalizeValidationPreferences())}
                      disabled={savingValidationPreferences}
                    >
                      Reset
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      type="button"
                      onClick={handleSaveValidationPreferences}
                      disabled={savingValidationPreferences || validationPreferencesLoading}
                    >
                      {savingValidationPreferences ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Validation UI
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Approval Workflows
                  <SettingInfo title="Approval Workflows" purpose="Define gates between any two processes: choose module + action, pick an approver (email or role), attach a custom form and an SLA with escalation." precaution="Hard-blocking rules will stop the underlying action until approved. Always set an SLA and an escalation target to avoid stuck requests." />
                </CardTitle>
                <CardDescription>
                  Define dynamic approval gates between any two processes. Configure approvers, custom forms, and SLA escalation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="rules" className="space-y-4">
                  <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:w-auto sm:grid-cols-2">
                    <TabsTrigger value="rules" className={settingsTabTriggerClass}>Rules & Inbox</TabsTrigger>
                    <TabsTrigger value="diagnostics" className={settingsTabTriggerClass}>Diagnostics</TabsTrigger>
                  </TabsList>
                  <TabsContent value="rules">
                    <ApprovalsManager isAdmin={isAdmin} />
                  </TabsContent>
                  <TabsContent value="diagnostics">
                    <ApprovalsDiagnostics />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
