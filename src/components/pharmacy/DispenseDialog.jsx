import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { dispensePrescription } from "@/lib/pharmacy";
import { toast } from "sonner";
import {
  computeDispenseCap,
  getPatientDisplayName,
  readItemStock,
} from "./pharmacy-utils";

const invalidatePharmacyQueries = (qc) => {
  ["prescriptions", "medicines", "pharmacy-stats", "pharmacy-invoices"].forEach((key) =>
    qc.invalidateQueries({ queryKey: [key] })
  );
};

/**
 * Turn form state + prescription items into the payload the API expects.
 * Returns `{ payload, error }` — never throws.
 */
const buildDispensePayload = (items, quantities) => {
  const payload = [];
  for (const item of items) {
    if (item.dispensed || !item.medicine) continue;
    const requested = Number(quantities[item._id] || 0);
    if (requested <= 0) continue;
    const stock = readItemStock(item) ?? 0;
    const cap = computeDispenseCap(item, stock);
    if (requested > cap) {
      return {
        payload: null,
        error: `"${item.medicineName}": cannot dispense ${requested}. Max allowed is ${cap} (Prescribed ${item.quantity}, Stock ${stock}).`,
      };
    }
    payload.push({ itemId: item._id, dispensedQty: requested });
  }
  return { payload, error: null };
};

function DispenseItemRow({ item, value, onChange }) {
  const medName = item.medicineName || item.medicine?.name || "Unknown";
  const stock = readItemStock(item);
  const noMedicine = !item.medicine;
  const outOfStock = !noMedicine && (stock ?? 0) <= 0;
  const cap = noMedicine ? Number(item.quantity || 0) : computeDispenseCap(item, stock);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") return onChange("");
    const upper = Number(item.quantity || 0);
    const clamped = Math.max(0, Math.min(upper, Number(raw)));
    onChange(String(clamped));
  };

  return (
    <div className="flex items-start gap-3 border rounded-lg p-3">
      <div className="flex-1">
        <p className="font-medium text-sm">{medName}</p>
        <p className="text-xs text-muted-foreground">
          {item.dosage} · {item.frequency} · {item.duration}
        </p>
        <p className="text-xs">
          Prescribed: <span className="font-semibold">{item.quantity}</span> | Stock:{" "}
          <span className={outOfStock ? "text-destructive font-semibold" : "font-semibold"}>
            {stock ?? "—"}
          </span>
        </p>
        {noMedicine && (
          <p className="text-xs text-amber-600 mt-1">
            No medicine linked from inventory — link it to inventory before dispensing.
          </p>
        )}
        {!noMedicine && outOfStock && (
          <p className="text-xs text-destructive mt-1">Out of stock — restock before dispensing.</p>
        )}
      </div>
      {item.dispensed ? (
        <Badge variant="success" className="text-xs">Dispensed</Badge>
      ) : (
        <div className="flex flex-col items-end gap-1">
          <Input
            type="number"
            min="0"
            max={Number(item.quantity || 0)}
            className="w-20"
            placeholder="Qty"
            value={value || ""}
            onChange={handleChange}
          />
          <span className="text-[10px] text-muted-foreground">
            max {cap}{noMedicine || outOfStock ? " (blocked at submit)" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DispenseDialog({ open, onOpenChange, prescription }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [quantities, setQuantities] = useState({});

  const items = useMemo(() => prescription?.items || [], [prescription]);
  const patientName = useMemo(() => {
    if (!prescription) return "Unknown";
    return prescription.patient
      ? getPatientDisplayName(prescription.patient, "Unknown")
      : prescription.externalPatient?.name || "Unknown";
  }, [prescription]);

  if (!prescription) return null;

  const setItemQuantity = (itemId, next) =>
    setQuantities((prev) => ({ ...prev, [itemId]: next }));

  const handleDispense = async () => {
    const { payload, error } = buildDispensePayload(items, quantities);
    if (error) return toast.error(error);
    if (!payload || payload.length === 0) {
      return toast.error("Nothing to dispense. Set quantity for at least one stocked item.");
    }

    setLoading(true);
    try {
      await dispensePrescription(prescription._id, payload);
      toast.success("Medicines dispensed");
      invalidatePharmacyQueries(qc);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dispense Medicines</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Patient: <span className="font-semibold text-foreground">{patientName}</span>
        </p>
        <div className="space-y-3 mt-2">
          {items.map((item) => (
            <DispenseItemRow
              key={item._id}
              item={item}
              value={quantities[item._id]}
              onChange={(next) => setItemQuantity(item._id, next)}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDispense} disabled={loading}>
            {loading ? "Dispensing…" : "Dispense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
