import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Bed,
  Calendar,
  Receipt,
  FileText,
  Ambulance,
  Plus,
  X,
  Pencil,
  Users,
  Stethoscope,
  FlaskConical,
  Pill,
  Hospital,
  Building2,
  Bell,
  Settings,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useVisualAuth } from "@/hooks/useVisualAuth";

const actions = [
  { key: "new_patient", label: "New Patient", icon: UserPlus, href: "/patients", module: "patients", variant: "default", requiresCreate: true },
  { key: "patients_list", label: "Patients", icon: Users, href: "/patients", module: "patients", variant: "outline" },
  { key: "assign_bed", label: "Assign Bed", icon: Bed, href: "/beds", module: "beds", variant: "outline", requiresCreate: true },
  { key: "bed_management", label: "Bed Management", icon: Bed, href: "/beds", module: "beds", variant: "outline" },
  { key: "admissions", label: "Admissions", icon: Hospital, href: "/admissions", module: "admissions", variant: "outline", requiresCreate: true },
  { key: "book_appointment", label: "Book Appointment", icon: Calendar, href: "/appointments", module: "appointments", variant: "outline", requiresCreate: true },
  { key: "appointments_list", label: "Appointments", icon: Calendar, href: "/appointments", module: "appointments", variant: "outline" },
  { key: "opd", label: "OPD Dashboard", icon: Users, href: "/opd", module: "patients", variant: "outline" },
  { key: "doctors", label: "Doctors", icon: Stethoscope, href: "/doctors", module: "doctors", variant: "outline" },
  { key: "nurses", label: "Nurses", icon: Users, href: "/nurses", module: "nurses", variant: "outline" },
  { key: "lab", label: "Pathology Lab", icon: FlaskConical, href: "/lab", module: "lab", variant: "outline" },
  { key: "pharmacy", label: "Pharmacy", icon: Pill, href: "/pharmacy", module: "pharmacy", variant: "outline" },
  { key: "create_invoice", label: "Create Invoice", icon: Receipt, href: "/billing", module: "billing", variant: "outline", requiresCreate: true },
  { key: "billing", label: "Billing", icon: Receipt, href: "/billing", module: "billing", variant: "outline" },
  { key: "generate_report", label: "Generate Report", icon: FileText, href: "/reports", module: "reports", variant: "outline" },
  { key: "facilities", label: "Facilities", icon: Building2, href: "/facilities", module: "facilities", variant: "outline" },
  { key: "tasks", label: "Tasks", icon: ClipboardList, href: "/tasks", module: "tasks", variant: "outline" },
  { key: "notifications", label: "Notifications", icon: Bell, href: "/notifications", module: "notifications", variant: "outline" },
  { key: "settings", label: "Settings", icon: Settings, href: "/settings", module: "settings", variant: "outline" },
  { key: "emergency", label: "Emergency", icon: Ambulance, href: "/beds", module: "admissions", variant: "destructive" },
];

const storageKey = "dashboard_quick_actions_v2";
const defaultActionKeys = [
  "new_patient",
  "book_appointment",
  "admissions",
  "lab",
  "pharmacy",
  "create_invoice",
  "emergency"
];

export function QuickActions() {
  const { canView, canCreate } = useVisualAuth();
  const [isManaging, setIsManaging] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored) && stored.length > 0) return stored;
    } catch {}
    return defaultActionKeys;
  });
  const [addActionKey, setAddActionKey] = useState("");

  const allowedActions = useMemo(
    () =>
      actions.filter((action) => {
        if (!canView(action.module)) return false;
        if (action.requiresCreate && !canCreate(action.module)) return false;
        return true;
      }),
    [canView, canCreate]
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const visibleActions = useMemo(() => {
    const selectedSet = new Set(selectedKeys);
    const selectedVisible = allowedActions.filter((action) => selectedSet.has(action.key));
    if (selectedVisible.length > 0) return selectedVisible;

    const defaults = defaultActionKeys.filter((key) =>
      allowedActions.some((action) => action.key === key)
    );
    const fallbackSet = new Set(defaults.length > 0 ? defaults : allowedActions.map((action) => action.key));
    return allowedActions.filter((action) => fallbackSet.has(action.key));
  }, [allowedActions, selectedKeys]);

  const addableActions = useMemo(() => {
    const selectedSet = new Set(selectedKeys);
    return allowedActions.filter((action) => !selectedSet.has(action.key));
  }, [allowedActions, selectedKeys]);

  const removeAction = (key) => {
    setSelectedKeys((prev) => prev.filter((item) => item !== key));
  };

  const addAction = () => {
    if (!addActionKey) return;
    setSelectedKeys((prev) => (prev.includes(addActionKey) ? prev : [...prev, addActionKey]));
    setAddActionKey("");
  };

  const addAllAllowedActions = () => {
    setSelectedKeys(allowedActions.map((action) => action.key));
    setAddActionKey("");
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Common tasks at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsManaging((prev) => !prev)}>
          <Pencil className="mr-2 h-3 w-3" />
          {isManaging ? "Done" : "Manage"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map((action) => (
          <div key={action.key} className="relative">
            {isManaging && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute -right-2 -top-2 z-10 h-6 w-6 rounded-full"
                onClick={() => removeAction(action.key)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant={action.variant}
              className="h-auto w-full flex-col gap-2 py-4"
              asChild
            >
              <Link to={action.href}>
                <action.icon className="h-5 w-5" />
                <span className="text-center text-xs text-wrap">{action.label}</span>
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {isManaging && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Select value={addActionKey} onValueChange={setAddActionKey}>
            <SelectTrigger className="sm:flex-1 min-w-[220px]">
              <SelectValue placeholder="Select action to add" />
            </SelectTrigger>
            <SelectContent>
              {addableActions.length === 0 && <SelectItem value="none" disabled>No more actions</SelectItem>}
              {addableActions.map((action) => (
                <SelectItem key={action.key} value={action.key}>{action.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addAction} disabled={!addActionKey || addActionKey === "none"}>
            <Plus className="mr-2 h-4 w-4" />
            Add Action
          </Button>
          <Button variant="outline" onClick={addAllAllowedActions} disabled={addableActions.length === 0}>
            Add All
          </Button>
        </div>
      )}
      {isManaging && addableActions.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          All allowed actions are already added for your role.
        </p>
      )}
    </div>
  );
}
