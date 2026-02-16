import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDoctors } from "@/lib/doctors";
import { getAdmissions } from "@/lib/admissions";
import { getPatients } from "@/lib/patients";
import { createSurgery } from "@/lib/ot";
import { toast } from "sonner";

export default function CreateSurgeryDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    patient: "", primarySurgeon: "", anesthetist: "",
    procedureName: "", procedureType: "major", urgency: "elective",
    diagnosis: "", bodyPart: "", laterality: "na",
    estimatedDuration: 60, anesthesiaType: "general",
    surgeonFee: "", anesthetistFee: "", otRoomCharges: "",
    notes: ""
  });

  const { data: admissionsRes } = useQuery({
    queryKey: ["admissions", "admitted", "ot-request"],
    queryFn: () => getAdmissions({ status: "ADMITTED", limit: 500 }),
    enabled: open
  });
  const { data: doctorsRes } = useQuery({ queryKey: ["doctors"], queryFn: () => getDoctors(), enabled: open });
  const { data: patientsRes } = useQuery({ queryKey: ["patients"], queryFn: () => getPatients(), enabled: open });
  const admissions = admissionsRes?.data?.admissions || admissionsRes?.admissions || [];
  const allPatients = patientsRes?.data?.patients || [];
  const admittedPatients = Array.from(
    new Map(
      (Array.isArray(admissions) ? admissions : [])
        .map((a) => {
          const patientObj = typeof a?.patient === "object"
            ? a.patient
            : allPatients.find((p) => p?._id === a?.patient);
          const patientId = patientObj?._id || (typeof a?.patient === "string" ? a.patient : null);
          return patientId ? [patientId, patientObj || { _id: patientId, firstName: "Patient", lastName: "", patientId: "" }] : null;
        })
        .filter(Boolean)
    ).values()
  );
  const doctors = doctorsRes?.data?.doctors || doctorsRes?.doctors || doctorsRes?.data || doctorsRes || [];

  const doctorLabel = (doctor) => {
    if (!doctor) return "Doctor";
    const name = doctor.name || `${doctor?.user?.firstName || ""} ${doctor?.user?.lastName || ""}`.trim();
    const specialization = doctor.specialization ? ` - ${doctor.specialization}` : "";
    return `${name || "Doctor"}${specialization}`;
  };

  const mutation = useMutation({
    mutationFn: (data) => createSurgery(data),
    onSuccess: () => {
      toast.success("Surgery request created");
      queryClient.invalidateQueries({ queryKey: ["surgeries"] });
      queryClient.invalidateQueries({ queryKey: ["ot-stats"] });
      onOpenChange(false);
      setForm({ patient: "", primarySurgeon: "", anesthetist: "", procedureName: "", procedureType: "major", urgency: "elective", diagnosis: "", bodyPart: "", laterality: "na", estimatedDuration: 60, anesthesiaType: "general", surgeonFee: "", anesthetistFee: "", otRoomCharges: "", notes: "" });
    },
    onError: (err) => toast.error(err?.response?.data?.message || "Failed to create surgery")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.patient || !form.procedureName || !form.primarySurgeon) {
      toast.error("Patient, procedure name, and surgeon are required");
      return;
    }
    mutation.mutate({
      ...form,
      estimatedDuration: Number(form.estimatedDuration),
      surgeonFee: Number(form.surgeonFee) || 0,
      anesthetistFee: Number(form.anesthetistFee) || 0,
      otRoomCharges: Number(form.otRoomCharges) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Surgery Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
                <Select value={form.patient} onValueChange={(v) => setForm({ ...form, patient: v })}>
                <SelectTrigger><SelectValue placeholder="Select admitted patient" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(admittedPatients) ? admittedPatients : []).map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                  ))}
                  {(!admittedPatients || admittedPatients.length === 0) && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No admitted patients found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Procedure Name *</Label>
              <Input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} placeholder="e.g. Appendectomy" />
            </div>
            <div className="space-y-2">
              <Label>Primary Surgeon *</Label>
              <Select value={form.primarySurgeon} onValueChange={(v) => setForm({ ...form, primarySurgeon: v })}>
                <SelectTrigger><SelectValue placeholder="Select surgeon" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(doctors) ? doctors : []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>{doctorLabel(d)}</SelectItem>
                  ))}
                  {(!doctors || doctors.length === 0) && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No doctors found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anesthetist</Label>
              <Select value={form.anesthetist} onValueChange={(v) => setForm({ ...form, anesthetist: v })}>
                <SelectTrigger><SelectValue placeholder="Select anesthetist" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(doctors) ? doctors : []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>{doctorLabel(d)}</SelectItem>
                  ))}
                  {(!doctors || doctors.length === 0) && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No doctors found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Procedure Type</Label>
              <Select value={form.procedureType} onValueChange={(v) => setForm({ ...form, procedureType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="day_care">Day Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elective">Elective</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Body Part</Label>
              <Input value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} placeholder="e.g. Abdomen" />
            </div>
            <div className="space-y-2">
              <Label>Laterality</Label>
              <Select value={form.laterality} onValueChange={(v) => setForm({ ...form, laterality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="na">N/A</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anesthesia Type</Label>
              <Select value={form.anesthesiaType} onValueChange={(v) => setForm({ ...form, anesthesiaType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['general', 'spinal', 'epidural', 'local', 'regional', 'sedation', 'combined'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Est. Duration (min)</Label>
              <Input type="number" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Surgeon Fee (₹)</Label>
              <Input type="number" value={form.surgeonFee} onChange={(e) => setForm({ ...form, surgeonFee: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Anesthetist Fee (₹)</Label>
              <Input type="number" value={form.anesthetistFee} onChange={(e) => setForm({ ...form, anesthetistFee: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>OT Room Charges (₹)</Label>
              <Input type="number" value={form.otRoomCharges} onChange={(e) => setForm({ ...form, otRoomCharges: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
