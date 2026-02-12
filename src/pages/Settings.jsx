import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllSettings,
  updateHospitalSettings,
  updateSecuritySettings,
  updateNotificationSettings,
  getUserStats,
  getVisualAccessSettings,
  updateVisualAccessSettings,
} from "@/lib/settings";
import { updateProfile } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { setUser as setStoredUser } from "@/lib/api-client";
import UserDialog from "@/components/dashboard/UserDialog";
import { getUsers } from "@/lib/users";
import { moduleLabels, rbacModules } from "@/lib/rbac";
import { useVisualAuth } from "@/hooks/useVisualAuth";

export default function Settings() {
  const { user, logout } = useAuth();
  const { canManageVisualPermissions } = useVisualAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isAdmin = user?.role === "super_admin" || user?.role === "hospital_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  // Profile state
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    avatar: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  
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
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [permissionEmail, setPermissionEmail] = useState("");
  const [permissionManagers, setPermissionManagers] = useState([]);
  const [managerEmailInput, setManagerEmailInput] = useState("");

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
        
        const [settingsRes, statsRes, visualAccessRes, usersRes] = await Promise.all([
          adminUser ? getAllSettings() : Promise.resolve(null),
          adminUser ? getUserStats() : Promise.resolve(null),
          getVisualAccessSettings(),
          (adminUser || canManageVisualPermissions) ? getUsers() : Promise.resolve(null),
        ]);

        if (settingsRes?.success && settingsRes?.data) {
          const { hospital, security, notifications } = settingsRes.data;
          
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
        }

        if (statsRes?.success && statsRes?.data) {
          setUserStats(statsRes.data);
        }

        if (visualAccessRes?.success && visualAccessRes?.data) {
          setPermissionOverrides(visualAccessRes.data.overrides || []);
          setPermissionManagers(visualAccessRes.data.permissionManagers || []);
          if (!permissionEmail && visualAccessRes.data.overrides?.length) {
            setPermissionEmail(visualAccessRes.data.overrides[0].email);
          }
        }

        if (usersRes?.success && usersRes?.data?.users) {
          const emails = usersRes.data.users
            .map((u) => u.email)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setUserEmails(emails);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, isAdmin, canManageVisualPermissions]);

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

  const selectedPermissionOverride = useMemo(
    () => permissionOverrides.find((item) => item.email === permissionEmail) || null,
    [permissionOverrides, permissionEmail]
  );

  const selectedPermissionModules = useMemo(() => {
    const byModule = new Map((selectedPermissionOverride?.modules || []).map((item) => [item.module, item]));
    return rbacModules.map((module) => {
      const entry = byModule.get(module);
      return {
        module,
        canView: !!entry?.canView,
        canCreate: !!entry?.canCreate,
        canEdit: !!entry?.canEdit,
        canDelete: !!entry?.canDelete,
      };
    });
  }, [selectedPermissionOverride]);

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

  const handleSaveVisualPermissions = async () => {
    try {
      setSaving(true);
      const payload = {
        permissionManagers: user?.role === "super_admin" ? permissionManagers : undefined,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleDisplayNames = {
    superAdmin: "Super Admin",
    hospitalAdmin: "Hospital Admin",
    doctor: "Doctor",
    nurse: "Nurse",
    receptionist: "Receptionist",
    billingStaff: "Billing Staff",
  };

  const userInitials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";
  const canSeeVisualPermissionsTab = true;
  const canEditVisualPermissions = user?.role === "super_admin" || canManageVisualPermissions;
  const canEditDelegation = user?.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage hospital system configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-7">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" />
                Data
              </TabsTrigger>
            </>
          )}
          {canSeeVisualPermissionsTab && (
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
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
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Theme Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize how the dashboard looks
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                      theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <Sun className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium">Light</span>
                    {theme === 'light' && (
                      <span className="text-xs text-primary">Active</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                      theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                      <Moon className="h-5 w-5 text-slate-200" />
                    </div>
                    <span className="text-sm font-medium">Dark</span>
                    {theme === 'dark' && (
                      <span className="text-xs text-primary">Active</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                      theme === 'system' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-slate-800">
                      <Monitor className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">System</span>
                    {theme === 'system' && (
                      <span className="text-xs text-primary">
                        Active ({resolvedTheme})
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
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
                  <CardTitle>Hospital Information</CardTitle>
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
                        onChange={(e) =>
                          setHospitalSettings((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                      />
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
                    <Button onClick={handleSaveHospital} disabled={saving}>
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
                  <CardTitle>User Management</CardTitle>
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
                          className="flex items-center justify-between rounded-lg border p-4"
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

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Add Role</Button>
                    <Button onClick={() => setIsUserDialogOpen(true)}>Add User</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User dialog */}
            <UserDialog isOpen={isUserDialogOpen} onClose={() => setIsUserDialogOpen(false)} />

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Configure authentication and security options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all admin accounts
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          twoFactorEnabled: checked,
                        }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
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
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
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
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button
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
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
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

                  <div className="flex items-center justify-between">
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

                  <div className="flex items-center justify-between">
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

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotifications} disabled={saving}>
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

            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                    Backup, export, and manage hospital data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium">Automatic Backups</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Last backup: January 15, 2026 at 02:00 AM
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Backup Now
                      </Button>
                      <Button variant="outline" size="sm">
                        Configure Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium">Export Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Export hospital data in various formats
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Export CSV
                      </Button>
                      <Button variant="outline" size="sm">
                        Export Excel
                      </Button>
                      <Button variant="outline" size="sm">
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                    <h3 className="font-medium text-destructive">Danger Zone</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Irreversible actions - proceed with caution
                    </p>
                    <div className="mt-4">
                      <Button variant="destructive" size="sm">
                        Clear All Logs
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {canSeeVisualPermissionsTab && (
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Visual Access Permissions</CardTitle>
                <CardDescription>
                  Role permissions are still enforced. These overrides only adjust visible modules/actions for selected emails.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border p-3 text-sm">
                  <p>
                    Edit mode:{" "}
                    <span className="font-semibold">
                      {canEditVisualPermissions ? "Enabled" : "Read-only"}
                    </span>
                  </p>
                  {!canEditVisualPermissions && (
                    <p className="mt-1 text-muted-foreground">
                      Only Super Admin or delegated permission managers can update this section.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Delegated Permission Managers (by email)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="manager@hospital.com"
                      value={managerEmailInput}
                      disabled={!canEditDelegation}
                      onChange={(e) => setManagerEmailInput(e.target.value)}
                    />
                    <Button type="button" variant="outline" disabled={!canEditDelegation} onClick={handleAddPermissionManager}>
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
                            x
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Select User Email</Label>
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
                  <div className="space-y-2">
                    <Label>Or Enter Email</Label>
                    <Input
                      placeholder="user@hospital.com"
                      value={permissionEmail}
                      disabled={!canEditVisualPermissions}
                      onChange={(e) => setPermissionEmail(e.target.value.trim().toLowerCase())}
                    />
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="grid grid-cols-5 gap-2 border-b p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Module</span>
                    <span>View</span>
                    <span>Create</span>
                    <span>Edit</span>
                    <span>Delete</span>
                  </div>
                  <div className="space-y-1 p-2">
                    {selectedPermissionModules.map((mod) => (
                      <div key={mod.module} className="grid grid-cols-5 items-center gap-2 rounded-md p-2 hover:bg-muted/40">
                        <span className="text-sm font-medium">{moduleLabels[mod.module] || mod.module}</span>
                        <Switch
                          checked={mod.canView}
                          disabled={!canEditVisualPermissions || !permissionEmail}
                          onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canView", checked)}
                        />
                        <Switch
                          checked={mod.canCreate}
                          disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView}
                          onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canCreate", checked)}
                        />
                        <Switch
                          checked={mod.canEdit}
                          disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView}
                          onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canEdit", checked)}
                        />
                        <Switch
                          checked={mod.canDelete}
                          disabled={!canEditVisualPermissions || !permissionEmail || !mod.canView}
                          onCheckedChange={(checked) => handlePermissionToggle(mod.module, "canDelete", checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleRemoveOverride} disabled={!canEditVisualPermissions || !permissionEmail}>
                    Remove Override
                  </Button>
                  <Button onClick={handleSaveVisualPermissions} disabled={saving || !permissionEmail || !canEditVisualPermissions}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Permissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
