import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createRadiologyOrder } from "@/lib/radiology";
import { Loader2 } from "lucide-react";

const studyTypes = [
  { value: "xray", label: "X-Ray" },
  { value: "ct_scan", label: "CT Scan" },
  { value: "mri", label: "MRI" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "mammography", label: "Mammography" },
  { value: "fluoroscopy", label: "Fluoroscopy" },
  { value: "pet_scan", label: "PET Scan" },
  { value: "dexa", label: "DEXA Scan" },
  { value: "angiography", label: "Angiography" },
  { value: "other", label: "Other" },
];

export default function OrderRadiologyDialog({ isOpen, onClose, patients = [], doctors = [] }) {
  const [form, setForm] = useState({
    patient: "", doctor: "", studyType: "xray", bodyPart: "", studyName: "",
    priority: "routine", clinicalHistory: "", indication: "", price: "", discount: "", contrastUsed: false, notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.patient || !form.studyName || !form.bodyPart) {
      toast.error("Patient, study name and body part are required");
      return;
    }
    try {
      setSubmitting(true);
      const price = Number(form.price || 0);
      const discount = Number(form.discount || 0);
      await createRadiologyOrder({
        ...form,
        price,
        discount,
        totalAmount: Math.max(0, price - discount),
      });
      toast.success("Radiology order created");
      setForm({ patient: "", doctor: "", studyType: "xray", bodyPart: "", studyName: "", priority: "routine", clinicalHistory: "", indication: "", price: "", discount: "", contrastUsed: false, notes: "" });
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Radiology Study</DialogTitle>
          <DialogDescription>Create a new radiology imaging order for a patient.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={form.patient} onValueChange={(v) => update("patient", v)}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referring Doctor</Label>
              <Select value={form.doctor} onValueChange={(v) => update("doctor", v)}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Study Type *</Label>
              <Select value={form.studyType} onValueChange={(v) => update("studyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {studyTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Study Name *</Label>
              <Input placeholder="e.g. Chest PA View" value={form.studyName} onChange={(e) => update("studyName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body Part *</Label>
              <Input placeholder="e.g. Chest, Abdomen" value={form.bodyPart} onChange={(e) => update("bodyPart", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Clinical History</Label>
            <Textarea placeholder="Brief clinical history..." value={form.clinicalHistory} onChange={(e) => update("clinicalHistory", e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Indication</Label>
            <Input placeholder="Reason for study" value={form.indication} onChange={(e) => update("indication", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" placeholder="0" value={form.price} onChange={(e) => update("price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" min="0" placeholder="0" value={form.discount} onChange={(e) => update("discount", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Additional notes..." value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Order Study
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
