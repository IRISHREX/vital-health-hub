import { useState, useEffect } from "react";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getBeds } from "@/lib/beds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Users, UserCheck, UserX, Eye, Pencil } from "lucide-react";
import PatientDialog from "@/components/dashboard/PatientDialog";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const openCreateDialog = () => {
    setSelectedPatient(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (patient: any) => {
    setSelectedPatient(patient);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPatient(null);
    // Refetch data
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [patientsData, doctorsData, bedsData] = await Promise.all([
        getPatients(),
        getDoctors(),
        getBeds(),
      ]);
      setPatients(patientsData.data.patients || []);
      setDoctors(doctorsData.data.doctors || []);
      setBeds(bedsData.data.beds || []);
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

  const getBedNumber = (bedId) => {
    if (!bedId) return "-";
    const bed = beds.find((b) => b._id === bedId);
    return bed?.bedNumber || "-";
  };

  const filteredPatients = patients ? patients.filter((patient) => {
    const matchesSearch =
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.contactNumber.includes(searchQuery) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || patient.type === typeFilter;
    return matchesSearch && matchesType;
  }) : [];

  const stats = {
    total: patients?.length || 0,
    ipd: patients ? patients.filter((p) => p.type === "IPD").length : 0,
    opd: patients ? patients.filter((p) => p.type === "OPD").length : 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Patient Management
          </h1>
          <p className="text-muted-foreground">
            Manage patient registrations and admissions
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Register Patient
        </Button>
      </div>

      <PatientDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        patient={selectedPatient}
        mode={dialogMode}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPD Patients</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.ipd}</div>
            <p className="text-xs text-muted-foreground">Currently admitted</p>
          </CardContent>
        </Card>
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OPD Patients</CardTitle>
            <UserX className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.opd}</div>
            <p className="text-xs text-muted-foreground">Outpatient visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Patient Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="IPD">IPD (Admitted)</SelectItem>
            <SelectItem value="OPD">OPD (Outpatient)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Patients Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Bed</TableHead>
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
                        <p className="text-sm">{patient.contactNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.type === "IPD" ? "default" : "secondary"}
                      >
                        {patient.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {patient.diagnosis || "General Checkup"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getDoctorName(patient.assignedDoctor)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {getBedNumber(patient.assignedBed)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(patient)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
    </div>
  );
}
