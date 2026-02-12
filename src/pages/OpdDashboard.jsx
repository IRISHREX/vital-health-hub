import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { getAppointments } from "@/lib/appointments";
import { getDoctors } from "@/lib/doctors";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import PrescriptionDialog from "@/components/pharmacy/PrescriptionDialog";
import PrescriptionHistoryDialog from "@/components/pharmacy/PrescriptionHistoryDialog";
import {
  Calendar,
  Users,
  Stethoscope,
  Receipt,
  Plus,
  Search,
  Eye,
  Pencil,
  ClipboardPlus,
} from "lucide-react";

export default function OpdDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getModulePermissions, canCreate } = useVisualAuth();
  const permissions = getModulePermissions("appointments");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionHistoryOpen, setPrescriptionHistoryOpen] = useState(false);
  const [selectedPrescriptionPatient, setSelectedPrescriptionPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, doctorsData] = await Promise.all([
        getAppointments({ type: "opd", limit: 200 }),
        getDoctors(),
      ]);
      const fetchedAppointments = appointmentsData?.data?.appointments || [];
      const fetchedDoctors = doctorsData?.data?.doctors || [];
      const loggedInDoctorIds = fetchedDoctors
        .filter(
          (d) =>
            d?.user?._id === user?._id ||
            String(d?.user?.email || "").toLowerCase() === String(user?.email || "").toLowerCase()
        )
        .map((d) => d._id);
      const scopedAppointments =
        user?.role === "doctor"
          ? fetchedAppointments.filter((a) =>
              loggedInDoctorIds.includes(a?.doctor?._id || a?.doctor || a?.doctorId)
            )
          : fetchedAppointments;

      setAppointments(scopedAppointments);
      setDoctors(fetchedDoctors);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?._id, user?.email, user?.role]);

  const getDoctorName = (doctorRef) => {
    if (!doctorRef) return "-";
    if (typeof doctorRef === "object") {
      if (doctorRef.name) return doctorRef.name;
      const byUser = `${doctorRef.user?.firstName || ""} ${doctorRef.user?.lastName || ""}`.trim();
      if (byUser) return byUser;
      return `${doctorRef.firstName || ""} ${doctorRef.lastName || ""}`.trim() || "-";
    }
    const doctor = doctors.find((d) => d._id === doctorRef);
    return doctor?.name || `${doctor?.user?.firstName || ""} ${doctor?.user?.lastName || ""}`.trim() || "-";
  };

  const filteredAppointments = useMemo(() => {
    return (appointments || []).filter((apt) => {
      const patientName = `${apt?.patient?.firstName || ""} ${apt?.patient?.lastName || ""}`.trim().toLowerCase();
      const patientPhone = String(apt?.patient?.phone || "").toLowerCase();
      const doctorName = getDoctorName(apt?.doctor).toLowerCase();
      const reason = String(apt?.reason || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        patientName.includes(q) ||
        patientPhone.includes(q) ||
        doctorName.includes(q) ||
        reason.includes(q);
      const matchesStatus = statusFilter === "all" || apt?.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const todayAppointments = (appointments || []).filter(
      (apt) => String(apt?.appointmentDate || "").slice(0, 10) === todayStr
    );
    const uniquePatientsToday = new Set(
      todayAppointments.map((apt) => apt?.patient?._id || apt?.patient?.patientId || apt?._id)
    ).size;
    return {
      totalAppointments: appointments?.length || 0,
      patientsToday: uniquePatientsToday,
      scheduledToday: todayAppointments.filter((apt) =>
        ["scheduled", "confirmed", "in_progress"].includes(apt?.status)
      ).length,
      totalDoctors: doctors?.length || 0,
    };
  }, [appointments, doctors, todayStr]);

  const openPrescriptionDialog = (apt) => {
    if (!apt?.patient) return;
    setSelectedPrescriptionPatient(apt.patient);
    setSelectedDoctorId(apt?.doctor?._id || apt?.doctor || "");
    setSelectedAppointmentId(apt?._id || "");
    setPrescriptionHistoryOpen(true);
  };

  const statusLabel = (status) => {
    if (["scheduled", "confirmed", "in_progress"].includes(status)) return "Pending";
    if (status === "completed") return "Completed";
    if (status === "cancelled") return "Cancelled";
    if (status === "no_show") return "No Show";
    return status || "-";
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">OPD Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Hello {user?.fullName ? user.fullName.split(" ")[0] : "there"}, here is a summary of OPD appointments.
          </p>
        </div>
        {canCreate("appointments") && (
          <RestrictedAction module="appointments" feature="create">
            <Button onClick={() => navigate("/appointments")}>
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </RestrictedAction>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total OPD Appointments"
          value={stats.totalAppointments}
          subtitle={`${stats.scheduledToday} active today`}
          icon={Calendar}
          variant="primary"
        />
        <KpiCard
          title="Patients Today"
          value={stats.patientsToday}
          subtitle="Unique OPD patients"
          icon={Users}
          variant="accent"
        />
        <KpiCard
          title="Available Doctors"
          value={stats.totalDoctors}
          subtitle="On duty today"
          icon={Stethoscope}
          variant="success"
        />
        <KpiCard
          title="Pending Bills"
          value={1500}
          subtitle="Awaiting payment"
          icon={Receipt}
          variant="warning"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, phone, doctor, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => {
                  const patient = apt?.patient || {};
                  const fullName = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
                  return (
                    <TableRow key={apt._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {`${patient?.firstName?.[0] || "P"}${patient?.lastName?.[0] || ""}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{fullName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{patient?.phone || "-"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getDoctorName(apt?.doctor)}</TableCell>
                      <TableCell>
                        {apt?.appointmentDate ? new Date(apt.appointmentDate).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>{apt?.reason || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{statusLabel(apt?.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Details" onClick={() => navigate("/appointments")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {permissions.canEdit && (
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => navigate("/appointments")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Prescription"
                              className="text-primary hover:bg-primary/10"
                              onClick={() => openPrescriptionDialog(apt)}
                            >
                              <ClipboardPlus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No OPD appointments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrescriptionDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        initialPatientId={selectedPrescriptionPatient?._id || ""}
        initialDoctorId={selectedDoctorId}
        initialAppointmentId={selectedAppointmentId}
        initialEncounterType="opd"
      />

      <PrescriptionHistoryDialog
        open={prescriptionHistoryOpen}
        onOpenChange={setPrescriptionHistoryOpen}
        patient={selectedPrescriptionPatient}
        onCreateNew={() => {
          setPrescriptionHistoryOpen(false);
          setPrescriptionOpen(true);
        }}
      />
    </div>
  );
}
