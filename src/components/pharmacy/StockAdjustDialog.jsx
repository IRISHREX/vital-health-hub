import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { adjustStock } from "@/lib/pharmacy";
import { toast } from "sonner";

const types = [
  { value: 'purchase', label: 'Purchase (Add)' },
  { value: 'return', label: 'Return (Add)' },
  { value: 'expired', label: 'Expired (Remove)' },
  { value: 'damaged', label: 'Damaged (Remove)' },
  { value: 'adjustment', label: 'Manual Adjustment (Add)' },
];

export default function StockAdjustDialog({ open, onOpenChange, medicine }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: 'purchase', quantity: '', reason: '', reference: '' });

  const handleSubmit = async () => {
    if (!form.quantity || +form.quantity <= 0) { toast.error("Enter valid quantity"); return; }
    setLoading(true);
    try {
      await adjustStock({ medicineId: medicine._id, ...form, quantity: +form.quantity });
      toast.success("Stock adjusted");
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      qc.invalidateQueries({ queryKey: ['stock-history'] });
      onOpenChange(false);
      setForm({ type: 'purchase', quantity: '', reason: '', reference: '' });
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjust Stock — {medicine?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Current stock: <span className="font-bold">{medicine?.stock} {medicine?.unit}</span></p>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
          <div><Label>Reference (Invoice/PO)</Label><Input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
          <div><Label>Reason</Label><Textarea rows={2} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving…" : "Adjust Stock"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
