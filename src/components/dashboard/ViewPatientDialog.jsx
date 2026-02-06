import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Phone, Mail, MapPin, User, Heart, Pill, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNurses } from "@/lib/users";
import { getPatientById } from "@/lib/patients";
import { getPatientVitals, getVitalTrends } from "@/lib/vitals";
import { getAppointments } from "@/lib/appointments";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const ViewPatientDialog = ({ isOpen, onClose, patient }) => {
  if (!patient) return null;

  const patientId = patient?._id || patient?.id;
  const { data: patientDetails } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId && isOpen,
  });

  const { data: nursesData } = useQuery({
    queryKey: ["nurses"],
    queryFn: () => getNurses(),
  });
  const nurses = nursesData?.data?.users || [];
  const nursesById = new Map(nurses.map((n) => [n._id || n.id, n]));
  const patientData = patientDetails?.data?.patient || patient;
  const formatFullName = (entity) =>
    `${entity?.firstName || ""} ${entity?.lastName || ""}`.trim();

  const assignedDoctorName = patientData.assignedDoctor?.user
    ? formatFullName(patientData.assignedDoctor.user)
    : formatFullName(patientData.assignedDoctor);
  const assignedDoctorId =
    typeof patientData.assignedDoctor === "string"
      ? patientData.assignedDoctor
      : patientData.assignedDoctor?._id;

  const assignedBedName =
    typeof patientData.assignedBed === "object" && patientData.assignedBed
      ? `${patientData.assignedBed.bedNumber || ""} ${patientData.assignedBed.ward ? `- ${patientData.assignedBed.ward}` : ""}`.trim()
      : "";
  const assignedBedId =
    typeof patientData.assignedBed === "string"
      ? patientData.assignedBed
      : patientData.assignedBed?._id;

  const { data: vitalsRes } = useQuery({
    queryKey: ["patient-vitals", patientId],
    queryFn: () => getPatientVitals(patientId, 10),
    enabled: !!patientId && isOpen,
  });

  const { data: trendsRes } = useQuery({
    queryKey: ["patient-vitals-trends", patientId],
    queryFn: () => getVitalTrends(patientId, 24),
    enabled: !!patientId && isOpen,
  });

  const { data: appointmentsRes } = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: () => getAppointments({ patientId }),
    enabled: !!patientId && isOpen,
  });

  const vitals = vitalsRes?.data || [];
  const latestVital = vitals[0];
  const trends = trendsRes?.data || [];
  const appointments = appointmentsRes?.data?.appointments || [];

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {`${patientData.firstName?.[0] || ''}${patientData.lastName?.[0] || ''}`}
              </AvatarFallback>
            </Avatar>
            Patient Details - {patientData.patientId || 'N/A'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg font-semibold">{`${patientData.firstName || ''} ${patientData.lastName || ''}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Patient ID</label>
                <p className="text-lg font-semibold">{patientData.patientId || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Age & Gender</label>
                <p className="text-lg">{`${patientData.age} years, ${patientData.gender || 'N/A'}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {patientData.dateOfBirth ? new Date(patientData.dateOfBirth).toLocaleDateString("IN") : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Blood Group</label>
                <p className="text-lg">{patientData.bloodGroup || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mr-2">Registration Type</label>
                <Badge variant={patientData.registrationType === 'ipd' ? 'default' : patientData.registrationType === 'emergency' ? 'destructive' : 'secondary'}>
                  {patientData.registrationType?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {patientData.phone || patientData.contactNumber || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {patientData.email || 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {patientData.address || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {patientData.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{patientData.emergencyContact.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                  <p className="text-lg">{patientData.emergencyContact.relationship || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-lg flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {patientData.emergencyContact.phone || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Diagnosis</label>
                <p className="text-lg">{patientData.diagnosis || 'N/A'}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Medical History</label>
                {patientData.medicalHistory && patientData.medicalHistory.length > 0 ? (
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {patientData.medicalHistory.map((history, index) => (
                      <li key={index} className="text-sm">
                        <strong>{history.condition}</strong> - Diagnosed: {history.diagnosedDate ? new Date(history.diagnosedDate).toLocaleDateString() : 'N/A'}
                        {history.notes && <span> ({history.notes})</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No medical history recorded</p>
                )}
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Allergies</label>
                {patientData.allergies && patientData.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {patientData.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No allergies recorded</p>
                )}
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Medications</label>
                {patientData.currentMedications && patientData.currentMedications.length > 0 ? (
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {patientData.currentMedications.map((med, index) => (
                      <li key={index} className="text-sm">
                        <strong>{med.name}</strong> - {med.dosage}, {med.frequency}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No current medications</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          {patientData.insuranceInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Provider</label>
                  <p className="text-lg">{patientData.insuranceInfo.provider || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Policy Number</label>
                  <p className="text-lg">{patientData.insuranceInfo.policyNumber || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Valid Till</label>
                  <p className="text-lg">{patientData.insuranceInfo.validTill ? new Date(patientData.insuranceInfo.validTill).toLocaleDateString() : 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status and Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Assignments</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mr-2">Status</label>
                <Badge variant={patientData.status === 'active' ? 'default' : 'secondary'}>
                  {patientData.status?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mr-2">Admission Status</label>
                <Badge variant={patientData.admissionStatus === 'ADMITTED' ? 'default' : 'secondary'}>
                  {patientData.admissionStatus || 'DISCHARGED'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Doctor</label>
                {assignedDoctorName || assignedDoctorId ? (
                  <div className="text-lg">
                    <div className="font-semibold">{assignedDoctorName || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{assignedDoctorId || "N/A"}</div>
                  </div>
                ) : (
                  <p className="text-lg">N/A</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Bed</label>
                {assignedBedName || assignedBedId ? (
                  <div className="text-lg">
                    <div className="font-semibold">{assignedBedName || "Unknown bed"}</div>
                    <div className="text-xs text-muted-foreground">{assignedBedId || "N/A"}</div>
                  </div>
                ) : (
                  <p className="text-lg">N/A</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Nurses</label>
                <div className="text-lg">
                  {patientData.assignedNurses && patientData.assignedNurses.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {patientData.assignedNurses.map((n, idx) => {
                        const id = n?._id || n;
                        const nurse = nursesById.get(id);
                        const label = nurse
                          ? `${nurse.firstName || ""} ${nurse.lastName || ""}`.trim()
                          : (n && (n.firstName || n.lastName))
                            ? `${n.firstName || ""} ${n.lastName || ""}`.trim()
                            : id;
                        return (
                          <div key={idx} className="text-sm">
                            <div className="font-semibold">{label || "Nurse"}</div>
                            <div className="text-xs text-muted-foreground">{id}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No nurses assigned</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Nurse</label>
                {patientData.primaryNurse ? (() => {
                  const id = patientData.primaryNurse?._id || patientData.primaryNurse;
                  const nurse = nursesById.get(id);
                  const label = nurse
                    ? `${nurse.firstName || ""} ${nurse.lastName || ""}`.trim()
                    : (patientData.primaryNurse.firstName || patientData.primaryNurse.lastName)
                      ? `${patientData.primaryNurse.firstName || ""} ${patientData.primaryNurse.lastName || ""}`.trim()
                      : id;
                  return (
                    <div className="text-lg">
                      <div className="font-semibold">{label || "Nurse"}</div>
                      <div className="text-xs text-muted-foreground">{id}</div>
                    </div>
                  );
                })() : (
                  <p className="text-lg">N/A</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="vitals" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="vitals">Vitals</TabsTrigger>
                  <TabsTrigger value="monitor">Monitor</TabsTrigger>
                  <TabsTrigger value="meds">Meds</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Heart Rate</p>
                        <p className="text-lg font-semibold">{latestVital?.heartRate?.value ?? "—"} bpm</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Blood Pressure</p>
                        <p className="text-lg font-semibold">
                          {latestVital?.bloodPressure?.systolic ?? "—"}/{latestVital?.bloodPressure?.diastolic ?? "—"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Temperature</p>
                        <p className="text-lg font-semibold">{latestVital?.temperature?.value ?? "—"} °F</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">SpO2</p>
                        <p className="text-lg font-semibold">{latestVital?.oxygenSaturation?.value ?? "—"}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recorded</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>BP</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>SpO2</TableHead>
                        <TableHead>RR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vitals.length > 0 ? (
                        vitals.map((v) => (
                          <TableRow key={v._id}>
                            <TableCell>{v.recordedAt ? new Date(v.recordedAt).toLocaleString() : "—"}</TableCell>
                            <TableCell>{v.heartRate?.value ?? "—"}</TableCell>
                            <TableCell>{v.bloodPressure?.systolic ?? "—"}/{v.bloodPressure?.diastolic ?? "—"}</TableCell>
                            <TableCell>{v.temperature?.value ?? "—"}</TableCell>
                            <TableCell>{v.oxygenSaturation?.value ?? "—"}</TableCell>
                            <TableCell>{v.respiratoryRate?.value ?? "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                            No vitals recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="monitor" className="mt-4">
                  {trends.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString()} />
                          <YAxis />
                          <Tooltip labelFormatter={(t) => new Date(t).toLocaleString()} />
                          <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="oxygenSaturation" stroke="#22c55e" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="temperature" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
                  )}
                </TabsContent>

                <TabsContent value="meds" className="mt-4">
                  {(patientData.currentMedications || []).length > 0 ? (
                    <div className="space-y-2">
                      {patientData.currentMedications.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Pill className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.dosage} • {m.frequency}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No medications prescribed</p>
                  )}
                </TabsContent>

                <TabsContent value="schedule" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.length > 0 ? (
                        appointments.map((a) => (
                          <TableRow key={a._id}>
                            <TableCell>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleString() : "—"}</TableCell>
                            <TableCell>{a.doctor?.user?.firstName ? `${a.doctor.user.firstName} ${a.doctor.user.lastName}` : a.doctor?.name || "—"}</TableCell>
                            <TableCell>{a.type || "—"}</TableCell>
                            <TableCell>{a.status || "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                            No schedule entries
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  {patientData.medicalHistory && patientData.medicalHistory.length > 0 ? (
                    <div className="space-y-2">
                      {patientData.medicalHistory.map((h, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="font-medium">{h.condition || "Note"}</div>
                          <div className="text-xs text-muted-foreground">
                            {h.diagnosedDate ? new Date(h.diagnosedDate).toLocaleDateString() : "—"}
                          </div>
                          {h.notes && <div className="text-sm mt-2">{h.notes}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No notes recorded</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPatientDialog;

