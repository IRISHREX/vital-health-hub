import { mockPatients, mockDoctors } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function RecentPatients() {
  const recentPatients = mockPatients.slice(0, 5);

  const getDoctorName = (doctorId) => {
    if (!doctorId) return "Not assigned";
    const doctor = mockDoctors.find((d) => d.id === doctorId);
    return doctor?.name || "Not assigned";
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Recent Patients
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest admitted patients
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
        {recentPatients.map((patient) => (
          <div
            key={patient.id}
            className="flex items-center justify-between rounded-lg border bg-background/50 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {patient.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-sm text-muted-foreground">
                  {patient.diagnosis || "General Checkup"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium text-foreground">
                  {getDoctorName(patient.doctorId)}
                </p>
                <p className="text-xs text-muted-foreground">Attending Doctor</p>
              </div>
              <Badge variant={patient.type === "IPD" ? "default" : "secondary"}>
                {patient.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
