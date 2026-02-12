import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMedicines, createPrescription } from "@/lib/pharmacy";
import { getPatients } from "@/lib/patients";
import { getDoctors } from "@/lib/doctors";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const emptyItem = { medicine: '', medicineName: '', dosage: '', frequency: 'TID', duration: '5 days', route: 'oral', quantity: 1, instructions: '' };

export default function PrescriptionDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);

  const { data: patientsData } = useQuery({ queryKey: ['patients'], queryFn: () => getPatients(), enabled: open });
  const { data: doctorsData } = useQuery({ queryKey: ['doctors'], queryFn: () => getDoctors(), enabled: open });
  const { data: medsData } = useQuery({ queryKey: ['medicines-all'], queryFn: () => getMedicines({ limit: 500 }), enabled: open });

  const patients = Array.isArray(patientsData) ? patientsData : patientsData?.data || [];
  const doctors = Array.isArray(doctorsData) ? doctorsData : doctorsData?.data || [];
  const medicines = Array.isArray(medsData) ? medsData : medsData?.data || [];

  const addItem = () => setItems(p => [...p, { ...emptyItem }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(p => p.map((item, idx) => {
    if (idx !== i) return item;
    const updated = { ...item, [field]: val };
    if (field === 'medicine') {
      const med = medicines.find(m => m._id === val);
      if (med) updated.medicineName = med.name;
    }
    return updated;
  }));

  const handleSubmit = async () => {
    if (!patientId || !doctorId || items.length === 0) { toast.error("Patient, doctor and at least 1 item required"); return; }
    setLoading(true);
    try {
      await createPrescription({ patient: patientId, doctor: doctorId, notes, items: items.map(it => ({ ...it, quantity: +it.quantity })) });
      toast.success("Prescription created");
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      onOpenChange(false);
      setPatientId(''); setDoctorId(''); setNotes(''); setItems([{ ...emptyItem }]);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Prescription</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Doctor *</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>{doctors.map(d => <SelectItem key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Medicines</Label>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item #{i + 1}</span>
                {items.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Medicine</Label>
                  <Select value={item.medicine} onValueChange={v => updateItem(i, 'medicine', v)}>
                    <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                    <SelectContent>{medicines.map(m => <SelectItem key={m._id} value={m._id}>{m.name} ({m.composition || m.category})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Dosage</Label><Input placeholder="500mg" value={item.dosage} onChange={e => updateItem(i, 'dosage', e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Select value={item.frequency} onValueChange={v => updateItem(i, 'frequency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OD">OD (Once daily)</SelectItem>
                      <SelectItem value="BD">BD (Twice daily)</SelectItem>
                      <SelectItem value="TID">TID (Thrice daily)</SelectItem>
                      <SelectItem value="QID">QID (Four times)</SelectItem>
                      <SelectItem value="SOS">SOS (As needed)</SelectItem>
                      <SelectItem value="STAT">STAT (Immediately)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Duration</Label><Input placeholder="5 days" value={item.duration} onChange={e => updateItem(i, 'duration', e.target.value)} /></div>
                <div><Label className="text-xs">Quantity</Label><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Instructions</Label><Input placeholder="After food" value={item.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)} /></div>
            </div>
          ))}
        </div>

        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Prescription"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
