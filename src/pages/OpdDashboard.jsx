import {
  Bed,
  Users,
  Stethoscope,
  Receipt,
  Clock,
  Calendar,
  LogOut,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ClipboardPlus,
  MoreVertical,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getBeds } from "@/lib/beds";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPermissions } from "@/lib/rbac";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PrescriptionDialog from "@/components/dashboard/PrescriptionDialog";

export default function OpdDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getPermissions(user?.role, "patients");

  const [cards, setCards] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  const openCreateDialog = () => {
    setSelectedPatient(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (patient) => {
    setSelectedPatient(patient);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const openViewDialog = (patient) => {
    setSelectedViewPatient(patient);
    setViewDialogOpen(true);
  };

  const openPrescriptionDialog = (patient) => {
    setSelectedPatient(patient);
    setIsPrescriptionOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPatient(null);
    console.info("[Patients] dialog closed - refetching patients");
    fetchData();
  };

  const fetchData = async () => {
    try {
      console.info("[Patients] fetching patients/doctors/beds");
      setLoading(true);
      const [patientsData, doctorsData] = await Promise.all([
        getPatients(),
        getDoctors(),
      ]);
      setPatients(
        patientsData.data.patients.filter(
          (p) => p.registrationType === "opd",
        ) || [],
      );
      setDoctors(doctorsData.data.doctors || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDoctorName = (doctorId) => {
    if (!doctorId) return "-";
    const doctor = doctors.find((d) => d._id === doctorId);
    return doctor?.name || "-";
  };

  const filteredPatients = patients
    ? patients.filter((patient) => {
        const matchesSearch =
          `${patient.firstName || ""} ${patient.lastName || ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (patient.contactNumber &&
            patient.contactNumber.includes(searchQuery)) ||
          (patient.email &&
            patient.email.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesDate = true;
        if (dateFilter !== "all") {
          const patientDate = new Date(
            patient.createdAt || patient.registrationDate || new Date(),
          );
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const pDate = new Date(patientDate);
          pDate.setHours(0, 0, 0, 0);

          if (dateFilter === "today")
            matchesDate = pDate.getTime() === today.getTime();
          else if (dateFilter === "old")
            matchesDate = pDate.getTime() < today.getTime();
          else if (dateFilter === "upcoming")
            matchesDate = pDate.getTime() > today.getTime();
        }

        const matchesDoctor =
          doctorFilter === "all" || patient.assignedDoctor === doctorFilter;
        const matchesStatus =
          statusFilter === "all" || patient.status === statusFilter;

        return matchesSearch && matchesDate && matchesDoctor && matchesStatus;
      })
    : [];

  const stats = {
    total: patients?.length || 0,
    pending: patients
      ? patients.filter((p) => p.status === "active").length
      : 0,
    completed: patients
      ? patients.filter((p) => p.status === "completed").length
      : 0,
    totalDoctors: doctors?.length || 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-white to-blue-100 rounded-lg">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hello {user?.fullName ? user.fullName.split(" ")[0] : "there"}👋
          </h1>
          <p className="text-muted-foreground">
            Here’s a summary of today’s outpatient activities.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-auto mb-4">
          <Button>
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
          <Button>
            <Clock className="h-4 w-4" />
            Schedule
            <Calendar className="h-4 w-4" />
            View Slots
          </Button>
        </div>
        <div className="w-40 h-40">
          <img src="opdF.svg" alt="OPD" className="w-full h-full" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Appointments"
          value={stats.total || 0}
          subtitle={`${stats.pending} available`}
          icon={Calendar}
          variant="primary"
        />
        <KpiCard
          title="Patients Today"
          value={stats.total || 0}
          subtitle={`${stats.pending} pending`}
          icon={Users}
          variant="accent"
        />
        <KpiCard
          title="Available Doctors"
          value={stats.totalDoctors || 0}
          subtitle="On duty today"
          icon={Stethoscope}
          variant="success"
        />
        <KpiCard
          title="Pending Bills"
          value={1500}
          subtitle="Awaiting payment"
          icon={Receipt}
          trend={{ value: 5, isPositive: false }}
          variant="warning"
        />
      </div>

      {/* Search & filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="old">Old</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map((doctor) => (
              <SelectItem key={doctor._id} value={doctor._id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Booked By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <TableRow key={patient._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {`${patient.firstName[0]}${patient.lastName[0]}`}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{`${patient.firstName} ${patient.lastName}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {`${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs, ${patient.gender}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{patient.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          patient.registrationType === "ipd"
                            ? "default"
                            : patient.registrationType === "emergency"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {patient.registrationType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {patient.gender || "General Checkup"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getDoctorName(patient.assignedDoctor)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {patient?.registeredBy?.fullName || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openViewDialog(patient)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {permissions.canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(patient)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPrescriptionDialog(patient)}
                              >
                                <ClipboardPlus className="h-4 w-4 mr-2" />
                                Prescription
                              </DropdownMenuItem>
                            </>
                          )}
                          {permissions.canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PrescriptionDialog
        isOpen={isPrescriptionOpen}
        onClose={() => setIsPrescriptionOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
}
