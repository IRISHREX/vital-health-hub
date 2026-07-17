import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import * as indentsApi from "@/lib/medicineIndents";
import * as nursingApi from "@/lib/nursingCharges";
import * as handoversApi from "@/lib/handovers";
import * as pacApi from "@/lib/pac";
import * as ioApi from "@/lib/fluidIO";
import * as returnsApi from "@/lib/returns";
import { getMedicines } from "@/lib/pharmacy";
import { format } from "date-fns";

const fmtDate = (d) => (d ? format(new Date(d), "dd MMM yyyy HH:mm") : "—");

function IndentsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["indents", status],
    queryFn: () => indentsApi.listIndents({ status: status || undefined }),
  });
  const rows = data?.items || [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ward: "", floor: "", priority: "routine", items: [{ medicine: "", requestedQty: 1 }] });
  const { data: meds } = useQuery({ queryKey: ["meds-picker"], queryFn: () => getMedicines({ limit: 200 }) });
  const medList = meds?.items || meds?.medicines || [];

  const create = useMutation({
    mutationFn: indentsApi.createIndent,
    onSuccess: () => { toast({ title: "Indent created" }); setOpen(false); qc.invalidateQueries({ queryKey: ["indents"] }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const issue = useMutation({
    mutationFn: ({ id }) => indentsApi.issueIndent(id),
    onSuccess: () => { toast({ title: "Indent issued" }); qc.invalidateQueries({ queryKey: ["indents"] }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: ({ id }) => indentsApi.cancelIndent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["indents"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="partially_returned">Partially Returned</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setOpen(!open)}>{open ? "Close" : "New Indent"}</Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle>New Ward Indent</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Ward</Label><Input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} /></div>
              <div><Label>Floor</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_60px] gap-3">
                <div>
                  <Label>Medicine</Label>
                  <Select value={it.medicine} onValueChange={(v) => {
                    const items = [...form.items]; items[i].medicine = v; setForm({ ...form, items });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                    <SelectContent>
                      {medList.map((m) => <SelectItem key={m._id} value={m._id}>{m.name} (Stock: {m.stock})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input type="number" min={1} value={it.requestedQty} onChange={(e) => {
                    const items = [...form.items]; items[i].requestedQty = Number(e.target.value); setForm({ ...form, items });
                  }} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}>×</Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { medicine: "", requestedQty: 1 }] })}>+ Add Item</Button>
            <div className="flex justify-end">
              <Button onClick={() => create.mutate(form)} disabled={create.isPending || !form.items.length}>Submit</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Indent</TableHead><TableHead>Ward</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow> :
                rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-muted-foreground">No indents</TableCell></TableRow> :
                rows.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="font-medium">{r.indentNo}</TableCell>
                    <TableCell>{r.ward || "—"}</TableCell>
                    <TableCell>{r.items?.length}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell className="space-x-1">
                      {r.status === "requested" && <Button size="sm" onClick={() => issue.mutate({ id: r._id })}>Issue</Button>}
                      {["requested", "approved"].includes(r.status) && <Button size="sm" variant="outline" onClick={() => cancel.mutate({ id: r._id })}>Cancel</Button>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NursingChargesTab() {
  const qc = useQueryClient();
  const [admission, setAdmission] = useState("");
  const { data } = useQuery({
    queryKey: ["nursing-charges", admission],
    queryFn: () => nursingApi.listNursingCharges({ admissionId: admission || undefined }),
    enabled: !!admission,
  });
  const [form, setForm] = useState({ chargeType: "procedure", description: "", quantity: 1, unitPrice: 0, notes: "" });
  const create = useMutation({
    mutationFn: (data) => nursingApi.createNursingCharge({ ...data, admission }),
    onSuccess: () => { toast({ title: "Charge added" }); qc.invalidateQueries({ queryKey: ["nursing-charges"] }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Nursing Charge</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Admission ID</Label><Input value={admission} onChange={(e) => setAdmission(e.target.value)} placeholder="Admission _id" /></div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.chargeType} onValueChange={(v) => setForm({ ...form, chargeType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["procedure", "iv_line", "dressing", "catheter", "monitoring", "injection", "nebulization", "suction", "other"].map(t =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Qty</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            <div><Label>Unit Price</Label><Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} /></div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!admission || !form.description} onClick={() => create.mutate(form)}>Post to Ledger</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Amount</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.items || []).map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{fmtDate(r.performedAt)}</TableCell>
                  <TableCell>{r.chargeType}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>₹{r.amount}</TableCell>
                  <TableCell>{r.performedBy?.name || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HandoversTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["handovers"], queryFn: () => handoversApi.listHandovers({ mine: "true" }) });
  const respond = useMutation({
    mutationFn: ({ id, decision }) => handoversApi.respondHandover(id, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["handovers"] }),
  });
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Handover #</TableHead><TableHead>Patient</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.items || []).map((h) => (
              <TableRow key={h._id}>
                <TableCell>{h.handoverNo}</TableCell>
                <TableCell>{h.patient?.firstName} {h.patient?.lastName}</TableCell>
                <TableCell>{h.fromNurse?.name}</TableCell>
                <TableCell>{h.toNurse?.name}</TableCell>
                <TableCell><Badge>{h.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {h.status === "submitted" && <>
                    <Button size="sm" onClick={() => respond.mutate({ id: h._id, decision: "accept" })}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: h._id, decision: "reject" })}>Reject</Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PACTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pac"], queryFn: () => pacApi.listPAC() });
  const clear = useMutation({
    mutationFn: ({ id, status }) => pacApi.clearancePAC(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pac"] }),
  });
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>PAC #</TableHead><TableHead>Patient</TableHead><TableHead>Surgery</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.items || []).map((p) => (
              <TableRow key={p._id}>
                <TableCell>{p.pacNo}</TableCell>
                <TableCell>{p.patient?.firstName} {p.patient?.lastName}</TableCell>
                <TableCell>{p.surgery?.surgeryType}</TableCell>
                <TableCell><Badge>{p.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {p.status !== "cleared" && <>
                    <Button size="sm" onClick={() => clear.mutate({ id: p._id, status: "cleared" })}>Clear</Button>
                    <Button size="sm" variant="outline" onClick={() => clear.mutate({ id: p._id, status: "not_cleared" })}>Not Cleared</Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FluidIOTab() {
  const qc = useQueryClient();
  const [admission, setAdmission] = useState("");
  const { data } = useQuery({ queryKey: ["io", admission], queryFn: () => ioApi.listFluidIO({ admissionId: admission }), enabled: !!admission });
  const { data: summary } = useQuery({ queryKey: ["io-sum", admission], queryFn: () => ioApi.summaryFluidIO({ admissionId: admission }), enabled: !!admission });
  const [form, setForm] = useState({ direction: "in", source: "IV", volumeMl: 100, notes: "" });
  const create = useMutation({
    mutationFn: () => ioApi.createFluidIO({ ...form, admission }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["io"] }); qc.invalidateQueries({ queryKey: ["io-sum"] }); },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Fluid Intake / Output</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Admission ID</Label><Input value={admission} onChange={(e) => setAdmission(e.target.value)} /></div>
          {admission && (
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in">Intake</SelectItem><SelectItem value="out">Output</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["IV", "Oral", "NG", "Enteral", "Blood", "Urine", "Drain", "Vomit", "Stool", "Sweat", "Other"].map(s =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Volume (mL)</Label><Input type="number" value={form.volumeMl} onChange={(e) => setForm({ ...form, volumeMl: Number(e.target.value) })} /></div>
              <div className="flex items-end"><Button onClick={() => create.mutate()}>Record</Button></div>
            </div>
          )}
          {summary && (
            <div className="flex gap-4 text-sm">
              <Badge variant="outline">Intake: {summary.in} mL</Badge>
              <Badge variant="outline">Output: {summary.out} mL</Badge>
              <Badge>Balance: {summary.balance} mL</Badge>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Dir</TableHead><TableHead>Source</TableHead><TableHead>Vol (mL)</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.items || []).map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{fmtDate(r.ts)}</TableCell>
                  <TableCell>{r.direction}</TableCell>
                  <TableCell>{r.source}</TableCell>
                  <TableCell>{r.volumeMl}</TableCell>
                  <TableCell>{r.recordedBy?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["returns"], queryFn: () => returnsApi.listReturns() });
  const process = useMutation({
    mutationFn: ({ id, decision }) => returnsApi.processReturn(id, decision),
    onSuccess: () => { toast({ title: "Processed" }); qc.invalidateQueries({ queryKey: ["returns"] }); },
    onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Patient</TableHead><TableHead>Items</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.items || []).map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.module}</TableCell>
                <TableCell>{r.patient?.firstName} {r.patient?.lastName}</TableCell>
                <TableCell>{r.items?.length}</TableCell>
                <TableCell>₹{r.totalAmount}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {r.status === "pending" && <>
                    <Button size="sm" onClick={() => process.mutate({ id: r._id, decision: "approve" })}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => process.mutate({ id: r._id, decision: "reject" })}>Reject</Button>
                  </>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function NursingOps() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Nursing Operations</h1>
        <p className="text-muted-foreground text-sm">Ward indents, nursing charges, SBAR handovers, PAC, and fluid balance.</p>
      </div>
      <Tabs defaultValue="indents">
        <TabsList>
          <TabsTrigger value="indents">Indents</TabsTrigger>
          <TabsTrigger value="charges">Nursing Charges</TabsTrigger>
          <TabsTrigger value="handovers">Handovers</TabsTrigger>
          <TabsTrigger value="pac">PAC</TabsTrigger>
          <TabsTrigger value="io">Fluid I/O</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="indents"><IndentsTab /></TabsContent>
        <TabsContent value="charges"><NursingChargesTab /></TabsContent>
        <TabsContent value="handovers"><HandoversTab /></TabsContent>
        <TabsContent value="pac"><PACTab /></TabsContent>
        <TabsContent value="io"><FluidIOTab /></TabsContent>
        <TabsContent value="returns"><ReturnsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
