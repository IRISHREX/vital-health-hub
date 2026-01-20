import { useState, useEffect } from "react";
import { getDoctors } from "@/lib/doctors";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Stethoscope,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Pencil,
  CheckCircle,
  Circle,
  Eye,
  Trash2,
} from "lucide-react";
import DoctorDialog from "@/components/dashboard/DoctorDialog";
import { updateAvailability } from "@/lib/doctors";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

const departments = [
  "Cardiac Care",
  "Respiratory",
  "Surgery",
  "Orthopedics",
  "Neurology",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "Ophthalmology",
  "ENT",
];

export default function Doctors() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  const availabilityMutation = useMutation({
    mutationFn: (data) =>
      updateAvailability(data.doctorId, data.status),
    onSuccess: (_, variables) => {
      setDoctors((prevDoctors) =>
        prevDoctors.map((doc) =>
          doc._id === variables.doctorId
            ? { ...doc, availabilityStatus: variables.status }
            : doc
        )
      );
      toast({ title: "Success", description: "Availability updated successfully." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update availability." });
    },
  });

  const openCreateDialog = () => {
    setSelectedDoctor(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (doctor) => {
    setSelectedDoctor(doctor);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDoctor(null);
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const doctorsData = await getDoctors();
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

  const filteredDoctors = doctors
    ? doctors.filter((doctor) => {
        const matchesSearch =
          doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDepartment =
          departmentFilter === "all" || doctor.department === departmentFilter;
        const matchesAvailability =
          availabilityFilter === "all" ||
          (availabilityFilter === "available" && doctor.availabilityStatus === "available") ||
          (availabilityFilter === "unavailable" && doctor.availabilityStatus !== "available");
        return matchesSearch && matchesDepartment && matchesAvailability;
      })
    : [];

  const stats = {
    total: doctors?.length || 0,
    available: doctors ? doctors.filter((d) => d.availabilityStatus === "available").length : 0,
    unavailable: doctors ? doctors.filter((d) => d.availabilityStatus !== "available").length : 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Doctor Management
          </h1>
          <p className="text-muted-foreground">
            Manage doctor profiles and availability
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      <DoctorDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        doctor={selectedDoctor}
        mode={dialogMode}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered physicians</p>
          </CardContent>
        </Card>
        <Card className="border-status-available/30 bg-status-available/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Today</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-available" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-available">
              {stats.available}
            </div>
            <p className="text-xs text-muted-foreground">On duty</p>
          </CardContent>
        </Card>
        <Card className="border-status-occupied/30 bg-status-occupied/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-occupied" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-occupied">
              {stats.unavailable}
            </div>
            <p className="text-xs text-muted-foreground">Off duty / Leave</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctors by name or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doctor) => (
            <Card key={doctor._id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {doctor.name
                        .split(" ")
                        .slice(1)
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {doctor.name}
                      </h3>
                      <p className="text-sm text-primary">{doctor.specialization}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newStatus = doctor.availabilityStatus === "available" ? "unavailable" : "available";
                        availabilityMutation.mutate({ doctorId: doctor._id, status: newStatus });
                      }}
                      disabled={availabilityMutation.isPending}
                      className="h-auto p-1"
                    >
                      {doctor.availabilityStatus === "available" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stethoscope className="h-4 w-4" />
                    <span>{doctor.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{doctor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{doctor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    <span>₹{doctor.consultationFee?.opd?.toLocaleString() || 0} / consultation</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="icon" title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => openEditDialog(doctor)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="flex-1 ml-2">
                    <Calendar className="mr-1 h-4 w-4" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No doctors found.</p>
        )}
      </div>
    </div>
  );
}
