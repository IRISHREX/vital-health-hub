import { useState, useEffect, useMemo } from "react";
import { getDoctors, updateAvailability } from "@/lib/doctors";
import { getDoctorProfile } from "@/lib/doctorDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, Stethoscope, Phone, Mail, Calendar, IndianRupee, Pencil,
  CheckCircle, Circle, Eye, Trash2, Users, Receipt, Activity, Clock,
  Shield, Star, Award, TrendingUp, X
} from "lucide-react";
import DoctorDialog from "@/components/dashboard/DoctorDialog";
import ViewDoctorDialog from "@/components/dashboard/ViewDoctorDialog";
import PersonalPermissionsPanel from "@/components/permissions/PersonalPermissionsPanel";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { useAuth } from "@/lib/AuthContext";
import RestrictedAction from "@/components/permissions/RestrictedAction";
import { toast as sonnerToast } from "sonner";

const departments = [
  "Cardiac Care", "Respiratory", "Surgery", "Orthopedics", "Neurology",
  "Pediatrics", "General Medicine", "Dermatology", "Ophthalmology", "ENT",
];

export default function Doctors() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canCreate } = useVisualAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewDoctor, setSelectedViewDoctor] = useState(null);

  // Profile panel state
  const [profileDoctor, setProfileDoctor] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("overview");

  const isDoctor = user?.role === 'doctor';

  const availabilityMutation = useMutation({
    mutationFn: (data) => updateAvailability(data.doctorId, data.status),
    onSuccess: (_, variables) => {
      setDoctors(prev => prev.map(doc => doc._id === variables.doctorId ? { ...doc, availabilityStatus: variables.status } : doc));
      toast({ title: "Success", description: "Availability updated." });
    },
    onError: (error) => { toast({ variant: "destructive", title: "Error", description: error.message }); },
  });

  const openProfile = async (doctor) => {
    setProfileDoctor(doctor);
    setProfileLoading(true);
    try {
      const res = await getDoctorProfile(doctor._id);
      setProfileData(res.data);
    } catch (err) {
      console.error(err);
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => { setProfileDoctor(null); setProfileData(null); };

  const openCreateDialog = () => { setSelectedDoctor(null); setDialogMode("create"); setDialogOpen(true); };
  const openEditDialog = (doctor) => { setSelectedDoctor(doctor); setDialogMode("edit"); setDialogOpen(true); };
  const openViewDialog = (doctor) => { setSelectedViewDoctor(doctor); setViewDialogOpen(true); };
  const handleDialogClose = () => { setDialogOpen(false); setSelectedDoctor(null); fetchData(); };

  const fetchData = async () => {
    try {
      setLoading(true);
      const doctorsData = await getDoctors();
      setDoctors(doctorsData.data.doctors || []);
    } catch (err) { setError(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredDoctors = useMemo(() => {
    return (doctors || []).filter(doctor => {
      const matchesSearch = (doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) || doctor.specialization?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDepartment = departmentFilter === "all" || doctor.department === departmentFilter;
      const matchesAvailability = availabilityFilter === "all" || (availabilityFilter === "available" ? doctor.availabilityStatus === "available" : doctor.availabilityStatus !== "available");
      return matchesSearch && matchesDepartment && matchesAvailability;
    });
  }, [doctors, searchQuery, departmentFilter, availabilityFilter]);

  const stats = {
    total: doctors?.length || 0,
    available: doctors?.filter(d => d.availabilityStatus === "available").length || 0,
    unavailable: doctors?.filter(d => d.availabilityStatus !== "available").length || 0,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading doctors...</div></div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Doctor Management</h1>
          <p className="text-muted-foreground">Manage doctor profiles, schedules, and performance</p>
        </div>
        {canCreate("doctors") && (
          <RestrictedAction module="doctors" feature="create">
            <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />Add Doctor</Button>
          </RestrictedAction>
        )}
      </div>

      <DoctorDialog isOpen={dialogOpen} onClose={handleDialogClose} doctor={selectedDoctor} mode={dialogMode} />
      <ViewDoctorDialog isOpen={viewDialogOpen} onClose={() => setViewDialogOpen(false)} doctor={selectedViewDoctor} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Registered physicians</p></CardContent>
        </Card>
        <Card className="border-[hsl(var(--status-available))]/30 bg-[hsl(var(--status-available))]/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-available))]" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-[hsl(var(--status-available))]">{stats.available}</div><p className="text-xs text-muted-foreground">On duty</p></CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
            <div className="h-3 w-3 rounded-full bg-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{stats.unavailable}</div><p className="text-xs text-muted-foreground">Off duty / Leave</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or specialization..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Availability" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Doctor Profile Panel (slide-in) */}
      {profileDoctor && (
        <Card className="border-primary/20 animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Doctor Profile</CardTitle>
              <Button variant="ghost" size="icon" onClick={closeProfile}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading profile...</div>
            ) : profileData ? (
              <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="history">Work History</TabsTrigger>
                  <TabsTrigger value="permissions"><Shield className="h-3 w-3 mr-1" />Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="flex items-start gap-6">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {profileDoctor.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">{profileDoctor.name}</h3>
                        <p className="text-sm text-primary">{profileDoctor.specialization} • {profileDoctor.department}</p>
                        <p className="text-xs text-muted-foreground mt-1">{profileDoctor.qualification} • {profileDoctor.experience || 0} years exp</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        {[
                          { label: 'Total Patients', value: profileData.stats?.totalPatients || 0, icon: Users },
                          { label: 'Total Appointments', value: profileData.stats?.totalAppointments || 0, icon: Calendar },
                          { label: 'Today', value: profileData.stats?.todayAppointments || 0, icon: Clock },
                          { label: 'Completed', value: profileData.stats?.completedAppointments || 0, icon: CheckCircle },
                        ].map(s => (
                          <div key={s.label} className="p-3 rounded-lg bg-muted/30 text-center">
                            <s.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-lg font-bold">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1"><Mail className="h-4 w-4 text-muted-foreground" />{profileDoctor.email}</div>
                        <div className="flex items-center gap-1"><Phone className="h-4 w-4 text-muted-foreground" />{profileDoctor.phone || 'N/A'}</div>
                      </div>
                      {/* Schedule */}
                      {profileData.doctor?.schedule?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Weekly Schedule</h4>
                          <div className="grid grid-cols-7 gap-1">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                              const slot = profileData.doctor.schedule.find(s => s.day === day.toLowerCase());
                              return (
                                <div key={day} className={`p-2 rounded text-center text-xs border ${slot?.isAvailable ? 'border-[hsl(var(--status-available))]/30 bg-[hsl(var(--status-available))]/5' : 'border-border bg-muted/20'}`}>
                                  <p className="font-medium">{day}</p>
                                  {slot?.isAvailable ? <p className="text-[10px] text-muted-foreground">{slot.startTime}-{slot.endTime}</p> : <p className="text-[10px] text-muted-foreground">Off</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="revenue" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-3 mb-4">
                    <Card className="border-primary/20"><CardContent className="p-4 text-center"><IndianRupee className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xl font-bold">₹{(profileData.stats?.totalRevenue || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
                    <Card className="border-[hsl(var(--status-available))]/20"><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto text-[hsl(var(--status-available))] mb-1" /><p className="text-xl font-bold text-[hsl(var(--status-available))]">₹{(profileData.stats?.totalPaid || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Paid</p></CardContent></Card>
                    <Card className="border-destructive/20"><CardContent className="p-4 text-center"><Receipt className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-xl font-bold text-destructive">₹{(profileData.stats?.totalDue || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Due</p></CardContent></Card>
                  </div>
                  <div className="text-xs text-muted-foreground">Revenue is calculated from invoices linked to this doctor.</div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <h4 className="text-sm font-medium mb-3">Recent Appointments</h4>
                  {profileData.recentAppointments?.length > 0 ? (
                    <Table className="text-xs">
                      <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {profileData.recentAppointments.map(apt => (
                          <TableRow key={apt._id}>
                            <TableCell>{apt.patient?.firstName} {apt.patient?.lastName}</TableCell>
                            <TableCell>{new Date(apt.appointmentDate).toLocaleDateString()}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{apt.status}</Badge></TableCell>
                            <TableCell className="max-w-32 truncate">{apt.reason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : <p className="text-sm text-muted-foreground">No appointment history</p>}
                </TabsContent>

                <TabsContent value="permissions" className="mt-4">
                  <PersonalPermissionsPanel role="doctor" userId={profileDoctor.user?._id || profileDoctor._id} roleType="doctor" />
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">Failed to load profile data</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Doctor Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map(doctor => (
            <Card key={doctor._id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {doctor.name?.split(" ").slice(0, 2).map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground truncate">{doctor.name}</h3>
                        <p className="text-xs text-primary">{doctor.specialization}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-auto p-1" onClick={() => {
                        const newStatus = doctor.availabilityStatus === "available" ? "unavailable" : "available";
                        availabilityMutation.mutate({ doctorId: doctor._id, status: newStatus });
                      }} disabled={availabilityMutation.isPending}>
                        {doctor.availabilityStatus === "available" ? <CheckCircle className="h-5 w-5 text-[hsl(var(--status-available))]" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{doctor.department}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" />{doctor.phone || 'N/A'}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{doctor.email || 'N/A'}</span></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" />₹{doctor.consultationFee?.opd?.toLocaleString() || 0} / consultation</div>
                  {doctor.experience > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Award className="h-3.5 w-3.5" />{doctor.experience} years exp</div>}
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="View Profile" onClick={() => openProfile(doctor)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditDialog(doctor)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="flex-1 ml-1 text-xs" onClick={() => openProfile(doctor)}>
                    <Activity className="mr-1 h-3 w-3" />Profile & Stats
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-8">No doctors found.</p>
        )}
      </div>
    </div>
  );
}
