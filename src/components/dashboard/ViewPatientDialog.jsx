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
import { Calendar, Phone, Mail, MapPin, User, Heart, Pill, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNurses } from "@/lib/users";
import { getPatientById } from "@/lib/patients";

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
                <p className="text-lg">{patientData.assignedDoctor || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Bed</label>
                <p className="text-lg">{patientData.assignedBed || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Nurses</label>
                <div className="text-lg">
                  {patientData.assignedNurses && patientData.assignedNurses.length > 0 ? (
                    <ul className="list-disc list-inside mt-2">
                      {patientData.assignedNurses.map((n, idx) => {
                        const id = n?._id || n;
                        const nurse = nursesById.get(id);
                        const label = nurse
                          ? `${nurse.firstName || ""} ${nurse.lastName || ""}`.trim()
                          : (n && (n.firstName || n.lastName))
                            ? `${n.firstName || ""} ${n.lastName || ""}`.trim()
                            : id;
                        return (
                          <li key={idx} className="text-sm">
                            {label || "Nurse"}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No nurses assigned</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Primary Nurse</label>
                <p className="text-lg">{patientData.primaryNurse ? ((patientData.primaryNurse.firstName || patientData.primaryNurse.lastName) ? `${patientData.primaryNurse.firstName || ''} ${patientData.primaryNurse.lastName || ''}` : patientData.primaryNurse) : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPatientDialog;

