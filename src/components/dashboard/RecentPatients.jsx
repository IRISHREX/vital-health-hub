import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function RecentPatients() {
  const { data: patientsRes, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients", "recent-dashboard"],
    queryFn: getPatients
  });
  const { data: doctorsRes } = useQuery({
    queryKey: ["doctors", "recent-dashboard"],
    queryFn: getDoctors
  });

  const patients = Array.isArray(patientsRes?.data?.patients) ? patientsRes.data.patients : [];
  const doctors = Array.isArray(doctorsRes?.data?.doctors) ? doctorsRes.data.doctors : [];

  const recentPatients = useMemo(
    () =>
      [...patients]
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
        .slice(0, 5),
    [patients]
  );

  const getPatientName = (patient) => {
    const full = `${patient?.firstName || ""} ${patient?.lastName || ""}`.trim();
    return full || "Unknown Patient";
  };

  const getInitials = (patient) =>
    getPatientName(patient)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "PT";

  const getDoctorName = (assignedDoctor) => {
    if (!assignedDoctor) return "Not assigned";
    if (typeof assignedDoctor === "object") {
      const userFull = `${assignedDoctor?.user?.firstName || ""} ${assignedDoctor?.user?.lastName || ""}`.trim();
      const directFull = `${assignedDoctor?.firstName || ""} ${assignedDoctor?.lastName || ""}`.trim();
      return assignedDoctor?.name || userFull || directFull || "Not assigned";
    }
    const doctor = doctors.find((d) => d?._id === assignedDoctor);
    if (!doctor) return "Not assigned";
    const userFull = `${doctor?.user?.firstName || ""} ${doctor?.user?.lastName || ""}`.trim();
    const directFull = `${doctor?.firstName || ""} ${doctor?.lastName || ""}`.trim();
    return doctor?.name || userFull || directFull || "Not assigned";
  };

  const getDiagnosis = (patient) =>
    patient?.diagnosis || patient?.medicalHistory?.[0]?.condition || "General Checkup";

  const getCareType = (patient) => (String(patient?.registrationType || "opd").toUpperCase());

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Recent Patients
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest registered patients
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/patients" className="flex items-center gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {patientsLoading && (
          <div className="flex items-center justify-center rounded-lg border bg-background/50 p-6 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recent patients...
          </div>
        )}
        {!patientsLoading && recentPatients.length === 0 && (
          <div className="rounded-lg border bg-background/50 p-6 text-sm text-muted-foreground">
            No recent patients found.
          </div>
        )}
        {recentPatients.map((patient) => (
          <div
            key={patient._id || patient.patientId}
            className="flex items-center justify-between rounded-lg border bg-background/50 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(patient)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{getPatientName(patient)}</p>
                <p className="text-sm text-muted-foreground">
                  {getDiagnosis(patient)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium text-foreground">
                  {getDoctorName(patient.assignedDoctor)}
                </p>
                <p className="text-xs text-muted-foreground">Attending Doctor</p>
              </div>
              <Badge variant={getCareType(patient) === "IPD" ? "default" : "secondary"}>
                {getCareType(patient)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
