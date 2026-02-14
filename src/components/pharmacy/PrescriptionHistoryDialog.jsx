import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPrescriptions } from "@/lib/pharmacy";
import { downloadPrescriptionPdf, printPrescription } from "@/lib/prescription-export";
import { MoreVertical, FileText, Download, Printer, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PrescriptionHistoryDialog({
  open,
  onOpenChange,
  patient,
  appointmentId = "",
  appointmentStatus = "",
  onCreateNew,
  showCreate = true,
  fetchPrescriptions,
}) {
  const navigate = useNavigate();
  const patientId = patient?._id;

  const { data: rxRes, isLoading } = useQuery({
    queryKey: ["prescriptions", "patient", patientId],
    queryFn: () => (fetchPrescriptions
      ? fetchPrescriptions(patientId)
      : getPrescriptions({ patientId, limit: 200 })),
    enabled: open && !!patientId,
  });

  const prescriptions = useMemo(() => {
    const rows = Array.isArray(rxRes) ? rxRes : rxRes?.data || [];
    return [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rxRes]);

  const currentAppointmentPrescription = useMemo(() => {
    if (appointmentId) {
      const linked = prescriptions.find((rx) => {
        const appt = rx?.appointment?._id || rx?.appointment;
        return String(appt || "") === String(appointmentId);
      });
      if (linked) return linked;
    }
    if (appointmentStatus === "completed") return prescriptions[0] || null;
    return null;
  }, [prescriptions, appointmentId, appointmentStatus]);

  const previousPrescriptions = useMemo(() => {
    if (!currentAppointmentPrescription?._id) return prescriptions;
    return prescriptions.filter((rx) => String(rx?._id || "") !== String(currentAppointmentPrescription._id));
  }, [prescriptions, currentAppointmentPrescription?._id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Prescriptions - {patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "Patient"}
          </DialogTitle>
        </DialogHeader>

        {showCreate && (
          <div className="flex justify-end">
            <Button onClick={onCreateNew} disabled={!!currentAppointmentPrescription || appointmentStatus === "completed"}>
              <Plus className="mr-2 h-4 w-4" />
              {appointmentStatus === "completed" || currentAppointmentPrescription ? "Use Current Prescription" : "New Prescription"}
            </Button>
          </div>
        )}

        <div className="space-y-2 mt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading prescriptions...</p>
          ) : prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions found for this patient.</p>
          ) : (
            <div className="space-y-3">
              {appointmentId && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary mb-2">Current Appointment Prescription</p>
                  {currentAppointmentPrescription ? (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {new Date(currentAppointmentPrescription.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(currentAppointmentPrescription.items || []).length} medicines
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {(currentAppointmentPrescription.encounterType || "opd").toUpperCase()}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/prescriptions/${currentAppointmentPrescription._id}/preview`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Prescription
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadPrescriptionPdf(currentAppointmentPrescription)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printPrescription(currentAppointmentPrescription)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No prescription has been created yet for this appointment.</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Previous Prescriptions</p>
                {previousPrescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous prescriptions found.</p>
                ) : (
                  previousPrescriptions.map((rx) => (
                    <div key={rx._id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {new Date(rx.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(rx.items || []).length} medicines
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {(rx.encounterType || "opd").toUpperCase()}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/prescriptions/${rx._id}/preview`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Prescription
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadPrescriptionPdf(rx)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printPrescription(rx)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
