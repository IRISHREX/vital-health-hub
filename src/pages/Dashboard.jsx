import {
  Bed,
  Users,
  Stethoscope,
  Receipt,
  Calendar,
  FlaskConical,
  ScanLine,
  Pill,
  UserCog,
  GripVertical,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { Fragment, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { getDashboard } from "@/lib/dashboard";
import { getLabStats } from "@/lib/labTests";
import { getRadiologyStats } from "@/lib/radiology";
import { getPharmacyStats } from "@/lib/pharmacy";
import { getDoctors } from "@/lib/doctors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { BedOccupancyChart } from "@/components/dashboard/BedOccupancyChart";
import { AdmissionChart } from "@/components/dashboard/AdmissionChart";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { QuickActions } from "@/components/dashboard/QuickActions";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ADMIN_ROLES = ["super_admin", "hospital_admin"];
const chartColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const SIZE_STEPS = [3, 4, 6, 8, 12];

const SPAN_CLASS = {
  3: "xl:col-span-3 md:col-span-2 col-span-1",
  4: "xl:col-span-4 md:col-span-3 col-span-1",
  6: "xl:col-span-6 md:col-span-3 col-span-1",
  8: "xl:col-span-8 md:col-span-6 col-span-1",
  12: "xl:col-span-12 md:col-span-6 col-span-1",
};
const HEIGHT_CLASS = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
};

const DEFAULT_WIDGETS = [
  { id: "view:admin", title: "Admin View", defaultW: 3, defaultH: 1 },
  { id: "view:doctor", title: "Doctor View", defaultW: 3, defaultH: 1 },
  { id: "view:nurse", title: "Nurse View", defaultW: 3, defaultH: 1 },
  { id: "totalBeds", title: "Total Beds", defaultW: 3, defaultH: 1 },
  { id: "admittedPatients", title: "Admitted Patients", defaultW: 3, defaultH: 1 },
  { id: "availableDoctors", title: "Available Doctors", defaultW: 3, defaultH: 1 },
  { id: "pendingBills", title: "Pending Bills", defaultW: 3, defaultH: 1 },
  { id: "todayAppointments", title: "Today's Appointments", defaultW: 3, defaultH: 1 },
  { id: "pathologyToday", title: "Pathology Today", defaultW: 3, defaultH: 1 },
  { id: "radiologyToday", title: "Radiology Today", defaultW: 3, defaultH: 1 },
  { id: "activePrescriptions", title: "Active Prescriptions", defaultW: 3, defaultH: 1 },
  { id: "nursesAvailable", title: "Nurses Available", defaultW: 3, defaultH: 1 },
  { id: "recentPatients", title: "Recent Patients", defaultW: 8, defaultH: 3 },
  { id: "quickActions", title: "Quick Actions", defaultW: 4, defaultH: 3 },
  { id: "bedOccupancy", title: "Bed Occupancy by Type", defaultW: 6, defaultH: 3 },
  { id: "weeklyAdmissions", title: "Weekly Admissions & Discharges", defaultW: 6, defaultH: 3 },
  { id: "moduleVolume", title: "Module Volume", defaultW: 8, defaultH: 3 },
  { id: "moduleRevenue", title: "Module Revenue", defaultW: 4, defaultH: 3 },
  { id: "workforce", title: "Workforce", defaultW: 4, defaultH: 3 },
  { id: "nurseWorkload", title: "Nurse Workload", defaultW: 4, defaultH: 3 },
  { id: "doctorWidget", title: "Doctor Widget", defaultW: 4, defaultH: 3 },
  { id: "alerts", title: "Revenue & Alerts", defaultW: 12, defaultH: 2 },
];

const DEFAULT_ORDER = DEFAULT_WIDGETS.map((w) => w.id);
const DEFAULT_META = Object.fromEntries(DEFAULT_WIDGETS.map((w) => [w.id, { w: w.defaultW, h: w.defaultH }]));

const moveItem = (list, fromId, toId) => {
  const fromIndex = list.indexOf(fromId);
  const toIndex = list.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;
  const clone = [...list];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone;
};

const storageKey = (userId) => `dashboard_layout_dense_v3_${userId || "anonymous"}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canView } = useVisualAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const [stats, setStats] = useState({
    totalPatients: 0,
    totalBeds: 0,
    availableBeds: 0,
    admittedPatients: 0,
    availableDoctors: 0,
    pendingBills: 0,
    todayAppointments: 0,
    todayDischarges: 0,
    bedUtilizationRate: 0,
    pendingRevenue: 0,
  });
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labStats, setLabStats] = useState({});
  const [radiologyStats, setRadiologyStats] = useState({});
  const [pharmacyStats, setPharmacyStats] = useState({});
  const [teamStats, setTeamStats] = useState({
    doctorsTotal: 0,
    doctorsAvailable: 0,
    nursesTotal: 0,
    nursesAvailable: 0,
    nursesUnavailable: 0,
    nurseAssignedPatients: 0,
    nurseTodaysAppointments: 0,
    nurseRecentVitals: 0,
  });

  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_ORDER);
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState([]);
  const [widgetMeta, setWidgetMeta] = useState(DEFAULT_META);
  const [draggingWidgetId, setDraggingWidgetId] = useState("");

  useEffect(() => {
    if (!user?._id) return;
    try {
      const raw = localStorage.getItem(storageKey(user._id));
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed?.order)) {
        const clean = parsed.order.filter((id) => DEFAULT_ORDER.includes(id));
        const missing = DEFAULT_ORDER.filter((id) => !clean.includes(id));
        setWidgetOrder([...clean, ...missing]);
      }
      if (Array.isArray(parsed?.hidden)) {
        setHiddenWidgetIds(parsed.hidden.filter((id) => DEFAULT_ORDER.includes(id)));
      }
      if (parsed?.meta && typeof parsed.meta === "object") {
        setWidgetMeta((prev) => ({ ...prev, ...parsed.meta }));
      }
    } catch {
      // ignore persisted layout parse errors
    }
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    localStorage.setItem(
      storageKey(user._id),
      JSON.stringify({ order: widgetOrder, hidden: hiddenWidgetIds, meta: widgetMeta })
    );
  }, [widgetOrder, hiddenWidgetIds, widgetMeta, user?._id]);

  const getViewRoute = (key) => {
    if (key === "nurse") return "/nurse";
    if (key === "doctor") return "/appointments";
    return "/";
  };

  const getViewValue = (key) => {
    const card = cards.find((item) => item?.key === key);
    return Number(card?.value || 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (isAdmin) {
          const [
            dashboardRes,
            labRes,
            radiologyRes,
            pharmacyRes,
            doctorsRes,
            nurseOverviewRes,
            nurseWorkloadRes,
          ] = await Promise.allSettled([
            getDashboard("admin"),
            getLabStats(),
            getRadiologyStats(),
            getPharmacyStats(),
            getDoctors(),
            getDashboard("nurse"),
            getDashboard("nurse", { nurseId: "all" }),
          ]);

          if (dashboardRes.status === "fulfilled") {
            setCards(dashboardRes.value?.data?.cards || []);
            setStats((prev) => ({ ...prev, ...(dashboardRes.value?.data?.stats || {}) }));
          }
          if (labRes.status === "fulfilled") setLabStats(labRes.value?.data || {});
          if (radiologyRes.status === "fulfilled") setRadiologyStats(radiologyRes.value?.data || {});
          if (pharmacyRes.status === "fulfilled") setPharmacyStats(pharmacyRes.value?.data || {});

          const doctors = doctorsRes.status === "fulfilled" ? doctorsRes.value?.data?.doctors || [] : [];
          const doctorsAvailable = doctors.filter((doc) => doc?.availabilityStatus === "available").length;

          const nurseOverviewStats = nurseOverviewRes.status === "fulfilled"
            ? nurseOverviewRes.value?.data?.stats || {}
            : {};
          const nurseWorkloadStats = nurseWorkloadRes.status === "fulfilled"
            ? nurseWorkloadRes.value?.data || {}
            : {};

          setTeamStats({
            doctorsTotal: doctors.length,
            doctorsAvailable,
            nursesTotal: Number(nurseOverviewStats.total || 0),
            nursesAvailable: Number(nurseOverviewStats.available || 0),
            nursesUnavailable: Number(nurseOverviewStats.unavailable || 0),
            nurseAssignedPatients: Number(nurseWorkloadStats.assignedPatients || 0),
            nurseTodaysAppointments: Number(nurseWorkloadStats.todaysAppointments || 0),
            nurseRecentVitals: Number(nurseWorkloadStats.recentVitals || 0),
          });
          return;
        }

        const res = await getDashboard();
        const data = res?.data || {};
        if (user?.role === "doctor") {
          setStats((prev) => ({
            ...prev,
            todayAppointments: Number(data.upcomingAppointments || 0),
            admittedPatients: Number(data.assignedPatients || 0),
          }));
        } else if (user?.role === "nurse") {
          setStats((prev) => ({
            ...prev,
            admittedPatients: Number(data.assignedPatients || 0),
            todayAppointments: Number(data.todaysAppointments || 0),
          }));
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  const moduleVolumeData = useMemo(
    () => [
      { module: "Pathology", total: Number(labStats.total || 0), today: Number(labStats.today || 0), pending: Number(labStats.pending || 0) },
      { module: "Radiology", total: Number(radiologyStats.total || 0), today: Number(radiologyStats.today || 0), pending: Number(radiologyStats.pending || 0) },
      { module: "Pharmacy Rx", total: Number(pharmacyStats.activePrescriptions || 0), today: Number(pharmacyStats.todayDispensed || 0), pending: Number(pharmacyStats.lowStockCount || 0) },
    ],
    [labStats, radiologyStats, pharmacyStats]
  );

  const moduleRevenueData = useMemo(
    () => [
      { name: "Pathology", value: Number(labStats.totalRevenue || 0) },
      { name: "Radiology", value: Number(radiologyStats.totalRevenue || 0) },
      { name: "Pharmacy", value: Number(pharmacyStats.inventoryValue || 0) },
    ],
    [labStats, radiologyStats, pharmacyStats]
  );

  const workforceData = useMemo(
    () => [
      { name: "Doctors Available", value: Number(teamStats.doctorsAvailable || 0) },
      { name: "Doctors Unavailable", value: Math.max(0, Number(teamStats.doctorsTotal || 0) - Number(teamStats.doctorsAvailable || 0)) },
      { name: "Nurses Available", value: Number(teamStats.nursesAvailable || 0) },
      { name: "Nurses Unavailable", value: Number(teamStats.nursesUnavailable || 0) },
    ],
    [teamStats]
  );

  const visibleWidgetIds = useMemo(
    () => widgetOrder.filter((id) => !hiddenWidgetIds.includes(id)),
    [widgetOrder, hiddenWidgetIds]
  );

  const resizeWidgetWidth = (id, direction) => {
    setWidgetMeta((prev) => {
      const current = prev[id]?.w || 4;
      const idx = SIZE_STEPS.indexOf(current);
      if (idx < 0) return prev;
      const nextIdx = direction === "expand" ? Math.min(idx + 1, SIZE_STEPS.length - 1) : Math.max(idx - 1, 0);
      return { ...prev, [id]: { ...(prev[id] || {}), w: SIZE_STEPS[nextIdx], h: prev[id]?.h || 2 } };
    });
  };

  const resizeWidgetHeight = (id, direction) => {
    setWidgetMeta((prev) => {
      const current = prev[id]?.h || 2;
      const next = direction === "expand" ? Math.min(3, current + 1) : Math.max(1, current - 1);
      return { ...prev, [id]: { ...(prev[id] || {}), w: prev[id]?.w || 4, h: next } };
    });
  };

  const removeWidget = (id) => {
    if (visibleWidgetIds.length <= 1) return;
    setHiddenWidgetIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const addWidget = (id) => {
    setHiddenWidgetIds((prev) => prev.filter((item) => item !== id));
    setWidgetOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const toggleWidgetVisibility = (id, checked) => {
    if (!checked) {
      if (visibleWidgetIds.length <= 1) return;
      removeWidget(id);
      return;
    }
    addWidget(id);
  };

  const resetWidgets = () => {
    setWidgetOrder(DEFAULT_ORDER);
    setHiddenWidgetIds([]);
    setWidgetMeta(DEFAULT_META);
  };

  const handleDropWidget = (targetId) => {
    if (!draggingWidgetId) return;
    setWidgetOrder((prev) => moveItem(prev, draggingWidgetId, targetId));
    setDraggingWidgetId("");
  };

  const renderMetric = (title, value, subtitle, Icon, iconClass = "text-primary") => (
    <div className="h-full rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );

  const renderWidgetBody = (widgetId) => {
    if (widgetId === "view:admin") {
      return renderMetric("Admin View", getViewValue("admin"), "Open", LayoutGrid, "text-primary");
    }
    if (widgetId === "view:doctor") {
      return renderMetric("Doctor View", getViewValue("doctor"), "Open", Stethoscope, "text-accent");
    }
    if (widgetId === "view:nurse") {
      return renderMetric("Nurse View", getViewValue("nurse"), "Open", UserCog, "text-status-available");
    }

    if (widgetId === "totalBeds") return renderMetric("Total Beds", Number(stats.totalBeds || 0), `${Number(stats.availableBeds || 0)} available`, Bed);
    if (widgetId === "admittedPatients") return renderMetric("Admitted Patients", Number(stats.admittedPatients || 0), "Currently in hospital", Users, "text-accent");
    if (widgetId === "availableDoctors") return renderMetric("Available Doctors", Number(stats.availableDoctors || 0), "On duty today", Stethoscope, "text-status-available");
    if (widgetId === "pendingBills") return renderMetric("Pending Bills", Number(stats.pendingBills || 0), "Awaiting payment", Receipt, "text-status-occupied");
    if (widgetId === "todayAppointments") return renderMetric("Today's Appointments", Number(stats.todayAppointments || 0), "", Calendar);
    if (widgetId === "pathologyToday") return renderMetric("Pathology Today", Number(labStats.today || 0), "", FlaskConical);
    if (widgetId === "radiologyToday") return renderMetric("Radiology Today", Number(radiologyStats.today || 0), "", ScanLine, "text-accent");
    if (widgetId === "activePrescriptions") return renderMetric("Active Prescriptions", Number(pharmacyStats.activePrescriptions || 0), "", Pill, "text-status-available");
    if (widgetId === "nursesAvailable") return renderMetric("Nurses Available", Number(teamStats.nursesAvailable || 0), "", UserCog, "text-status-occupied");

    if (widgetId === "recentPatients") return <RecentPatients />;
    if (widgetId === "bedOccupancy") return <BedOccupancyChart />;
    if (widgetId === "weeklyAdmissions") return <AdmissionChart />;
    if (widgetId === "quickActions") return <QuickActions />;

    if (widgetId === "moduleVolume") {
      return (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="module" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill={chartColors[0]} />
              <Bar dataKey="today" fill={chartColors[1]} />
              <Bar dataKey="pending" fill={chartColors[2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (widgetId === "moduleRevenue") {
      return (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={moduleRevenueData} dataKey="value" nameKey="name" outerRadius={90} label>
                {moduleRevenueData.map((entry, idx) => (
                  <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (widgetId === "workforce") {
      return (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={workforceData} dataKey="value" nameKey="name" outerRadius={90} label>
                {workforceData.map((entry, idx) => (
                  <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (widgetId === "nurseWorkload") {
      return (
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Assigned Patients</p>
            <p className="text-2xl font-semibold">{teamStats.nurseAssignedPatients}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Today Appointments</p>
            <p className="text-2xl font-semibold">{teamStats.nurseTodaysAppointments}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Recent Vitals (24h)</p>
            <p className="text-2xl font-semibold">{teamStats.nurseRecentVitals}</p>
          </div>
        </div>
      );
    }

    if (widgetId === "doctorWidget") {
      return (
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Doctors</p>
            <p className="text-2xl font-semibold">{teamStats.doctorsTotal}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Available Doctors</p>
            <p className="text-2xl font-semibold">{teamStats.doctorsAvailable}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Today's Appointments</p>
            <p className="text-2xl font-semibold">{stats.todayAppointments}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pending Revenue</p>
          <p className="text-xl font-semibold">Rs {Number(stats.pendingRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Lab Revenue</p>
          <p className="text-xl font-semibold">Rs {Number(labStats.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Radiology Revenue</p>
          <p className="text-xl font-semibold">Rs {Number(radiologyStats.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pharmacy Low Stock</p>
          <p className="text-xl font-semibold">{Number(pharmacyStats.lowStockCount || 0)}</p>
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Real-time hospital management metrics and insights</p>
      </div>

      {isAdmin ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Customizable Widget Board</h2>
              <p className="text-xs text-muted-foreground">Everything is widgetized: drag, remove/add, resize, and dense auto-fit layout to reduce wasted space.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Show / Hide Widgets</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {DEFAULT_WIDGETS.map((widget) => {
                    const isVisible = !hiddenWidgetIds.includes(widget.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={`view-${widget.id}`}
                        checked={isVisible}
                        onCheckedChange={(checked) => toggleWidgetVisibility(widget.id, checked)}
                      >
                        {widget.title}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetWidgets}>Reset Layout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" onClick={resetWidgets}>Reset Layout</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 auto-rows-[130px] grid-flow-dense">
            {visibleWidgetIds.map((widgetId) => {
              const def = DEFAULT_WIDGETS.find((w) => w.id === widgetId);
              if (!def) return null;
              const meta = widgetMeta[widgetId] || { w: def.defaultW, h: def.defaultH };
              const wClass = SPAN_CLASS[meta.w] || SPAN_CLASS[4];
              const hClass = HEIGHT_CLASS[meta.h] || HEIGHT_CLASS[2];

              return (
                <Fragment key={widgetId}>
                  <div
                    className={`${wClass} ${hClass} rounded-xl border bg-card shadow-card`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropWidget(widgetId)}
                  >
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <div
                        className="flex cursor-grab items-center gap-2 text-sm font-medium"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingWidgetId(widgetId);
                        }}
                        onDragEnd={() => setDraggingWidgetId("")}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {def.title}
                        {draggingWidgetId === widgetId ? <Badge variant="secondary">Dragging</Badge> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resizeWidgetWidth(widgetId, "shrink")} title="Narrower">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resizeWidgetWidth(widgetId, "expand")} title="Wider">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resizeWidgetHeight(widgetId, "shrink")} title="Shorter">
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resizeWidgetHeight(widgetId, "expand")} title="Taller">
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeWidget(widgetId)}
                          disabled={visibleWidgetIds.length <= 1}
                          title="Remove widget"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="h-[calc(100%-42px)] overflow-auto p-3">
                      {renderWidgetBody(widgetId)}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Admitted Patients</p>
            <p className="text-2xl font-bold">{Number(stats.admittedPatients || 0)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Today's Appointments</p>
            <p className="text-2xl font-bold">{Number(stats.todayAppointments || 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
