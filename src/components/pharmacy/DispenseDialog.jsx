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

  const getStock = (item) => {
    if (typeof item?.medicine?.stock === "number") return item.medicine.stock;
    return null; // unknown / no medicine linked
  };

  const handleDispense = async () => {
    const dispenseItems = [];
    for (const it of items) {
      if (it.dispensed) continue;
      if (!it.medicine) continue; // can't dispense unlinked medicine
      const requested = Number(quantities[it._id] || 0);
      if (requested <= 0) continue;
      const stock = getStock(it) ?? 0;
      const max = Math.min(Number(it.quantity || 0), stock);
      if (requested > max) {
        toast.error(`"${it.medicineName}": cannot dispense ${requested}. Max allowed is ${max} (Prescribed ${it.quantity}, Stock ${stock}).`);
        return;
      }
      dispenseItems.push({ itemId: it._id, dispensedQty: requested });
    }

    if (dispenseItems.length === 0) {
      toast.error("Nothing to dispense. Set quantity for at least one stocked item.");
      return;
    }
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

  const patientName = prescription.patient
    ? `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim()
    : (prescription.externalPatient?.name || 'Unknown');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dispense Medicines</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Patient: <span className="font-semibold text-foreground">{patientName}</span></p>
        <div className="space-y-3 mt-2">
          {items.map(item => {
            const medName = item.medicineName || item.medicine?.name || 'Unknown';
            const stock = getStock(item);
            const noMedicine = !item.medicine;
            const outOfStock = !noMedicine && (stock ?? 0) <= 0;
            const max = noMedicine ? 0 : Math.min(Number(item.quantity || 0), stock ?? 0);

            return (
              <div key={item._id} className="flex items-start gap-3 border rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{medName}</p>
                  <p className="text-xs text-muted-foreground">{item.dosage} · {item.frequency} · {item.duration}</p>
                  <p className="text-xs">
                    Prescribed: <span className="font-semibold">{item.quantity}</span> | Stock: <span className={outOfStock ? "text-destructive font-semibold" : "font-semibold"}>{stock ?? "—"}</span>
                  </p>
                  {noMedicine && (
                    <p className="text-xs text-amber-600 mt-1">No medicine linked from inventory — cannot be dispensed. Add the medicine to inventory first.</p>
                  )}
                  {!noMedicine && outOfStock && (
                    <p className="text-xs text-destructive mt-1">Out of stock — cannot dispense.</p>
                  )}
                </div>
                {item.dispensed ? (
                  <Badge variant="success" className="text-xs">Dispensed</Badge>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <Input
                      type="number"
                      min="0"
                      max={max}
                      className="w-20"
                      placeholder="Qty"
                      disabled={noMedicine || outOfStock}
                      value={quantities[item._id] || ''}
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw === '') return setQuantities(p => ({ ...p, [item._id]: '' }));
                        const n = Math.max(0, Math.min(max, Number(raw)));
                        setQuantities(p => ({ ...p, [item._id]: String(n) }));
                      }}
                    />
                    {!noMedicine && !outOfStock && (
                      <span className="text-[10px] text-muted-foreground">max {max}</span>
                    )}
                  </div>
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
