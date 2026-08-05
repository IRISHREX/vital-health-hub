import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getHospitalSettings } from "@/lib/settings";
import { resolveBranding, printBrandedHtml } from "@/lib/branding";
import { buildDocumentCodes } from "@/lib/document-codes";
import * as api from "@/lib/estimates";

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

const statusVariant = {
  draft: "outline",
  shared: "secondary",
  approved: "default",
  converted: "default",
  expired: "destructive",
  cancelled: "destructive",
};

const emptyForm = {
  scope: "mixed",
  patientName: "",
  patientPhone: "",
  patientAge: "",
  patientGender: "male",
  estimatedStayDays: "",
  validUntil: "",
  notes: "",
};

const emptyLine = { module: "other", description: "", quantity: 1, unitPrice: 0, notes: "" };

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const printEstimate = (estimate, hospitalSettings) => {
  const branding = resolveBranding(hospitalSettings, "invoice");
  const patientName =
    estimate.patientInfo?.name ||
    [estimate.patient?.firstName, estimate.patient?.lastName].filter(Boolean).join(" ") ||
    "—";
  const rows = (estimate.items || [])
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.description)}</td>
          <td style="text-transform:capitalize">${escapeHtml(item.module)}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${Number(item.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">${Number(item.amount).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <h2 style="text-align:center;margin:10px 0">TREATMENT COST ESTIMATE</h2>
    <table style="width:100%;margin-bottom:10px">
      <tr>
        <td><strong>Estimate No.:</strong> ${escapeHtml(estimate.estimateNumber || "—")}</td>
        <td><strong>Date:</strong> ${fmtDate(estimate.createdAt)}</td>
      </tr>
      <tr>
        <td><strong>Patient:</strong> ${escapeHtml(patientName)}</td>
        <td><strong>Valid Until:</strong> ${fmtDate(estimate.validUntil)}</td>
      </tr>
      <tr>
        <td><strong>Scope:</strong> ${escapeHtml(estimate.scope || "mixed")}</td>
        <td><strong>Estimated Stay:</strong> ${estimate.estimatedStayDays ? `${estimate.estimatedStayDays} day(s)` : "—"}</td>
      </tr>
    </table>
    <table class="lines" style="width:100%">
      <thead>
        <tr><th>#</th><th>Particulars</th><th>Module</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:60%;margin-left:auto;margin-top:10px">
      <tr><td>Subtotal</td><td style="text-align:right">${Number(estimate.subtotal || 0).toFixed(2)}</td></tr>
      <tr><td>Discount</td><td style="text-align:right">${Number(estimate.discountAmount || 0).toFixed(2)}</td></tr>
      <tr><td>Tax</td><td style="text-align:right">${Number(estimate.taxAmount || 0).toFixed(2)}</td></tr>
      <tr><td><strong>Estimated Total</strong></td><td style="text-align:right"><strong>${Number(estimate.totalAmount || 0).toFixed(2)}</strong></td></tr>
    </table>
    <p style="margin-top:14px;font-size:11px">
      This is an indicative estimate only. Actual charges may vary based on clinical course, consumables used and length of stay.
    </p>
  `;

  const codes = buildDocumentCodes({
    docId: estimate._id,
    patientId: estimate.patient?._id || estimate.patient,
    type: "estimate",
  });

  printBrandedHtml(
    `Estimate ${estimate.estimateNumber || ""}`,
    branding,
    body,
    `table.lines th, table.lines td { border:1px solid #cbd5e1; padding:5px 6px; font-size:11px; }
     table.lines th { background:#f1f5f9; }`,
    codes
  );
};

function CatalogPicker({ onPick }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const debounced = useDebouncedValue(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ["estimate-catalog", debounced, source],
    queryFn: () => api.searchEstimateCatalog({ q: debounced, source }),
    enabled: debounced.trim().length > 1,
  });
  const results = data?.items || [];

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Label>Search services, tests or medicines</Label>
          <Input placeholder="e.g. CBC, ICU bed, Paracetamol" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <Label>Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="service">Services</SelectItem>
              <SelectItem value="lab">Lab Tests</SelectItem>
              <SelectItem value="pharmacy">Medicines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {debounced.trim().length > 1 && (
        <div className="max-h-52 overflow-y-auto rounded border">
          {isFetching && <p className="p-3 text-sm text-muted-foreground">Searching…</p>}
          {!isFetching && !results.length && <p className="p-3 text-sm text-muted-foreground">No matches</p>}
          {results.map((item) => (
            <button
              key={`${item.sourceType}-${item.sourceRef}`}
              type="button"
              className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onPick(item)}
            >
              <span>
                {item.description}
                <span className="ml-2 text-xs capitalize text-muted-foreground">{item.module}</span>
              </span>
              <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EstimateForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(() => {
    if (!editing) return emptyForm;
    return {
      ...emptyForm,
      scope: editing.scope || "mixed",
      patientName: editing.patientInfo?.name || "",
      patientPhone: editing.patientInfo?.phone || "",
      patientAge: editing.patientInfo?.age || "",
      patientGender: editing.patientInfo?.gender || "male",
      estimatedStayDays: editing.estimatedStayDays ?? "",
      validUntil: editing.validUntil ? String(editing.validUntil).slice(0, 10) : "",
      notes: editing.notes || "",
    };
  });
  const [lines, setLines] = useState(editing?.items?.length ? editing.items.map((i) => ({ ...i })) : [{ ...emptyLine }]);
  const [discount, setDiscount] = useState(editing?.discountAmount ?? "");
  const [tax, setTax] = useState(editing?.taxAmount ?? "");

  const totals = useMemo(() => api.computeEstimateTotals(lines, discount, tax), [lines, discount, tax]);

  const save = useMutation({
    mutationFn: (payload) => (editing ? api.updateEstimate(editing._id, payload) : api.createEstimate(payload)),
    onSuccess: () => {
      toast({ title: editing ? "Estimate updated" : "Estimate created" });
      onOpenChange(false);
      onSaved();
    },
    onError: (e) => toast({ title: "Could not save estimate", description: e.message, variant: "destructive" }),
  });

  const updateLine = (index, key, value) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const submit = () => {
    const validLines = lines.filter((line) => line.description?.trim());
    if (!validLines.length) {
      toast({ title: "Add at least one estimate line", variant: "destructive" });
      return;
    }
    if (!form.patientName.trim() && !editing?.patient) {
      toast({ title: "Patient name is required", variant: "destructive" });
      return;
    }
    save.mutate({
      scope: form.scope,
      patientInfo: {
        name: form.patientName.trim(),
        phone: form.patientPhone,
        age: form.patientAge,
        gender: form.patientGender,
      },
      items: validLines.map((line) => ({
        module: line.module || "other",
        description: line.description.trim(),
        sourceRef: line.sourceRef || undefined,
        sourceType: line.sourceType || undefined,
        quantity: Number(line.quantity) || 1,
        unitPrice: Number(line.unitPrice) || 0,
        amount: (Number(line.quantity) || 1) * (Number(line.unitPrice) || 0),
        notes: line.notes || undefined,
      })),
      discountAmount: Number(discount || 0),
      taxAmount: Number(tax || 0),
      estimatedStayDays: form.estimatedStayDays === "" ? undefined : Number(form.estimatedStayDays),
      validUntil: form.validUntil || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[98vw] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{editing ? "Edit Estimate" : "New Estimate"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label>Patient Name *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} /></div>
          <div><Label>Age</Label><Input value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} /></div>
          <div>
            <Label>Gender</Label>
            <Select value={form.patientGender} onValueChange={(v) => setForm({ ...form, patientGender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["male", "female", "other"].map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["opd", "ipd", "package", "mixed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Estimated Stay (days)</Label><Input type="number" min="0" value={form.estimatedStayDays} onChange={(e) => setForm({ ...form, estimatedStayDays: e.target.value })} /></div>
          <div><Label>Valid Until</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
        </div>

        <CatalogPicker
          onPick={(item) =>
            setLines((prev) => {
              const next = prev.filter((line) => line.description?.trim());
              return [
                ...next,
                {
                  module: item.module,
                  description: item.description,
                  sourceRef: item.sourceRef,
                  sourceType: item.sourceType,
                  quantity: 1,
                  unitPrice: item.unitPrice,
                },
              ];
            })
          }
        />

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <Input
                className="sm:col-span-5"
                placeholder="Particulars"
                value={line.description}
                onChange={(e) => updateLine(index, "description", e.target.value)}
              />
              <Select value={line.module || "other"} onValueChange={(v) => updateLine(index, "module", v)}>
                <SelectTrigger className="sm:col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {api.ESTIMATE_MODULES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="sm:col-span-1" type="number" min="0" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} />
              <Input className="sm:col-span-2" type="number" min="0" value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} />
              <div className="flex items-center sm:col-span-1">
                <span className="text-sm font-medium">
                  {formatCurrency((Number(line.quantity) || 1) * (Number(line.unitPrice) || 0))}
                </span>
              </div>
              <Button
                className="sm:col-span-1"
                variant="outline"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                ×
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { ...emptyLine }])}>+ Add Line</Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div><Label>Discount</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div><Label>Tax</Label><Input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} /></div>
          <Card className="sm:col-span-2">
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between font-semibold"><span>Estimated Total</span><span>{formatCurrency(totals.totalAmount)}</span></div>
            </CardContent>
          </Card>
        </div>

        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Estimate"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Estimates = () => {
  const qc = useQueryClient();
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("estimates");
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const { data: hospitalRes } = useQuery({ queryKey: ["hospital-settings"], queryFn: () => getHospitalSettings() });
  const hospitalSettings = hospitalRes?.data || hospitalRes || {};

  const { data, isLoading } = useQuery({
    queryKey: ["estimates", debouncedSearch, filters.status, filters.from, filters.to],
    queryFn: () =>
      api.listEstimates({
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      }),
  });
  const rows = data?.items || [];

  const cancel = useMutation({
    mutationFn: api.cancelEstimate,
    onSuccess: () => {
      toast({ title: "Estimate cancelled" });
      qc.invalidateQueries({ queryKey: ["estimates"] });
    },
    onError: (e) => toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  const totalValue = rows.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estimate Billing</h1>
        <p className="text-sm text-muted-foreground">
          Build consolidated cost estimates across OPD, IPD, lab, radiology, pharmacy and OT — searchable by test or
          service name.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label>Search</Label>
          <Input
            placeholder="Estimate no., patient or line item"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {api.ESTIMATE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div>
        <div><Label>To</Label><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
        {permissions.canCreate && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>New Estimate</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Estimates</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{rows.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Estimated Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatCurrency(totalValue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Converted</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{rows.filter((r) => r.status === "converted").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[950px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate No.</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Loading estimates…</TableCell></TableRow>}
                {!isLoading && !rows.length && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No estimates found</TableCell></TableRow>}
                {rows.map((estimate) => (
                  <TableRow key={estimate._id}>
                    <TableCell className="font-medium">{estimate.estimateNumber || "—"}</TableCell>
                    <TableCell>
                      {estimate.patientInfo?.name ||
                        [estimate.patient?.firstName, estimate.patient?.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="capitalize">{estimate.scope}</TableCell>
                    <TableCell>{(estimate.items || []).length}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(estimate.totalAmount)}</TableCell>
                    <TableCell>{fmtDate(estimate.validUntil)}</TableCell>
                    <TableCell><Badge variant={statusVariant[estimate.status] || "outline"}>{estimate.status}</Badge></TableCell>
                    <TableCell>{fmtDate(estimate.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => printEstimate(estimate, hospitalSettings)}>Print</Button>
                        {permissions.canEdit && !["converted", "cancelled"].includes(estimate.status) && (
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(estimate); setFormOpen(true); }}>Edit</Button>
                        )}
                        {permissions.canDelete && !["converted", "cancelled"].includes(estimate.status) && (
                          <Button size="sm" variant="ghost" onClick={() => cancel.mutate(estimate._id)}>Cancel</Button>
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
        <EstimateForm
          key={editing?._id || "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          onSaved={() => qc.invalidateQueries({ queryKey: ["estimates"] })}
        />
      )}
    </div>
  );
};

export default Estimates;
