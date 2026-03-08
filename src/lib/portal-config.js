import {
  FlaskConical, Pill, ScanLine, Users, Receipt, BarChart3,
  Bell, Settings, LayoutDashboard, ClipboardList,
} from "lucide-react";

export const portalDefinitions = {
  lab: {
    key: "lab",
    label: "Pathology Lab",
    tagline: "Diagnostic Center Management",
    icon: FlaskConical,
    color: "from-emerald-500 to-teal-600",
    basePath: "/lab-portal",
    loginPath: "/lab-portal/login",
    navItems: [
      { title: "Dashboard", url: "", icon: LayoutDashboard, module: "lab" },
      { title: "Lab Tests", url: "/tests", icon: FlaskConical, module: "lab" },
      { title: "Patients", url: "/patients", icon: Users, module: "patients" },
      { title: "Billing", url: "/billing", icon: Receipt, module: "billing" },
      { title: "Reports", url: "/reports", icon: BarChart3, module: "reports" },
      { title: "Notifications", url: "/notifications", icon: Bell, module: "notifications" },
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
  pharmacy: {
    key: "pharmacy",
    label: "Pharmacy",
    tagline: "Pharmacy Management System",
    icon: Pill,
    color: "from-blue-500 to-indigo-600",
    basePath: "/pharmacy-portal",
    loginPath: "/pharmacy-portal/login",
    navItems: [
      { title: "Dashboard", url: "", icon: LayoutDashboard, module: "pharmacy" },
      { title: "Medicines", url: "/medicines", icon: Pill, module: "pharmacy" },
      { title: "Prescriptions", url: "/prescriptions", icon: ClipboardList, module: "pharmacy" },
      { title: "Patients", url: "/patients", icon: Users, module: "patients" },
      { title: "Billing", url: "/billing", icon: Receipt, module: "billing" },
      { title: "Reports", url: "/reports", icon: BarChart3, module: "reports" },
      { title: "Notifications", url: "/notifications", icon: Bell, module: "notifications" },
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
  radiology: {
    key: "radiology",
    label: "Radiology",
    tagline: "Imaging Center Management",
    icon: ScanLine,
    color: "from-purple-500 to-violet-600",
    basePath: "/radiology-portal",
    loginPath: "/radiology-portal/login",
    navItems: [
      { title: "Dashboard", url: "", icon: LayoutDashboard, module: "radiology" },
      { title: "Orders", url: "/orders", icon: ScanLine, module: "radiology" },
      { title: "Patients", url: "/patients", icon: Users, module: "patients" },
      { title: "Billing", url: "/billing", icon: Receipt, module: "billing" },
      { title: "Reports", url: "/reports", icon: BarChart3, module: "reports" },
      { title: "Notifications", url: "/notifications", icon: Bell, module: "notifications" },
      { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
    ],
  },
};

export const getPortalConfig = (portalKey) => portalDefinitions[portalKey] || null;
