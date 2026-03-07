import { Link } from "react-router-dom";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Bed, Hospital, Users, Stethoscope,
  Calendar, ClipboardList, Scissors, FlaskConical, ScanLine,
  Pill, Building2, Receipt, BarChart3, Bell, Settings,
} from "lucide-react";

const allModules = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard", color: "from-blue-500 to-blue-600", iconBg: "bg-blue-500", desc: "Overview & KPIs" },
  { title: "Bed Management", url: "/beds", icon: Bed, module: "beds", color: "from-teal-500 to-teal-600", iconBg: "bg-teal-500", desc: "Manage beds & wards" },
  { title: "Admissions", url: "/admissions", icon: Hospital, module: "admissions", color: "from-indigo-500 to-indigo-600", iconBg: "bg-indigo-500", desc: "Patient admissions" },
  { title: "Patients", url: "/patients", icon: Users, module: "patients", color: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-500", desc: "Patient records" },
  { title: "Doctors", url: "/doctors", icon: Stethoscope, module: "doctors", color: "from-violet-500 to-violet-600", iconBg: "bg-violet-500", desc: "Doctor directory" },
  { title: "Nurses", url: "/nurses", icon: Users, module: "nurses", color: "from-pink-500 to-pink-600", iconBg: "bg-pink-500", desc: "Nurse management" },
  { title: "Appointments", url: "/appointments", icon: Calendar, module: "appointments", color: "from-amber-500 to-amber-600", iconBg: "bg-amber-500", desc: "Schedule & manage" },
  { title: "Tasks", url: "/tasks", icon: ClipboardList, module: "tasks", color: "from-orange-500 to-orange-600", iconBg: "bg-orange-500", desc: "Task assignments" },
  { title: "Nurse Dashboard", url: "/nurse", icon: Users, module: "nurses", color: "from-rose-500 to-rose-600", iconBg: "bg-rose-500", desc: "Nurse workspace" },
  { title: "OPD Management", url: "/opd", icon: Users, module: "patients", color: "from-cyan-500 to-cyan-600", iconBg: "bg-cyan-500", desc: "Outpatient dept" },
  { title: "Operating Theatre", url: "/ot", icon: Scissors, module: "ot", color: "from-red-500 to-red-600", iconBg: "bg-red-500", desc: "Surgeries & OT rooms" },
  { title: "Pathology Lab", url: "/lab", icon: FlaskConical, module: "lab", color: "from-lime-500 to-lime-600", iconBg: "bg-lime-500", desc: "Lab tests & reports" },
  { title: "Radiology", url: "/radiology", icon: ScanLine, module: "radiology", color: "from-sky-500 to-sky-600", iconBg: "bg-sky-500", desc: "Imaging & scans" },
  { title: "Pharmacy", url: "/pharmacy", icon: Pill, module: "pharmacy", color: "from-green-500 to-green-600", iconBg: "bg-green-500", desc: "Medicines & stock" },
  { title: "Facilities", url: "/facilities", icon: Building2, module: "facilities", color: "from-slate-500 to-slate-600", iconBg: "bg-slate-500", desc: "Facility management" },
  { title: "Billing", url: "/billing", icon: Receipt, module: "billing", color: "from-yellow-500 to-yellow-600", iconBg: "bg-yellow-500", desc: "Invoices & payments" },
  { title: "Reports", url: "/reports", icon: BarChart3, module: "reports", color: "from-purple-500 to-purple-600", iconBg: "bg-purple-500", desc: "Analytics & reports" },
  { title: "Notifications", url: "/notifications", icon: Bell, module: "notifications", color: "from-fuchsia-500 to-fuchsia-600", iconBg: "bg-fuchsia-500", desc: "Alerts & messages" },
  { title: "Settings", url: "/settings", icon: Settings, module: "settings", color: "from-gray-500 to-gray-600", iconBg: "bg-gray-500", desc: "System settings" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function WidgetHome() {
  const { canView } = useVisualAuth();
  const visible = allModules.filter((m) => canView(m.module));

  return (
    <div className="py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
        <p className="text-sm text-muted-foreground">Select a module to get started</p>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {visible.map((mod) => (
          <motion.div key={mod.url + mod.title} variants={item}>
            <Link
              to={mod.url}
              className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color} shadow-md transition-transform duration-200 group-hover:scale-110`}>
                <mod.icon className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground leading-tight">{mod.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{mod.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
