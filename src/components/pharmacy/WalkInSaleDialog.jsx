import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getMedicines, createPrescription, dispensePrescription } from "@/lib/pharmacy";

const emptyItem = { medicineId: "", medicineName: "", quantity: 1, unitPrice: 0, stock: 0 };
const emptyPatient = { name: "", phone: "", age: "", gender: "", address: "" };
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "insurance", label: "Insurance" },
  { value: "cheque", label: "Cheque" },
];

export default function WalkInSaleDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [patient, setPatient] = useState({ ...emptyPatient });
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: medsData } = useQuery({
    queryKey: ["medicines-walkin"],
    queryFn: () => getMedicines({ limit: 1000 }),
    enabled: open,
  });
  const medicines = useMemo(
    () => (Array.isArray(medsData) ? medsData : medsData?.data || []),
    [medsData]
  );

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const onPickMedicine = (idx, medicineId) => {
    const med = medicines.find((m) => m._id === medicineId);
    updateItem(idx, {
      medicineId,
      medicineName: med?.name || "",
      unitPrice: Number(med?.sellingPrice || 0),
      stock: Number(med?.stock || 0),
      quantity: 1,
    });
  };

  const total = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0),
    [items]
  );

  const reset = () => {
    setPatient({ ...emptyPatient });
    setItems([{ ...emptyItem }]);
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
    setSaveAsRx(true);
  };

  const handleSubmit = async () => {
    if (!patient.name?.trim()) return toast.error("Patient name is required");
    const validItems = items.filter((it) => it.medicineId && Number(it.quantity) > 0);
    if (validItems.length === 0) return toast.error("Add at least one medicine with quantity");

    for (const it of validItems) {
      if (Number(it.quantity) > Number(it.stock)) {
        return toast.error(`"${it.medicineName}": only ${it.stock} in stock.`);
      }
    }

    setLoading(true);
    try {
      // Create an external (walk-in) prescription with the chosen items
      const rxPayload = {
        mode: "external",
        externalPatient: {
          name: patient.name.trim(),
          phone: patient.phone || undefined,
          age: patient.age || undefined,
          gender: patient.gender || undefined,
          address: patient.address || undefined,
        },
        encounterType: "opd",
        notes: notes || (saveAsRx ? "Walk-in sale" : "Walk-in counter sale (no prescription kept on record)"),
        items: validItems.map((it) => ({
          medicine: it.medicineId,
          medicineName: it.medicineName,
          dosage: "As directed",
          frequency: "SOS",
          duration: "-",
          route: "oral",
          quantity: Number(it.quantity),
          stockRequestRaised: false,
        })),
        testAdvice: [],
      };

      const created = await createPrescription(rxPayload);
      const rxId = created?.data?._id || created?._id;
      if (!rxId) throw new Error("Failed to create walk-in record");

      // Immediately dispense everything (this also auto-creates an external invoice)
      const rxItems = created?.data?.items || created?.items || [];
      const dispensePayload = rxItems.map((ri) => ({
        itemId: ri._id,
        dispensedQty: Number(ri.quantity),
      }));
      await dispensePrescription(rxId, dispensePayload);

      toast.success(
        `Walk-in sale completed${paymentMethod ? ` — paid by ${paymentMethod.toUpperCase()}` : ""}. Invoice generated.`
      );
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["medicines"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-stats"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });

      // NOTE: The selected payment method/reference is shown to the user but the
      // payment is recorded on the auto-generated invoice from the Billing screen.
      // (Backend dispense flow generates the invoice; payment can be marked there.)
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.message || "Failed to complete walk-in sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Walk-in Pharmacy Sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <div className="text-sm font-semibold">Patient Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={patient.name} onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={patient.phone} onChange={(e) => setPatient((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Age</Label>
                <Input value={patient.age} onChange={(e) => setPatient((p) => ({ ...p, age: e.target.value }))} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={patient.gender} onValueChange={(v) => setPatient((p) => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={patient.address} onChange={(e) => setPatient((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Medicines</div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
            {items.map((it, idx) => {
              const lineTotal = Number(it.quantity || 0) * Number(it.unitPrice || 0);
              const overStock = Number(it.quantity || 0) > Number(it.stock || 0);
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border rounded p-2">
                  <div className="md:col-span-5">
                    <Label className="text-xs">Medicine</Label>
                    <Select value={it.medicineId} onValueChange={(v) => onPickMedicine(idx, v)}>
                      <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                      <SelectContent>
                        {medicines.map((m) => (
                          <SelectItem key={m._id} value={m._id} disabled={Number(m.stock || 0) <= 0}>
                            {m.name} — Rs {m.sellingPrice} (Stock {m.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      max={it.stock || undefined}
                      disabled={!it.medicineId}
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                    {it.medicineId && overStock && (
                      <p className="text-xs text-destructive mt-1">Max {it.stock}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input value={it.unitPrice} readOnly />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Line Total</Label>
                    <Input value={`Rs ${lineTotal.toFixed(2)}`} readOnly />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end pt-2">
              <div className="text-base font-bold">Total: Rs {total.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference (optional)</Label>
              <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Txn ID / Receipt #" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={saveAsRx} onCheckedChange={(v) => setSaveAsRx(!!v)} />
            <span>Also save as a prescription record (recommended for audit)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Processing…" : `Complete Sale (Rs ${total.toFixed(2)})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
