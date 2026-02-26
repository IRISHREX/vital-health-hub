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
import { Calendar, Clock, User, Stethoscope, FileText } from "lucide-react";

const statusConfig = {
  scheduled: { label: "Pending", variant: "info" },
  confirmed: { label: "Pending", variant: "info" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  no_show: { label: "No Show", variant: "destructive" },
};

const ViewAppointmentDialog = ({ isOpen, onClose, appointment }) => {
  if (!appointment) return null;

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const getPatientName = (patientRef) => {
    if (!patientRef) return "Unknown";
    if (typeof patientRef === "object") {
      const p = patientRef;
      if (p.firstName || p.lastName) return `${p.firstName || ""} ${p.lastName || ""}`.trim();
      return p.name || "Unknown";
    }
    return "Unknown";
  };

  const getDoctorName = (doctorRef) => {
    if (!doctorRef) return "Unknown";
    if (typeof doctorRef === "object") {
      const d = doctorRef;
      if (d.user) return `${d.user.firstName || ""} ${d.user.lastName || ""}`.trim() || d.name || "Unknown";
      return d.name || "Unknown";
    }
    return "Unknown";
  };

  const patientName = getPatientName(appointment.patient || appointment.patientName);
  const doctorName = getDoctorName(appointment.doctor);
  const appointmentDateTime = new Date(appointment.appointmentDate);
  const appointmentDate = appointmentDateTime.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const appointmentTime = appointmentDateTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Appointment Status */}
          <div className="flex items-center justify-center">
            {statusConfig[appointment.status] && (
              <Badge
                variant={statusConfig[appointment.status].variant}
                className="px-4 py-2 text-base"
              >
                {statusConfig[appointment.status].label}
              </Badge>
            )}
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Appointment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Appointment ID
                  </label>
                  <p className="text-lg font-semibold">{appointment.appointmentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <p className="text-lg font-semibold capitalize">
                    {appointment.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Reason for Visit
                  </label>
                  <p className="text-lg font-semibold">{appointment.reason || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Notes
                  </label>
                  <p className="text-lg font-semibold">{appointment.notes || "N/A"}</p>
                </div>
              </div>
              {appointment.symptoms && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Symptoms
                    </label>
                    <p className="text-lg">{appointment.symptoms}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Date and Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Date
                </label>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {appointmentDate}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Time
                </label>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {appointmentTime}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {patientName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Patient Name
                  </p>
                  <p className="text-lg font-semibold">{patientName}</p>
                </div>
              </div>
              {appointment.patient && typeof appointment.patient === "object" && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Age
                      </label>
                      <p className="text-lg">
                        {appointment.patient.age || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Gender
                      </label>
                      <p className="text-lg">
                        {appointment.patient.gender || "N/A"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Contact Number
                      </label>
                      <p className="text-lg">
                        {appointment.patient.phone ||
                          appointment.patient.contactNumber ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {doctorName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Doctor Name
                  </p>
                  <p className="text-lg font-semibold">{doctorName}</p>
                </div>
              </div>
              {appointment.doctor &&
                typeof appointment.doctor === "object" &&
                appointment.doctor.specialization && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mr-2">
                        Specialization
                      </label>
                      <Badge variant="secondary">
                        {appointment.doctor.specialization}
                      </Badge>
                    </div>
                  </>
                )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          {(appointment.type ||
            appointment.priority) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointment.type && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mr-2">
                      Appointment Type
                    </label>
                    <Badge variant="outline">{appointment.type?.toUpperCase()}</Badge>
                  </div>
                )}
                {appointment.priority && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mr-2">
                      Priority
                    </label>
                    <Badge variant="outline">{appointment.priority}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAppointmentDialog;
