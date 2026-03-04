import {
  Bed,
  Users,
  Stethoscope,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  FlaskConical,
  ScanLine,
  Pill,
  UserCog,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { getDashboard } from '@/lib/dashboard';
import { getLabStats } from "@/lib/labTests";
import { getRadiologyStats } from "@/lib/radiology";
import { getPharmacyStats } from "@/lib/pharmacy";
import { getDoctors } from "@/lib/doctors";
import { KpiCard } from "@/components/dashboard/KpiCard";
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

const chartColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function ResizableWidget({ title, subtitle, className = "", children }) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-card resize overflow-auto min-h-[220px] ${className}`}
      style={{ minWidth: 280 }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canView } = useVisualAuth();

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
    pendingRevenue: 0
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

  const getViewRoute = (key) => {
    if (key === 'nurse') return '/nurse';
    if (key === 'doctor') return '/appointments';
    return '/';
  };

  const canSeeViewCard = (key) => {
    if (key === 'nurse') return canView('nurses');
    if (key === 'doctor') return canView('appointments');
    return canView('dashboard');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const isAdmin = ['super_admin', 'hospital_admin'].includes(user?.role);

        if (isAdmin) {
          const [
            dashboardRes,
            labRes,
            radiologyRes,
            pharmacyRes,
            doctorsRes,
            nurseOverviewRes,
            nurseWorkloadRes
          ] = await Promise.allSettled([
            getDashboard('admin'),
            getLabStats(),
            getRadiologyStats(),
            getPharmacyStats(),
            getDoctors(),
            getDashboard('nurse'),
            getDashboard('nurse', { nurseId: 'all' })
          ]);

          if (dashboardRes.status === "fulfilled") {
            setCards(dashboardRes.value?.data?.cards || []);
            setStats((prev) => ({ ...prev, ...(dashboardRes.value?.data?.stats || {}) }));
          }
          if (labRes.status === "fulfilled") {
            setLabStats(labRes.value?.data || {});
          }
          if (radiologyRes.status === "fulfilled") {
            setRadiologyStats(radiologyRes.value?.data || {});
          }
          if (pharmacyRes.status === "fulfilled") {
            setPharmacyStats(pharmacyRes.value?.data || {});
          }

          const doctors = doctorsRes.status === "fulfilled"
            ? (doctorsRes.value?.data?.doctors || [])
            : [];
          const doctorsAvailable = doctors.filter((doc) => doc?.availabilityStatus === "available").length;

          const nurseOverviewStats = nurseOverviewRes.status === "fulfilled"
            ? (nurseOverviewRes.value?.data?.stats || {})
            : {};
          const nurseWorkloadStats = nurseWorkloadRes.status === "fulfilled"
            ? (nurseWorkloadRes.value?.data || {})
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

        if (user?.role === 'doctor') {
          setStats((prev) => ({
            ...prev,
            todayAppointments: Number(data.upcomingAppointments || 0),
            admittedPatients: Number(data.assignedPatients || 0)
          }));
        } else if (user?.role === 'nurse') {
          setStats((prev) => ({
            ...prev,
            admittedPatients: Number(data.assignedPatients || 0),
            todayAppointments: Number(data.todaysAppointments || 0)
          }));
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const moduleVolumeData = useMemo(() => ([
    { module: "Pathology", total: Number(labStats.total || 0), today: Number(labStats.today || 0), pending: Number(labStats.pending || 0) },
    { module: "Radiology", total: Number(radiologyStats.total || 0), today: Number(radiologyStats.today || 0), pending: Number(radiologyStats.pending || 0) },
    { module: "Pharmacy Rx", total: Number(pharmacyStats.activePrescriptions || 0), today: Number(pharmacyStats.todayDispensed || 0), pending: Number(pharmacyStats.lowStockCount || 0) },
  ]), [labStats, radiologyStats, pharmacyStats]);

  const moduleRevenueData = useMemo(() => ([
    { name: "Pathology", value: Number(labStats.totalRevenue || 0) },
    { name: "Radiology", value: Number(radiologyStats.totalRevenue || 0) },
    { name: "Pharmacy", value: Number(pharmacyStats.inventoryValue || 0) },
  ]), [labStats, radiologyStats, pharmacyStats]);

  const workforceData = useMemo(() => ([
    { name: "Doctors Available", value: Number(teamStats.doctorsAvailable || 0) },
    { name: "Doctors Total", value: Math.max(0, Number(teamStats.doctorsTotal || 0) - Number(teamStats.doctorsAvailable || 0)) },
    { name: "Nurses Available", value: Number(teamStats.nursesAvailable || 0) },
    { name: "Nurses Unavailable", value: Number(teamStats.nursesUnavailable || 0) },
  ]), [teamStats]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Real-time hospital management metrics and insights
        </p>
      </div>

      {user?.availableViews && user.availableViews.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards?.filter((card) => canSeeViewCard(card.key)).map((card) => (
            <div
              key={card.key}
              className="rounded-xl bg-card p-5 shadow-card cursor-pointer hover:shadow-lg"
              onClick={() => navigate(getViewRoute(card.key))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{Number(card.value || 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate(getViewRoute(card.key)); }}>
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Beds"
          value={stats.totalBeds}
          subtitle={`${stats.availableBeds} available`}
          icon={Bed}
          variant="primary"
        />
        <KpiCard
          title="Admitted Patients"
          value={stats.admittedPatients}
          subtitle="Currently in hospital"
          icon={Users}
          variant="accent"
        />
        <KpiCard
          title="Available Doctors"
          value={stats.availableDoctors}
          subtitle="On duty today"
          icon={Stethoscope}
          variant="success"
        />
        <KpiCard
          title="Pending Bills"
          value={stats.pendingBills}
          subtitle="Awaiting payment"
          icon={Receipt}
          variant="warning"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.todayAppointments}</p>
              <p className="text-sm text-muted-foreground">Today's Appointments</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Number(labStats.today || 0)}</p>
              <p className="text-sm text-muted-foreground">Pathology Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <ScanLine className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Number(radiologyStats.today || 0)}</p>
              <p className="text-sm text-muted-foreground">Radiology Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-available/10">
              <Pill className="h-5 w-5 text-status-available" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Number(pharmacyStats.activePrescriptions || 0)}</p>
              <p className="text-sm text-muted-foreground">Active Prescriptions</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-occupied/10">
              <UserCog className="h-5 w-5 text-status-occupied" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Number(teamStats.nursesAvailable || 0)}</p>
              <p className="text-sm text-muted-foreground">Nurses Available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BedOccupancyChart />
        <AdmissionChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentPatients />
        </div>
        <QuickActions />
      </div>

      {['super_admin', 'hospital_admin'].includes(user?.role) && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Advanced Widget Board</h2>
            <p className="text-xs text-muted-foreground">Tip: drag widget corner to resize</p>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <ResizableWidget
              title="Pathology / Radiology / Pharmacy Volume"
              subtitle="Total vs Today vs Pending"
              className="col-span-12 lg:col-span-7"
            >
              <div className="h-[260px] w-full">
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
            </ResizableWidget>

            <ResizableWidget
              title="Module Revenue / Value"
              subtitle="Pathology + Radiology revenue, Pharmacy inventory"
              className="col-span-12 lg:col-span-5"
            >
              <div className="h-[260px] w-full">
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
            </ResizableWidget>

            <ResizableWidget
              title="Workforce Availability"
              subtitle="Doctor and Nurse distribution"
              className="col-span-12 md:col-span-6 lg:col-span-4"
            >
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={workforceData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {workforceData.map((entry, idx) => (
                        <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ResizableWidget>

            <ResizableWidget
              title="Nurse Workload Widget"
              subtitle="Cross-team operational support indicators"
              className="col-span-12 md:col-span-6 lg:col-span-4"
            >
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
            </ResizableWidget>

            <ResizableWidget
              title="Doctor Widget"
              subtitle="Availability and appointment pressure"
              className="col-span-12 lg:col-span-4"
            >
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
            </ResizableWidget>

            <ResizableWidget
              title="Revenue and Alerts"
              subtitle="Financial and operational watchlist"
              className="col-span-12"
            >
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
            </ResizableWidget>
          </div>
        </>
      )}
    </div>
  );
}
