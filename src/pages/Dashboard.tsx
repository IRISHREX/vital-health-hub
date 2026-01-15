import {
  Bed,
  Users,
  Stethoscope,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  LogOut,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BedOccupancyChart } from "@/components/dashboard/BedOccupancyChart";
import { AdmissionChart } from "@/components/dashboard/AdmissionChart";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { mockDashboardStats } from "@/lib/mock-data";

export default function Dashboard() {
  const stats = mockDashboardStats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Real-time hospital management metrics and insights
        </p>
      </div>

      {/* KPI Cards */}
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
          trend={{ value: 12, isPositive: true }}
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
          trend={{ value: 5, isPositive: false }}
          variant="warning"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.todayAppointments}
              </p>
              <p className="text-sm text-muted-foreground">Today's Appointments</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <LogOut className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.todayDischarges}
              </p>
              <p className="text-sm text-muted-foreground">Today's Discharges</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-available/10">
              <TrendingUp className="h-5 w-5 text-status-available" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">92%</p>
              <p className="text-sm text-muted-foreground">Bed Utilization</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-occupied/10">
              <TrendingDown className="h-5 w-5 text-status-occupied" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">₹4.8L</p>
              <p className="text-sm text-muted-foreground">Pending Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BedOccupancyChart />
        <AdmissionChart />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentPatients />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
