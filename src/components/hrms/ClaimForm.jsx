import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles } from "lucide-react";
import * as rc from "@/lib/hrms-claims";

const emptyLine = () => ({ description: "", incurredOn: "", category: "other", amount: 0, taxAmount: 0, receiptUrl: "", receiptFileName: "", extracted: false, notes: "" });

const emptyClaim = () => ({ claimType: "other", title: "", description: "", currency: "INR", lineItems: [emptyLine()] });

export default function ClaimForm({ claim = null, onSaved, onClose, open = true }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(claim || emptyClaim());
  const [pasteText, setPasteText] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);

  useEffect(() => { setForm(claim || emptyClaim()); }, [claim]);

  const policiesQ = useQuery({ queryKey: ["hrms-claim-policies"], queryFn: () => rc.listPolicies() });
  const policy = (policiesQ.data?.items || []).find((p) => p.claimType === form.claimType);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setLine = (idx, key, value) => setForm((prev) => ({
    ...prev,
    lineItems: prev.lineItems.map((li, i) => (i === idx ? { ...li, [key]: value } : li)),
  }));
  const addLine = () => setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, emptyLine()] }));
  const removeLine = (idx) => setForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== idx) }));

  const onReceiptFile = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLine(idx, "receiptUrl", reader.result) || setLine(idx, "receiptFileName", file.name);
    reader.readAsDataURL(file);
  };

  const total = rc.claimTotal(form.lineItems);

  const save = useMutation({
    mutationFn: (draft) => (draft._id ? rc.updateClaim(draft._id, draft) : rc.createClaim(draft)),
    onSuccess: async (saved) => {
      toast.success("Claim saved as draft");
      await qc.invalidateQueries({ queryKey: ["hrms-claims"] });
      onSaved?.(saved);
    },
    onError: (e) => toast.error(e.message || "Could not save claim"),
  });

  const submit = useMutation({
    mutationFn: async (draft) => {
      const saved = draft._id ? draft : await rc.createClaim(draft);
      return rc.submitClaim(saved._id);
    },
    onSuccess: async () => {
      toast.success("Claim submitted for approval");
      await qc.invalidateQueries({ queryKey: ["hrms-claims"] });
      onSaved?.();
    },
    onError: (e) => toast.error(e.message || "Could not submit claim"),
  });

  const applyExtraction = () => {
    const items = rc.extractLineItemsLocally(pasteText);
    if (!items.length) return toast.error("Could not detect any line items in the pasted text");
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems.filter((li) => li.description),
        ...items.map((it) => ({ ...emptyLine(), ...it, extracted: true })),
      ],
    }));
    setPasteOpen(false);
    setPasteText("");
    toast.success(`Added ${items.length} line item(s) from receipt text`);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{form._id ? "Edit claim" : "New reimbursement claim"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Claim type</Label>
            <Select value={form.claimType} onValueChange={(v) => set("claimType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{rc.CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{rc.titleCase(t)}</SelectItem>)}</SelectContent>
            </Select>
            {policy && (
              <p className="text-xs text-muted-foreground">
                Per-claim cap: {policy.perClaimCapAmount || "—"} · Annual cap: {policy.annualCapAmount || "—"} · Receipt required above: {policy.requiresReceiptAbove || 0}
              </p>
            )}
          </div>
          <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Line items</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}><Sparkles className="mr-1 h-4 w-4" />Paste receipt text</Button>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-4 w-4" />Add line</Button>
          </div>
        </div>

        <div className="space-y-3">
          {form.lineItems.map((li, idx) => (
            <div key={idx} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6">
              <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Description</Label><Input value={li.description} onChange={(e) => setLine(idx, "description", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={li.incurredOn ? String(li.incurredOn).slice(0, 10) : ""} onChange={(e) => setLine(idx, "incurredOn", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Amount</Label><Input type="number" min="0" value={li.amount} onChange={(e) => setLine(idx, "amount", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tax</Label><Input type="number" min="0" value={li.taxAmount} onChange={(e) => setLine(idx, "taxAmount", Number(e.target.value))} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Receipt</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => onReceiptFile(idx, e.target.files?.[0])} />
                {li.receiptFileName && <p className="truncate text-xs text-muted-foreground">{li.receiptFileName}</p>}
              </div>
              <div className="sm:col-span-6 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Claimed total: <strong className="text-foreground">₹{total.toLocaleString("en-IN")}</strong></span>
          <div className="flex gap-2">
            {onClose && <Button variant="outline" onClick={onClose}>Close</Button>}
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(form)}>Save draft</Button>
            <Button disabled={submit.isPending} onClick={() => {
              if (!form.title?.trim()) return toast.error("Title is required");
              if (!form.lineItems.some((li) => li.description && Number(li.amount) > 0)) return toast.error("Add at least one valid line item");
              submit.mutate(form);
            }}>{submit.isPending ? "Submitting..." : "Submit claim"}</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Paste receipt text</DialogTitle></DialogHeader>
          <Textarea rows={8} placeholder={"e.g.\nTaxi fare 12/03/2024 500\nHotel stay 2400"} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button onClick={applyExtraction}>Extract line items</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
