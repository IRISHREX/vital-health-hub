import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { createMedicine, updateMedicine } from "@/lib/pharmacy";
import { toast } from "sonner";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { getValidationInputClass } from "@/lib/validationPreferences";

const categories = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'powder', 'other'];
const NONE_SCHEDULE = "__none__";

export default function AddMedicineDialog({ open, onOpenChange, medicine }) {
  const { shouldShowValidation } = useValidationPreferences();
  const qc = useQueryClient();
  const isEdit = !!medicine;
  const formId = "medicine_dialog";
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '', genericName: '', composition: '', category: 'tablet',
    manufacturer: '', batchNumber: '', expiryDate: '',
    mrp: '', sellingPrice: '', purchasePrice: '', stock: '',
    reorderLevel: '10', unit: 'pcs', rackLocation: '', hsnCode: '',
    gstPercent: '12', schedule: ''
  });

  useEffect(() => {
    if (medicine) {
      setForm({
        name: medicine.name || '', genericName: medicine.genericName || '',
        composition: medicine.composition || '', category: medicine.category || 'tablet',
        manufacturer: medicine.manufacturer || '', batchNumber: medicine.batchNumber || '',
        expiryDate: medicine.expiryDate ? medicine.expiryDate.slice(0, 10) : '',
        mrp: String(medicine.mrp || ''), sellingPrice: String(medicine.sellingPrice || ''),
        purchasePrice: String(medicine.purchasePrice || ''), stock: String(medicine.stock || ''),
        reorderLevel: String(medicine.reorderLevel || '10'), unit: medicine.unit || 'pcs',
        rackLocation: medicine.rackLocation || '', hsnCode: medicine.hsnCode || '',
        gstPercent: String(medicine.gstPercent || '12'), schedule: medicine.schedule || NONE_SCHEDULE
      });
    } else {
      setForm({ name: '', genericName: '', composition: '', category: 'tablet', manufacturer: '', batchNumber: '', expiryDate: '', mrp: '', sellingPrice: '', purchasePrice: '', stock: '', reorderLevel: '10', unit: 'pcs', rackLocation: '', hsnCode: '', gstPercent: '12', schedule: NONE_SCHEDULE });
    }
    setErrors({});
  }, [medicine, open]);

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: typeof e === 'string' ? e : e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!form.name) nextErrors.name = "Name is required";
    if (!form.mrp) nextErrors.mrp = "MRP is required";
    if (!form.sellingPrice) nextErrors.sellingPrice = "Selling price is required";
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error(Object.values(nextErrors).find(Boolean));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        mrp: +form.mrp, sellingPrice: +form.sellingPrice, purchasePrice: +form.purchasePrice || 0,
        stock: +form.stock || 0, reorderLevel: +form.reorderLevel || 10, gstPercent: +form.gstPercent || 12,
        expiryDate: form.expiryDate || undefined,
        schedule: form.schedule === NONE_SCHEDULE ? undefined : form.schedule
      };
      if (isEdit) await updateMedicine(medicine._id, payload);
      else await createMedicine(payload);
      toast.success(isEdit ? "Medicine updated" : "Medicine added");
      setErrors({});
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Medicine" : "Add Medicine"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={set('name')} className={getValidationInputClass(shouldShowValidation(formId, "name"), errors.name)} />
            {shouldShowValidation(formId, "name") && errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
          </div>
          <div><Label>Generic Name</Label><Input value={form.genericName} onChange={set('genericName')} /></div>
          <div><Label>Composition</Label><Input value={form.composition} onChange={set('composition')} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={set('category')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={set('manufacturer')} /></div>
          <div><Label>Batch Number</Label><Input value={form.batchNumber} onChange={set('batchNumber')} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={set('expiryDate')} /></div>
          <div>
            <Label>MRP (₹) *</Label>
            <Input type="number" value={form.mrp} onChange={set('mrp')} className={getValidationInputClass(shouldShowValidation(formId, "mrp"), errors.mrp)} />
            {shouldShowValidation(formId, "mrp") && errors.mrp && <p className="mt-1 text-sm text-destructive">{errors.mrp}</p>}
          </div>
          <div>
            <Label>Selling Price (₹) *</Label>
            <Input type="number" value={form.sellingPrice} onChange={set('sellingPrice')} className={getValidationInputClass(shouldShowValidation(formId, "sellingPrice"), errors.sellingPrice)} />
            {shouldShowValidation(formId, "sellingPrice") && errors.sellingPrice && <p className="mt-1 text-sm text-destructive">{errors.sellingPrice}</p>}
          </div>
          <div><Label>Purchase Price (₹)</Label><Input type="number" value={form.purchasePrice} onChange={set('purchasePrice')} /></div>
          <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={set('stock')} /></div>
          <div><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={set('reorderLevel')} /></div>
          <div><Label>Unit</Label><Input value={form.unit} onChange={set('unit')} /></div>
          <div><Label>Rack Location</Label><Input value={form.rackLocation} onChange={set('rackLocation')} /></div>
          <div><Label>HSN Code</Label><Input value={form.hsnCode} onChange={set('hsnCode')} /></div>
          <div><Label>GST %</Label><Input type="number" value={form.gstPercent} onChange={set('gstPercent')} /></div>
          <div>
            <Label>Schedule</Label>
            <Select value={form.schedule} onValueChange={set('schedule')}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SCHEDULE}>None</SelectItem>
                <SelectItem value="H">H</SelectItem>
                <SelectItem value="H1">H1</SelectItem>
                <SelectItem value="X">X</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving…" : isEdit ? "Update" : "Add Medicine"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
