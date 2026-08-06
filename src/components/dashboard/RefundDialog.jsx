import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/format";
import { refundInvoice } from "@/lib/invoices";

const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "net_banking", label: "Net Banking" },
  { value: "cheque", label: "Cheque" },
  { value: "insurance", label: "Insurance" },
  { value: "adjustment", label: "Adjustment (no cash out)" },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Pure: refundable balance = paid minus already refunded. */
export const getRefundableAmount = (invoice) =>
  Math.max(0, Number(invoice?.paidAmount || 0) - Number(invoice?.refundedAmount || 0));

/** Pure: resolve the amount that will actually be sent for a refund type. */
export const resolveRefundAmount = ({ refundType, amount, refundable }) => {
  if (refundType === "full") return refundable;
  if (refundType === "partial") return Math.round(refundable * 0.5 * 100) / 100;
  return Number(amount || 0);
};

/** Pure: validate the refund form, returns an error string or null. */
export const validateRefund = ({ refundType, value, refundable, reason, refundedAt }) => {
  if (refundable <= 0) return "This invoice has no refundable paid amount";
  if (!Number.isFinite(value) || value <= 0) return "Refund amount must be greater than 0";
  if (value > refundable) return `Refund cannot exceed ${refundable}`;
  if (refundType !== "full" && !String(reason || "").trim()) return "A reason is required for partial and custom refunds";
  if (refundedAt) {
    const d = new Date(refundedAt);
    if (Number.isNaN(d.getTime())) return "Invalid refund date";
    if (d.getTime() > Date.now() + 60_000) return "Refund date cannot be in the future";
  }
  return null;
};

export default function RefundDialog({ open, onOpenChange, invoice, allowedMethods, onRefunded }) {
  const refundable = getRefundableAmount(invoice);
  const methods = allowedMethods?.length ? allowedMethods : REFUND_METHODS;
  const [refundType, setRefundType] = useState("full");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(methods[0]?.value || "cash");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [refundedAt, setRefundedAt] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRefundType("full");
    setAmount(String(refundable || ""));
    setMethod(methods[0]?.value || "cash");
    setReason("");
    setReference("");
    setRefundedAt(today());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?._id]);

  const effectiveAmount = useMemo(
    () => resolveRefundAmount({ refundType, amount, refundable }),
    [refundType, amount, refundable],
  );

  const submit = async () => {
    const error = validateRefund({ refundType, value: effectiveAmount, refundable, reason, refundedAt });
    if (error) {
      toast.error(error);
      return;
    }
    try {
      setSaving(true);
      await refundInvoice(invoice._id, {
        refundType,
        amount: effectiveAmount,
        method,
        reason: reason.trim() || undefined,
        reference: reference.trim() || undefined,
        refundedAt: refundedAt ? new Date(refundedAt).toISOString() : undefined,
      });
      toast.success(`Refund of ${formatCurrency(effectiveAmount)} recorded`);
      onOpenChange(false);
      await onRefunded?.();
    } catch (err) {
      toast.error(err.message || "Failed to record refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refund Invoice {invoice?.invoiceNumber || ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatCurrency(invoice?.paidAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already refunded</span><span>{formatCurrency(invoice?.refundedAmount)}</span></div>
            <div className="flex justify-between font-medium"><span>Refundable</span><span>{formatCurrency(refundable)}</span></div>
          </div>

          <div className="space-y-2">
            <Label>Refund type</Label>
            <RadioGroup value={refundType} onValueChange={setRefundType} className="grid gap-2">
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <RadioGroupItem value="full" id="refund-full" />
                <span>Full refund ({formatCurrency(refundable)})</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <RadioGroupItem value="partial" id="refund-partial" />
                <span>Partial (50% — {formatCurrency(resolveRefundAmount({ refundType: "partial", refundable }))})</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <RadioGroupItem value="custom" id="refund-custom" />
                <span>Custom amount</span>
              </label>
            </RadioGroup>
          </div>

          {refundType === "custom" && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" max={refundable} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Refund method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason {refundType !== "full" && <span className="text-destructive">*</span>}</Label>
            <Textarea rows={2} placeholder="e.g. Test cancelled, excess collection" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input placeholder="Txn/Ref No." value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Refund date</Label>
              <Input type="date" max={today()} value={refundedAt} onChange={(e) => setRefundedAt(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Refunding {formatCurrency(effectiveAmount)} will reduce the paid amount and update the invoice status.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submit} disabled={saving || refundable <= 0}>
              {saving ? "Processing..." : "Process Refund"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
