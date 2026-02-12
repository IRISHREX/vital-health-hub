import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { dispensePrescription } from "@/lib/pharmacy";
import { toast } from "sonner";

export default function DispenseDialog({ open, onOpenChange, prescription }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState({});

  if (!prescription) return null;
  const items = prescription.items || [];

  const handleDispense = async () => {
    const dispenseItems = items
      .filter(it => !it.dispensed && (quantities[it._id] || 0) > 0)
      .map(it => ({ itemId: it._id, dispensedQty: +quantities[it._id] }));

    if (dispenseItems.length === 0) { toast.error("No items to dispense"); return; }
    setLoading(true);
    try {
      await dispensePrescription(prescription._id, dispenseItems);
      toast.success("Medicines dispensed");
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-stats'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-invoices'] });
      onOpenChange(false);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const patientName = prescription.patient ? `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim() : 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dispense Medicines</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Patient: <span className="font-semibold text-foreground">{patientName}</span></p>
        <div className="space-y-3 mt-2">
          {items.map(item => {
            const medName = item.medicineName || item.medicine?.name || 'Unknown';
            const stock = item.medicine?.stock ?? '?';
            return (
              <div key={item._id} className="flex items-center gap-3 border rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{medName}</p>
                  <p className="text-xs text-muted-foreground">{item.dosage} · {item.frequency} · {item.duration}</p>
                  <p className="text-xs">Prescribed: {item.quantity} | Stock: {stock}</p>
                </div>
                {item.dispensed ? (
                  <Badge variant="success" className="text-xs">Dispensed</Badge>
                ) : (
                  <Input
                    type="number" min="0" max={Math.min(item.quantity, stock)}
                    className="w-20" placeholder="Qty"
                    value={quantities[item._id] || ''}
                    onChange={e => setQuantities(p => ({ ...p, [item._id]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDispense} disabled={loading}>{loading ? "Dispensing…" : "Dispense"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
