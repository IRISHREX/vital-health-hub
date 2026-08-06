import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import { formatCurrency } from "@/lib/format";
import * as api from "@/lib/referrals";

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

const commissionStatusVariant = {
  accrued: "secondary",
  approved: "outline",
  paid: "default",
  cancelled: "destructive",
};

const emptyReferrer = {
  name: "",
  type: "individual",
  phone: "",
  email: "",
  organization: "",
  qualification: "",
  registrationNumber: "",
  panNumber: "",
  address: "",
  defaultPercentage: "",
  notes: "",
  isActive: true,
};

/** Pure: build the commissionRates array from a { module: percentage } map. */
const buildCommissionRates = (rateMap) =>
  Object.entries(rateMap)
    .filter(([, pct]) => pct !== "" && pct !== null && pct !== undefined)
    .map(([module, percentage]) => ({ module, percentage: Number(percentage) }));

const rateMapFromReferrer = (referrer) =>
  api.REFERRAL_MODULES.reduce((acc, module) => {
    const found = (referrer?.commissionRates || []).find((r) => r.module === module);
    acc[module] = found ? String(found.percentage) : "";
    return acc;
  }, {});

function ReferrerForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(editing ? { ...emptyReferrer, ...editing } : emptyReferrer);
  const [rates, setRates] = useState(rateMapFromReferrer(editing));

  const save = useMutation({
    mutationFn: (payload) => (editing ? api.updateReferrer(editing._id, payload) : api.createReferrer(payload)),
    onSuccess: () => {
      toast({ title: editing ? "Referrer updated" : "Referrer added" });
      onOpenChange(false);
      onSaved();
    },
    onError: (e) => toast({ title: "Could not save referrer", description: e.message, variant: "destructive" }),
  });

  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!form.name?.trim()) {
      toast({ title: "Referrer name is required", variant: "destructive" });
      return;
    }
    const invalidRate = Object.entries(rates).find(
      ([, pct]) => pct !== "" && (Number(pct) < 0 || Number(pct) > 100 || Number.isNaN(Number(pct)))
    );
    if (invalidRate) {
      toast({ title: `Invalid percentage for ${invalidRate[0]}`, variant: "destructive" });
      return;
    }
    save.mutate({
      ...form,
      defaultPercentage: Number(form.defaultPercentage || 0),
      commissionRates: buildCommissionRates(rates),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[98vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? "Edit Referrer" : "Add Referrer"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => field("name", e.target.value)} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => field("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {api.REFERRER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => field("phone", e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => field("email", e.target.value)} /></div>
              <div><Label>Organization</Label><Input value={form.organization} onChange={(e) => field("organization", e.target.value)} /></div>
              <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => field("qualification", e.target.value)} /></div>
              <div><Label>Registration No.</Label><Input value={form.registrationNumber} onChange={(e) => field("registrationNumber", e.target.value)} /></div>
              <div><Label>PAN</Label><Input value={form.panNumber} onChange={(e) => field("panNumber", e.target.value)} /></div>
              <div><Label>Default Commission %</Label><Input type="number" min="0" max="100" value={form.defaultPercentage} onChange={(e) => field("defaultPercentage", e.target.value)} /></div>
            </div>
          </div>

          <div className="sm:col-span-1">
            <p className="mb-2 text-sm font-medium">Module-wise Commission %</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              {api.REFERRAL_MODULES.map((module) => (
                <div key={module}>
                  <Label className="capitalize">{module}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="default"
                    value={rates[module]}
                    onChange={(e) => setRates({ ...rates, [module]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Blank modules fall back to the default commission percentage.
            </p>
          </div>

          <div className="sm:col-span-3"><Label>Address</Label><Textarea value={form.address} onChange={(e) => field("address", e.target.value)} /></div>
          <div className="sm:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => field("notes", e.target.value)} /></div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Referrer"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferrersTab({ permissions }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [summaryId, setSummaryId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["referrers", search],
    queryFn: () => api.listReferrers({ search: search || undefined }),
  });
  const rows = data?.items || [];

  const { data: summary } = useQuery({
    queryKey: ["referrer-summary", summaryId],
    queryFn: () => api.getReferrerSummary(summaryId),
    enabled: !!summaryId,
  });

  const deactivate = useMutation({
    mutationFn: api.deactivateReferrer,
    onSuccess: () => {
      toast({ title: "Referrer deactivated" });
      qc.invalidateQueries({ queryKey: ["referrers"] });
    },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label>Search</Label>
          <Input placeholder="Name, phone, code or organization" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {permissions.canCreate && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>Add Referrer</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Default %</TableHead>
                  <TableHead>Module Rates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading referrers…</TableCell></TableRow>}
                {!isLoading && !rows.length && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No referrers yet</TableCell></TableRow>}
                {rows.map((referrer) => (
                  <TableRow key={referrer._id}>
                    <TableCell className="font-medium">{referrer.referrerCode || "—"}</TableCell>
                    <TableCell>{referrer.name}</TableCell>
                    <TableCell className="capitalize">{referrer.type}</TableCell>
                    <TableCell>{referrer.phone || "—"}</TableCell>
                    <TableCell>{referrer.defaultPercentage ?? 0}%</TableCell>
                    <TableCell className="text-xs">
                      {(referrer.commissionRates || []).length
                        ? referrer.commissionRates.map((r) => `${r.module}:${r.percentage}%`).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={referrer.isActive ? "default" : "destructive"}>{referrer.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSummaryId(referrer._id)}>Ledger</Button>
                        {permissions.canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(referrer); setFormOpen(true); }}>Edit</Button>
                        )}
                        {permissions.canDelete && referrer.isActive && (
                          <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(referrer._id)}>Deactivate</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {formOpen && (
        <ReferrerForm
          key={editing?._id || "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSaved={() => qc.invalidateQueries({ queryKey: ["referrers"] })}
        />
      )}

      <Dialog open={!!summaryId} onOpenChange={(open) => !open && setSummaryId(null)}>
        <DialogContent className="max-h-[90vh] w-[98vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Commission Ledger — {summary?.referrer?.name || "—"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["accrued", "approved", "paid", "cancelled"].map((key) => (
              <Card key={key}>
                <CardContent className="p-3">
                  <p className="text-xs capitalize text-muted-foreground">{key}</p>
                  <p className="font-semibold">{formatCurrency(summary?.totals?.[key] || 0)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accrued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(summary?.commissions || []).length && (
                <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No commissions yet</TableCell></TableRow>
              )}
              {(summary?.commissions || []).map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.invoiceNumber || "—"}</TableCell>
                  <TableCell className="capitalize">{c.module}</TableCell>
                  <TableCell>{formatCurrency(c.baseAmount)}</TableCell>
                  <TableCell>{c.percentage}%</TableCell>
                  <TableCell>{formatCurrency(c.commissionAmount)}</TableCell>
                  <TableCell><Badge variant={commissionStatusVariant[c.status] || "outline"}>{c.status}</Badge></TableCell>
                  <TableCell>{fmtDate(c.accruedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommissionsTab({ permissions }) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: "", module: "", from: "", to: "" });
  const [payout, setPayout] = useState(null);
  const [reference, setReference] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["commissions", filters],
    queryFn: () =>
      api.listCommissions({
        status: filters.status || undefined,
        module: filters.module || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      }),
  });
  const rows = data?.items || [];
  const totals = data?.totals || {};

  const changeStatus = useMutation({
    mutationFn: ({ id, status, paymentReference }) => api.updateCommissionStatus(id, { status, paymentReference }),
    onSuccess: () => {
      toast({ title: "Commission updated" });
      setPayout(null);
      setReference("");
      qc.invalidateQueries({ queryKey: ["commissions"] });
      qc.invalidateQueries({ queryKey: ["referrer-summary"] });
    },
    onError: (e) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {["accrued", "approved", "paid", "cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Module</Label>
          <Select value={filters.module || "all"} onValueChange={(v) => setFilters({ ...filters, module: v === "all" ? "" : v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {api.REFERRAL_MODULES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div>
        <div><Label>To</Label><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Commission</p><p className="font-semibold">{formatCurrency(totals.commission || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Billed Base</p><p className="font-semibold">{formatCurrency(totals.base || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pending Payout</p><p className="font-semibold">{formatCurrency((totals.accrued || 0) + (totals.approved || 0))}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid Out</p><p className="font-semibold">{formatCurrency(totals.paid || 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Accrued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Loading commissions…</TableCell></TableRow>}
                {!isLoading && !rows.length && <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No commission entries</TableCell></TableRow>}
                {rows.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>{c.referrer?.name || "—"}</TableCell>
                    <TableCell>{c.invoiceNumber || "—"}</TableCell>
                    <TableCell>{c.patientName || [c.patient?.firstName, c.patient?.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="capitalize">{c.module}</TableCell>
                    <TableCell>{formatCurrency(c.baseAmount)}</TableCell>
                    <TableCell>{c.percentage}%</TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.commissionAmount)}</TableCell>
                    <TableCell><Badge variant={commissionStatusVariant[c.status] || "outline"}>{c.status}</Badge></TableCell>
                    <TableCell>{fmtDate(c.accruedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {permissions.canEdit && c.status === "accrued" && (
                          <Button size="sm" variant="outline" onClick={() => changeStatus.mutate({ id: c._id, status: "approved" })}>Approve</Button>
                        )}
                        {permissions.canEdit && c.status === "approved" && (
                          <Button size="sm" onClick={() => setPayout(c)}>Mark Paid</Button>
                        )}
                        {permissions.canEdit && ["accrued", "approved"].includes(c.status) && (
                          <Button size="sm" variant="ghost" onClick={() => changeStatus.mutate({ id: c._id, status: "cancelled" })}>Cancel</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!payout} onOpenChange={(open) => !open && setPayout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Commission Payout</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {payout?.referrer?.name} — {formatCurrency(payout?.commissionAmount || 0)}
          </p>
          <div>
            <Label>Payment Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque / cash voucher" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayout(null)}>Cancel</Button>
            <Button
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id: payout._id, status: "paid", paymentReference: reference })}
            >
              {changeStatus.isPending ? "Saving…" : "Confirm Payout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Referrals = () => {
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("referrals");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals &amp; Commissions</h1>
        <p className="text-sm text-muted-foreground">
          Maintain referral partners with module-wise commission rates. Commissions accrue automatically when a linked
          invoice is fully settled.
        </p>
      </div>

      <Tabs defaultValue="referrers">
        <TabsList>
          <TabsTrigger value="referrers">Referrers</TabsTrigger>
          <TabsTrigger value="commissions">Commission Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="referrers" className="pt-4"><ReferrersTab permissions={permissions} /></TabsContent>
        <TabsContent value="commissions" className="pt-4"><CommissionsTab permissions={permissions} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Referrals;
