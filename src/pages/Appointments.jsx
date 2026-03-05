import { useState, useEffect } from "react";
import { deleteAppointment, getAppointments, updateAppointment } from "@/lib/appointments";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Calendar, Clock, CheckCircle2, XCircle, Pencil, Eye, Trash2, ClipboardPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppointmentDialog from "@/components/dashboard/AppointmentDialog";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import PrescriptionDialog from "@/components/pharmacy/PrescriptionDialog";
import PrescriptionHistoryDialog from "@/components/pharmacy/PrescriptionHistoryDialog";
import ViewAppointmentDialog from "@/components/dashboard/ViewAppointmentDialog";

const statusConfig = {
  scheduled: { label: "Pending", variant: "info" },
  confirmed: { label: "Pending", variant: "info" },
  in_progress: { label: "Pending", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  no_show: { label: "No Show", variant: "destructive" },
};

export default function Appointments() {
  const { user } = useAuth();
  const { canCreate } = useVisualAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [prescriptionHistoryOpen, setPrescriptionHistoryOpen] = useState(false);
  const [selectedPrescriptionPatient, setSelectedPrescriptionPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedAppointmentStatus, setSelectedAppointmentStatus] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewAppointment, setSelectedViewAppointment] = useState(null);
  const { toast } = useToast();

  const openCreateDialog = () => {
    setSelectedAppointment(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (appointment) => {
    setSelectedAppointment(appointment);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointment(null);
    fetchData();
  };

  const openPrescriptionDialog = (apt) => {
    if (!apt?.patient) return;
    setSelectedPrescriptionPatient(apt.patient);
    setSelectedDoctorId(apt?.doctor?._id || apt?.doctor || "");
    setSelectedAppointmentId(apt?._id || "");
    setSelectedAppointmentStatus(apt?.status || "");
    setPrescriptionHistoryOpen(true);
  };

  const openViewDialog = (appointment) => {
    setSelectedViewAppointment(appointment);
    setViewDialogOpen(true);
  };

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      await updateAppointment(appointmentId, { status });
      toast({ title: "Success", description: `Appointment ${status}` });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (appointmentId) => {
    const ok = window.confirm("Delete this appointment?");
    if (!ok) return;
    try {
      await deleteAppointment(appointmentId);
      toast({ title: "Success", description: "Appointment deleted" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete appointment" });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, patientsData, doctorsData] = await Promise.all([
        getAppointments(),
        getPatients(),
        getDoctors(),
      ]);
      const allAppointments = appointmentsData.data.appointments || [];
      const allDoctors = doctorsData.data.doctors || [];
      const loggedInDoctorIds = allDoctors
        .filter(
          (d) =>
            d?.user?._id === user?._id ||
            String(d?.user?.email || "").toLowerCase() === String(user?.email || "").toLowerCase()
        )
        .map((d) => d._id);
      const scopedAppointments =
        user?.role === "doctor"
          ? allAppointments.filter((a) =>
              loggedInDoctorIds.includes(a?.doctor?._id || a?.doctor || a?.doctorId)
            )
          : allAppointments;

      setAppointments(scopedAppointments);
      setPatients(patientsData.data.patients || []);
      setDoctors(allDoctors);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?._id, user?.email, user?.role]);

  const getPatientName = (patientRef) => {
    if (!patientRef) return "Unknown";
    // If already populated object
    if (typeof patientRef === 'object') {
      const p = patientRef;
      if (p.firstName || p.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
      return p.name || 'Unknown';
    }
    // Otherwise lookup from patients list (supports _id or patientId)
    const patient = patients.find((p) => p._id === patientRef || p.patientId === patientRef);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown";
  };

  const getDoctorName = (doctorRef) => {
    if (!doctorRef) return "Unknown";
    // If already populated object
    if (typeof doctorRef === 'object') {
      const d = doctorRef;
      if (d.user) return `${d.user.firstName || ''} ${d.user.lastName || ''}`.trim() || d.name || 'Unknown';
      return d.name || 'Unknown';
    }
    // Otherwise lookup from doctors list (supports _id or doctorId)
    const doctor = doctors.find((d) => d._id === doctorRef || d.doctorId === doctorRef);
    if (!doctor) return "Unknown";
    return doctor.user ? `${doctor.user.firstName || ''} ${doctor.user.lastName || ''}`.trim() : doctor.name || 'Unknown';
  };

  const filteredAppointments = appointments
    ? appointments.filter((apt) => {
        const patientName = getPatientName(apt.patient || apt.patientId).toLowerCase();
        const doctorName = getDoctorName(apt.doctor || apt.doctorId).toLowerCase();
        return (
          patientName.includes(searchQuery.toLowerCase()) ||
          doctorName.includes(searchQuery.toLowerCase())
        );
      })
    : [];

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments
    ? appointments.filter((apt) => apt.appointmentDate.split("T")[0] === today)
    : [];

  const stats = {
    total: appointments?.length || 0,
    today: todayAppointments?.length || 0,
    scheduled: appointments
      ? appointments.filter((a) => a.status === "scheduled").length
      : 0,
    completed: appointments
      ? appointments.filter((a) => a.status === "completed").length
      : 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Appointments
          </h1>
          <p className="text-muted-foreground">
            Manage OPD appointments and schedules
          </p>
        </div>
        {canCreate("appointments") && (
          <RestrictedAction module="appointments" feature="create">
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </RestrictedAction>
        )}
      </div>

      <AppointmentDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        appointment={selectedAppointment}
        mode={dialogMode}
      />
      <PrescriptionDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        initialPatientId={selectedPrescriptionPatient?._id || ""}
        initialDoctorId={selectedDoctorId}
        initialAppointmentId={selectedAppointmentId}
        initialAppointmentStatus={selectedAppointmentStatus}
        initialEncounterType="opd"
      />
      <PrescriptionHistoryDialog
        open={prescriptionHistoryOpen}
        onOpenChange={setPrescriptionHistoryOpen}
        patient={selectedPrescriptionPatient}
        appointmentId={selectedAppointmentId}
        appointmentStatus={selectedAppointmentStatus}
        onCreateNew={() => {
          setPrescriptionHistoryOpen(false);
          setPrescriptionOpen(true);
        }}
      />
      <ViewAppointmentDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        appointment={selectedViewAppointment}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
          </CardContent>
        </Card>
        <Card className="border-status-reserved/30 bg-status-reserved/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-status-reserved" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-reserved">
              {stats.scheduled}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-available/30 bg-status-available/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-available" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-available">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayAppointments.map((apt) => (
                <div
                  key={apt._id}
                  className="flex items-center gap-3 rounded-lg border bg-background/50 p-3 sm:p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-sm font-bold text-primary">
                      {new Date(apt.appointmentDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{getPatientName(apt.patient || apt.patientId)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {getDoctorName(apt.doctor || apt.doctorId)}
                    </p>
                  </div>
                  {statusConfig[apt.status] && (
                    <Badge variant={statusConfig[apt.status].variant} className="max-w-[120px] truncate">
                      {statusConfig[apt.status].label}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No appointments scheduled for today.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <TableRow key={apt._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getPatientName(apt.patient || apt.patientId)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {getPatientName(apt.patient || apt.patientId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getDoctorName(apt.doctor || apt.doctorId)}</TableCell>
                    <TableCell>
                      {new Date(apt.appointmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(apt.appointmentDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{apt.reason}</Badge>
                    </TableCell>
                    <TableCell>
                      {statusConfig[apt.status] && (
                        <Badge variant={statusConfig[apt.status].variant}>
                          {statusConfig[apt.status].label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View Details"
                          onClick={() => openViewDialog(apt)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEditDialog(apt)}
                          disabled={apt.status === "completed"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Prescription"
                          className="text-primary hover:bg-primary"
                          onClick={() => openPrescriptionDialog(apt)}
                        >
                          <ClipboardPlus className="h-4 w-4" />
                        </Button>
                        {apt.status === "scheduled" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Complete"
                              className="text-status-available hover:bg-status-available"
                              onClick={() => handleStatusUpdate(apt._id, "completed")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel"
                              className="text-status-occupied hover:bg-status-occupied"
                              onClick={() => handleStatusUpdate(apt._id, "cancelled")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="text-destructive hover:bg-destructive"
                          onClick={() => handleDelete(apt._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
