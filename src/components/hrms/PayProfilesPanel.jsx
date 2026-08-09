import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, Pencil } from "lucide-react";
import * as pr from "@/lib/hrms-payroll";
import * as he from "@/lib/hrms-employees";

const emptyProfile = () => ({
  payModel: "fixed_monthly",
  monthlyCTC: { basic: 0, hra: 0, allowances: 0, specialAllowance: 0 },
  hourlyRate: 0,
  perDiemRate: 0,
  retainerAmount: 0,
  overtimeMultiplier: 1.5,
  nightDifferentialPercent: 0,
  hazardPayPerShift: 0,
  onCallRatePerHour: 0,
  standbyRatePerHour: 0,
  calloutFlatAmount: 0,
  statutory: { pfPercent: 12, esiPercent: 0, professionalTax: 0, incomeTaxRegime: "slab", flatTaxPercent: 0, socialSecurityPercent: 0 },
});

export default function PayProfilesPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { employee, profile }
  const [form, setForm] = useState(emptyProfile());

  const employeesQ = useQuery({ queryKey: ["hrms-employees-for-pay"], queryFn: () => he.listHrmsEmployees({ limit: 200 }) });
  const profilesQ = useQuery({ queryKey: ["hrms-pay-profiles"], queryFn: () => pr.listPayProfiles() });

  const profileByEmployee = new Map((profilesQ.data?.items || []).map((p) => [String(p.employee?._id || p.employee), p]));

  const saveMutation = useMutation({
    mutationFn: () => pr.savePayProfile(editing.employee._id, form),
    onSuccess: async () => { toast.success("Pay profile saved"); setEditing(null); await profilesQ.refetch(); },
    onError: (e) => toast.error(e.message || "Could not save pay profile"),
  });

  const openEditor = (employee) => {
    const existing = profileByEmployee.get(String(employee._id));
    setForm(existing ? {
      payModel: existing.payModel,
      monthlyCTC: existing.monthlyCTC || emptyProfile().monthlyCTC,
      hourlyRate: existing.hourlyRate || 0,
      perDiemRate: existing.perDiemRate || 0,
      retainerAmount: existing.retainerAmount || 0,
      overtimeMultiplier: existing.overtimeMultiplier ?? 1.5,
      nightDifferentialPercent: existing.nightDifferentialPercent || 0,
      hazardPayPerShift: existing.hazardPayPerShift || 0,
      onCallRatePerHour: existing.onCallRatePerHour || 0,
      standbyRatePerHour: existing.standbyRatePerHour || 0,
      calloutFlatAmount: existing.calloutFlatAmount || 0,
      statutory: existing.statutory || emptyProfile().statutory,
    } : emptyProfile());
    setEditing({ employee, profile: existing });
  };

  const employees = employeesQ.data?.items || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />Employee Pay Profiles
        </h2>
        <p className="text-sm text-muted-foreground">Configure per-employee pay model, rates and statutory settings.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Pay Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const profile = profileByEmployee.get(String(emp._id));
                return (
                  <TableRow key={emp._id}>
                    <TableCell>{pr.employeeFullName(emp)} <span className="text-muted-foreground text-xs">({emp.employeeCode})</span></TableCell>
                    <TableCell>{emp.designation || "—"}</TableCell>
                    <TableCell>{profile ? pr.PAY_MODEL_LABELS[profile.payModel] : <span className="text-muted-foreground">Not set</span>}</TableCell>
                    <TableCell>{profile ? <Badge variant={profile.isActive ? "default" : "secondary"}>{profile.isActive ? "Active" : "Inactive"}</Badge> : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditor(emp)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />{profile ? "Edit" : "Set up"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!employees.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No employees found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pay Profile — {editing ? pr.employeeFullName(editing.employee) : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pay Model</Label>
              <Select value={form.payModel} onValueChange={(v) => setForm({ ...form, payModel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pr.PAY_MODELS.map((m) => <SelectItem key={m} value={m}>{pr.PAY_MODEL_LABELS[m]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.payModel === "fixed_monthly" && (
              <div className="grid grid-cols-2 gap-3">
                {["basic", "hra", "allowances", "specialAllowance"].map((k) => (
                  <div key={k}>
                    <Label className="capitalize">{k.replace(/([A-Z])/g, " $1")}</Label>
                    <Input type="number" value={form.monthlyCTC[k]} onChange={(e) => setForm({ ...form, monthlyCTC: { ...form.monthlyCTC, [k]: Number(e.target.value) } })} />
                  </div>
                ))}
              </div>
            )}
            {form.payModel === "hourly" && (
              <div><Label>Hourly Rate</Label><Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} /></div>
            )}
            {form.payModel === "per_diem_locum" && (
              <div><Label>Per-Diem Rate</Label><Input type="number" value={form.perDiemRate} onChange={(e) => setForm({ ...form, perDiemRate: Number(e.target.value) })} /></div>
            )}
            {form.payModel === "retainer" && (
              <div><Label>Retainer Amount</Label><Input type="number" value={form.retainerAmount} onChange={(e) => setForm({ ...form, retainerAmount: Number(e.target.value) })} /></div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div><Label>Overtime Multiplier</Label><Input type="number" step="0.1" value={form.overtimeMultiplier} onChange={(e) => setForm({ ...form, overtimeMultiplier: Number(e.target.value) })} /></div>
              <div><Label>Night Differential %</Label><Input type="number" value={form.nightDifferentialPercent} onChange={(e) => setForm({ ...form, nightDifferentialPercent: Number(e.target.value) })} /></div>
              <div><Label>Hazard Pay / Shift</Label><Input type="number" value={form.hazardPayPerShift} onChange={(e) => setForm({ ...form, hazardPayPerShift: Number(e.target.value) })} /></div>
              <div><Label>On-Call Rate / Hour</Label><Input type="number" value={form.onCallRatePerHour} onChange={(e) => setForm({ ...form, onCallRatePerHour: Number(e.target.value) })} /></div>
              <div><Label>Standby Rate / Hour</Label><Input type="number" value={form.standbyRatePerHour} onChange={(e) => setForm({ ...form, standbyRatePerHour: Number(e.target.value) })} /></div>
              <div><Label>Callout Flat Amount</Label><Input type="number" value={form.calloutFlatAmount} onChange={(e) => setForm({ ...form, calloutFlatAmount: Number(e.target.value) })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div><Label>PF %</Label><Input type="number" value={form.statutory.pfPercent} onChange={(e) => setForm({ ...form, statutory: { ...form.statutory, pfPercent: Number(e.target.value) } })} /></div>
              <div><Label>ESI %</Label><Input type="number" value={form.statutory.esiPercent} onChange={(e) => setForm({ ...form, statutory: { ...form.statutory, esiPercent: Number(e.target.value) } })} /></div>
              <div><Label>Professional Tax</Label><Input type="number" value={form.statutory.professionalTax} onChange={(e) => setForm({ ...form, statutory: { ...form.statutory, professionalTax: Number(e.target.value) } })} /></div>
              <div>
                <Label>Income Tax Regime</Label>
                <Select value={form.statutory.incomeTaxRegime} onValueChange={(v) => setForm({ ...form, statutory: { ...form.statutory, incomeTaxRegime: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{pr.TAX_REGIMES.map((r) => <SelectItem key={r} value={r}>{pr.titleCase(r)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.statutory.incomeTaxRegime === "flat" && (
                <div><Label>Flat Tax %</Label><Input type="number" value={form.statutory.flatTaxPercent} onChange={(e) => setForm({ ...form, statutory: { ...form.statutory, flatTaxPercent: Number(e.target.value) } })} /></div>
              )}
              <div><Label>Social Security %</Label><Input type="number" value={form.statutory.socialSecurityPercent} onChange={(e) => setForm({ ...form, statutory: { ...form.statutory, socialSecurityPercent: Number(e.target.value) } })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Saving..." : "Save Profile"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
