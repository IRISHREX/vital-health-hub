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
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getBeds } from "@/lib/beds";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getAppointments } from "@/lib/appointments";
import { getDashboard } from '@/lib/dashboard';
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BedOccupancyChart } from "@/components/dashboard/BedOccupancyChart";
import { AdmissionChart } from "@/components/dashboard/AdmissionChart";
import { RecentPatients } from "@/components/dashboard/RecentPatients";
import { QuickActions } from "@/components/dashboard/QuickActions"; 


export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalBeds: 0,
    availableBeds: 0,
    admittedPatients: 0,
    availableDoctors: 0,
    pendingBills: 0,
    todayAppointments: 0,
    todayDischarges: 0,
  });
  const [cards, setCards] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getViewRoute = (key) => {
    if (key === 'nurse') return '/nurse';
    if (key === 'doctor') return '/appointments';
    return '/';
  }

  const handleSelectView = async (key) => {
    setSelectedView(key);
    try {
      const res = await getDashboard(key);
      // dashboard endpoint returns data differently per role
      if (key === 'admin') {
        setCards(res.data?.cards || []);
        setStats(res.data.data.stats || {});
      } else if (key === 'doctor') {
        setStats({ upcomingAppointments: res.data.data.upcomingAppointments, assignedPatients: res.data.data.assignedPatients });
      } else if (key === 'nurse') {
        setStats({ assignedPatients: res.data.data.assignedPatients, todaysAppointments: res.data.data.todaysAppointments, recentVitals: res.data.data.recentVitals });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // If admin with availableViews, fetch admin dashboard cards
        if (user?.availableViews && user.availableViews.length > 0) {
          const res = await getDashboard('admin');
          setCards(res.data?.cards || []);
          setStats(res.data?.stats || {});
        }

        // Always fetch base stats for non-admin users
        const [bedsData, patientsData, doctorsData, appointmentsData] = await Promise.all([
          getBeds(),
          getPatients(),
          getDoctors(),
          getAppointments(),
        ]);

        const today = new Date().toISOString().split("T")[0];
        const todayAppointments = appointmentsData.data.appointments.filter(
          (apt) => apt.appointmentDate.split("T")[0] === today
        );

        setStats(prev => ({
          ...prev,
          totalBeds: bedsData.data.beds.length,
          availableBeds: bedsData.data.beds.filter((b) => b.status === "available").length,
          admittedPatients: patientsData.data.patients.filter((p) => p.registrationType === "ipd").length,
          availableDoctors: doctorsData.data.doctors.filter((d) => d.availabilityStatus).length,
          pendingBills: 12,
          todayAppointments: todayAppointments.length,
          todayDischarges: 5,
        }));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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

      {/* Admin: view selector cards */}
      {user?.availableViews && user.availableViews.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards?.map((card) => (
            <div key={card.key} className="rounded-xl bg-card p-5 shadow-card cursor-pointer hover:shadow-lg" onClick={() => handleSelectView(card.key)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{card.key === 'admin' ? stats.totalPatients : card.key === 'doctor' ? stats.upcomingAppointments : stats.assignedPatients}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate(getViewRoute(card.key)); }}>Open</button>
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
    </div>
  );
}
