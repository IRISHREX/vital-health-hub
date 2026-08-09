import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import * as rc from "@/lib/hrms-claims";

const emptyPolicy = { claimType: "cme", annualCapAmount: 0, perClaimCapAmount: 0, requiresReceiptAbove: 0, eligibleStaffCategories: [], approvalChain: ["ward_incharge", "dept_head", "finance"], isActive: true };

export default function ReimbursementPolicyPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyPolicy);

  const policiesQ = useQuery({ queryKey: ["hrms-claim-policies"], queryFn: () => rc.listPolicies() });
  const items = policiesQ.data?.items || [];

  const save = useMutation({
    mutationFn: (payload) => rc.upsertPolicy(payload),
    onSuccess: async () => { toast.success("Policy saved"); setOpen(false); setForm(emptyPolicy); await qc.invalidateQueries({ queryKey: ["hrms-claim-policies"] }); },
    onError: (e) => toast.error(e.message || "Could not save policy"),
  });

  const remove = useMutation({
    mutationFn: (id) => rc.deletePolicy(id),
    onSuccess: async () => { toast.success("Policy removed"); await qc.invalidateQueries({ queryKey: ["hrms-claim-policies"] }); },
    onError: (e) => toast.error(e.message || "Could not delete policy"),
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleCategory = (cat) => setForm((prev) => ({
    ...prev,
    eligibleStaffCategories: prev.eligibleStaffCategories.includes(cat)
      ? prev.eligibleStaffCategories.filter((c) => c !== cat)
      : [...prev.eligibleStaffCategories, cat],
  }));

  const editPolicy = (p) => { setForm({ ...emptyPolicy, ...p }); setOpen(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Reimbursement policies</CardTitle>
        <Button size="sm" onClick={() => { setForm(emptyPolicy); setOpen(true); }}><Plus className="mr-1 h-4 w-4" />New / edit policy</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Claim type</TableHead><TableHead>Per-claim cap</TableHead><TableHead>Annual cap</TableHead>
            <TableHead>Receipt above</TableHead><TableHead>Chain</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No policies configured</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="font-medium">{rc.titleCase(p.claimType)}</TableCell>
                <TableCell>{p.perClaimCapAmount || "—"}</TableCell>
                <TableCell>{p.annualCapAmount || "—"}</TableCell>
                <TableCell>{p.requiresReceiptAbove || 0}</TableCell>
                <TableCell className="text-xs">{(p.approvalChain || []).map((s) => rc.titleCase(s)).join(" → ")}</TableCell>
                <TableCell><Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => editPolicy(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(p._id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Policy — {rc.titleCase(form.claimType)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Claim type</Label>
              <Select value={form.claimType} onValueChange={(v) => set("claimType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{rc.CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{rc.titleCase(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Per-claim cap</Label><Input type="number" min="0" value={form.perClaimCapAmount} onChange={(e) => set("perClaimCapAmount", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Annual cap</Label><Input type="number" min="0" value={form.annualCapAmount} onChange={(e) => set("annualCapAmount", Number(e.target.value))} /></div>
            </div>
            <div className="space-y-2"><Label>Receipt required above</Label><Input type="number" min="0" value={form.requiresReceiptAbove} onChange={(e) => set("requiresReceiptAbove", Number(e.target.value))} /></div>
            <div className="space-y-2">
              <Label>Eligible staff categories (empty = all)</Label>
              <div className="flex flex-wrap gap-2">
                {rc.STAFF_CATEGORIES.map((cat) => (
                  <Badge key={cat} variant={form.eligibleStaffCategories.includes(cat) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleCategory(cat)}>
                    {rc.titleCase(cat)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(form)}>{save.isPending ? "Saving..." : "Save policy"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
