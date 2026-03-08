import { useState, useEffect, useCallback } from "react";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { getBeds } from "@/lib/beds";
import { deletePatient } from "@/lib/patients";
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
import { Search, Plus, Users, UserCheck, UserX, Eye, Pencil, Trash2 } from "lucide-react";
import PatientDialog from "@/components/dashboard/PatientDialog";
import ViewPatientDialog from "@/components/dashboard/ViewPatientDialog";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import { Pagination } from "@/components/ui/pagination";
import { PageSkeleton } from "@/components/ui/table-skeleton";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";

export default function Patients() {
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("patients");
  const { play } = useSound();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewPatient, setSelectedViewPatient] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const openCreateDialog = () => {
    play("click");
    setSelectedPatient(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (patient) => {
    play("click");
    setSelectedPatient(patient);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const openViewDialog = (patient) => {
    play("click");
    setSelectedViewPatient(patient);
    setViewDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedPatient(null);
    fetchData();
  };

  const handleDelete = async (patient) => {
    if (!window.confirm(`Delete patient ${patient.firstName} ${patient.lastName}?`)) return;
    try {
      await deletePatient(patient._id);
      play("delete");
      toast.success("Patient deleted");
      fetchData();
    } catch (err) {
      play("error");
      toast.error(err.message || "Failed to delete patient");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (typeFilter !== "all") params.set("registrationType", typeFilter);

      const [patientsData, doctorsData, bedsData] = await Promise.all([
        getPatients(params.toString()),
        getDoctors(),
        getBeds(),
      ]);
      const pData = patientsData.data || patientsData;
      setPatients(pData.patients || []);
      setTotalPages(pData.pagination?.pages || 1);
      setTotalRecords(pData.pagination?.total || pData.patients?.length || 0);
      setDoctors(doctorsData.data?.doctors || doctorsData.doctors || []);
      setBeds(bedsData.data?.beds || bedsData.beds || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search: reset to page 1 on search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter]);

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

  const stats = {
    total: totalRecords,
    ipd: patients ? patients.filter((p) => p.registrationType === "ipd").length : 0,
    opd: patients ? patients.filter((p) => p.registrationType === "opd").length : 0,
  };

  if (loading && patients.length === 0) return <PageSkeleton statCards={3} tableColumns={7} tableRows={10} />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Patient Management
          </h1>
          <p className="text-muted-foreground">
            Manage patient registrations and admissions
          </p>
        </div>
        {permissions.canCreate && (
          <RestrictedAction module="patients" feature="create">
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Register Patient
            </Button>
          </RestrictedAction>
        )}
      </div>

      <PatientDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        patient={selectedPatient}
        mode={dialogMode}
      />

      <ViewPatientDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        patient={selectedViewPatient}
      />

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
            <SelectItem value="ipd">IPD (Admitted)</SelectItem>
            <SelectItem value="opd">OPD (Outpatient)</SelectItem>
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
                <TableHead>Diagnosis</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Bed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <TableRow key={patient._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {`${(patient.firstName || '?')[0]}${(patient.lastName || '?')[0]}`}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{`${patient.firstName} ${patient.lastName}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs, ${patient.gender}` : patient.gender}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{patient.contactNumber || patient.phone}</p>
                        <p className="text-xs text-muted-foreground">{patient.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.registrationType === "ipd" ? "default" : patient.registrationType === 'emergency' ? 'destructive' : "secondary"}
                      >
                        {(patient.registrationType || 'opd').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{patient.diagnosis || "General Checkup"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getDoctorName(patient.assignedDoctor)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{getBedNumber(patient.assignedBed)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View Details" onClick={() => openViewDialog(patient)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {permissions.canEdit && (
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditDialog(patient)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {permissions.canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(patient)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalRecords}
            limit={limit}
            loading={loading}
            onPageChange={setPage}
            onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
