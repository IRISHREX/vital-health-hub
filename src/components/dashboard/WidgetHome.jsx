import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { useLayoutMode } from "@/lib/LayoutModeContext";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboard } from "@/lib/dashboard";
import { getLabStats } from "@/lib/labTests";
import { getRadiologyStats } from "@/lib/radiology";
import { getPharmacyStats } from "@/lib/pharmacy";
import { getDoctors } from "@/lib/doctors";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Bed, Hospital, Users, Stethoscope,
  Calendar, ClipboardList, Scissors, FlaskConical, ScanLine,
  Pill, Building2, Receipt, BarChart3, Bell, Settings,
} from "lucide-react";

const allModules = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard", color: "from-blue-500 to-blue-600", desc: "Overview & KPIs", statKey: "dashboard" },
  { title: "Bed Management", url: "/beds", icon: Bed, module: "beds", color: "from-teal-500 to-teal-600", desc: "Manage beds & wards", statKey: "beds" },
  { title: "Admissions", url: "/admissions", icon: Hospital, module: "admissions", color: "from-indigo-500 to-indigo-600", desc: "Patient admissions", statKey: "admissions" },
  { title: "Patients", url: "/patients", icon: Users, module: "patients", color: "from-emerald-500 to-emerald-600", desc: "Patient records", statKey: "patients" },
  { title: "Doctors", url: "/doctors", icon: Stethoscope, module: "doctors", color: "from-violet-500 to-violet-600", desc: "Doctor directory", statKey: "doctors" },
  { title: "Nurses", url: "/nurses", icon: Users, module: "nurses", color: "from-pink-500 to-pink-600", desc: "Nurse management", statKey: "nurses" },
  { title: "Appointments", url: "/appointments", icon: Calendar, module: "appointments", color: "from-amber-500 to-amber-600", desc: "Schedule & manage", statKey: "appointments" },
  { title: "Tasks", url: "/tasks", icon: ClipboardList, module: "tasks", color: "from-orange-500 to-orange-600", desc: "Task assignments", statKey: "tasks" },
  { title: "Nurse Dashboard", url: "/nurse", icon: Users, module: "nurses", color: "from-rose-500 to-rose-600", desc: "Nurse workspace", statKey: null },
  { title: "OPD Management", url: "/opd", icon: Users, module: "patients", color: "from-cyan-500 to-cyan-600", desc: "Outpatient dept", statKey: null },
  { title: "Operating Theatre", url: "/ot", icon: Scissors, module: "ot", color: "from-red-500 to-red-600", desc: "Surgeries & OT rooms", statKey: "ot" },
  { title: "Pathology Lab", url: "/lab", icon: FlaskConical, module: "lab", color: "from-lime-500 to-lime-600", desc: "Lab tests & reports", statKey: "lab" },
  { title: "Radiology", url: "/radiology", icon: ScanLine, module: "radiology", color: "from-sky-500 to-sky-600", desc: "Imaging & scans", statKey: "radiology" },
  { title: "Pharmacy", url: "/pharmacy", icon: Pill, module: "pharmacy", color: "from-green-500 to-green-600", desc: "Medicines & stock", statKey: "pharmacy" },
  { title: "Facilities", url: "/facilities", icon: Building2, module: "facilities", color: "from-slate-500 to-slate-600", desc: "Facility management", statKey: null },
  { title: "Billing", url: "/billing", icon: Receipt, module: "billing", color: "from-yellow-500 to-yellow-600", desc: "Invoices & payments", statKey: "billing" },
  { title: "Reports", url: "/reports", icon: BarChart3, module: "reports", color: "from-purple-500 to-purple-600", desc: "Analytics & reports", statKey: null },
  { title: "Notifications", url: "/notifications", icon: Bell, module: "notifications", color: "from-fuchsia-500 to-fuchsia-600", desc: "Alerts & messages", statKey: "notifications" },
  { title: "Settings", url: "/settings", icon: Settings, module: "settings", color: "from-gray-500 to-gray-600", desc: "System settings", statKey: null },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function WidgetHome({ isOverlay = false }) {
  const { canView } = useVisualAuth();
  const { setWidgetOverlayOpen } = useLayoutMode();
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({});

  // Fetch quick stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.allSettled([
          getDashboard("admin"),
          getLabStats(),
          getRadiologyStats(),
          getPharmacyStats(),
          getDoctors(),
        ]);

        const dashData = results[0].status === "fulfilled" ? results[0].value?.data?.stats || {} : {};
        const labData = results[1].status === "fulfilled" ? results[1].value?.data || {} : {};
        const radData = results[2].status === "fulfilled" ? results[2].value?.data || {} : {};
        const pharmaData = results[3].status === "fulfilled" ? results[3].value?.data || {} : {};
        const doctorsArr = results[4].status === "fulfilled" ? results[4].value?.data?.doctors || [] : [];

        setStats({
          beds: { label: "Beds", value: dashData.totalBeds || 0, sub: `${dashData.availableBeds || 0} free` },
          patients: { label: "Patients", value: dashData.totalPatients || 0 },
          admissions: { label: "Admitted", value: dashData.admittedPatients || 0 },
          doctors: { label: "Doctors", value: doctorsArr.length, sub: `${doctorsArr.filter(d => d?.availabilityStatus === "available").length} on duty` },
          nurses: { label: "Nurses", value: dashData.nursesTotal || "-" },
          appointments: { label: "Today", value: dashData.todayAppointments || 0 },
          billing: { label: "Pending", value: dashData.pendingBills || 0 },
          lab: { label: "Tests", value: labData.total || 0, sub: `${labData.today || 0} today` },
          radiology: { label: "Scans", value: radData.total || 0, sub: `${radData.today || 0} today` },
          pharmacy: { label: "Rx Active", value: pharmaData.activePrescriptions || 0 },
          ot: { label: "Surgeries", value: "-" },
          dashboard: { label: "Modules", value: "19" },
          tasks: { label: "Tasks", value: "-" },
          notifications: { label: "Alerts", value: "-" },
        });
      } catch {
        // stats fetch failed, show without stats
      }
    };
    fetchStats();
  }, []);

  const visible = useMemo(() => {
    const filtered = allModules.filter((m) => canView(m.module));
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (m) => m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.module.toLowerCase().includes(q)
    );
  }, [canView, search]);

  const handleCardClick = () => {
    if (isOverlay) setWidgetOverlayOpen(false);
  };

  return (
    <div className="py-2">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isOverlay ? "Navigate To" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground">Select a module to get started</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No modules found for "{search}"</p>
        </div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {visible.map((mod) => {
          const stat = mod.statKey ? stats[mod.statKey] : null;
          return (
            <motion.div key={mod.url + mod.title} variants={item}>
              <Link
                to={mod.url}
                onClick={handleCardClick}
                className="group relative flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              >
                {/* Stat badge */}
                {stat && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 font-bold shadow-sm"
                  >
                    {stat.value}
                  </Badge>
                )}

                <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color} shadow-md transition-transform duration-200 group-hover:scale-110`}>
                  <mod.icon className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground leading-tight">{mod.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{mod.desc}</p>
                  {stat?.sub && (
                    <p className="mt-0.5 text-[10px] font-medium text-primary">{stat.sub}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
