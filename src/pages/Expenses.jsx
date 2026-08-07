import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, TrendingUp } from "lucide-react";
import * as ex from "@/lib/expenses";

const money = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

const emptyExpense = {
  date: todayKey(), module: "general", category: "other", description: "",
  vendorName: "", invoiceReference: "", amount: 0, taxAmount: 0,
  paymentMode: "cash", status: "paid", notes: "",
};

export default function Expenses() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ from: monthStart(), to: todayKey(), module: "all", category: "all", search: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);

  const listParams = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    module: filters.module === "all" ? undefined : filters.module,
    category: filters.category === "all" ? undefined : filters.category,
    search: filters.search || undefined,
    limit: 200,
  };

  const listQ = useQuery({ queryKey: ["expenses", listParams], queryFn: () => ex.listExpenses(listParams) });
  const pnlQ = useQuery({
    queryKey: ["expenses", "pnl", filters.from, filters.to],
    queryFn: () => ex.getProfitAndLoss({ from: filters.from || undefined, to: filters.to || undefined }),
  });

  const items = listQ.data?.items || [];
  const pnl = pnlQ.data;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["expenses"] });

  const save = useMutation({
    mutationFn: (payload) => ex.createExpense(payload),
    onSuccess: async () => { toast.success("Expense recorded"); setFormOpen(false); setForm(emptyExpense); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not save expense"),
  });
  const cancel = useMutation({
    mutationFn: (id) => ex.cancelExpense(id),
    onSuccess: async () => { toast.success("Expense cancelled"); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not cancel expense"),
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses &amp; Profitability</h1>
          <p className="text-muted-foreground">Track hospital spend per module and compare it with collected revenue.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Record expense</Button>
      </div>

      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-5">
        <div className="space-y-2"><Label>From</Label><Input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} /></div>
        <div className="space-y-2"><Label>To</Label><Input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} /></div>
        <div className="space-y-2">
          <Label>Module</Label>
          <Select value={filters.module} onValueChange={(v) => setFilters((p) => ({ ...p, module: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All modules</SelectItem>{ex.EXPENSE_MODULES.map((m) => <SelectItem key={m} value={m}>{ex.titleCase(m)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={filters.category} onValueChange={(v) => setFilters((p) => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{ex.EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{ex.titleCase(c)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Search</Label><Input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Vendor, description…" /></div>
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue collected</p><p className="text-2xl font-bold">{money(pnl?.revenue?.collected)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding dues</p><p className="text-2xl font-bold">{money(pnl?.revenue?.due)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total expense</p><p className="text-2xl font-bold">{money(pnl?.expense?.total)}</p></CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Profit ({pnl?.margin ?? 0}% margin)</p>
          <p className={`text-2xl font-bold ${(pnl?.profit ?? 0) < 0 ? "text-destructive" : "text-foreground"}`}>{money(pnl?.profit)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Expense ledger</TabsTrigger>
          <TabsTrigger value="pnl"><TrendingUp className="mr-2 h-4 w-4" />Module P&amp;L</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardHeader><CardTitle className="text-base">{items.length} entries · {money(listQ.data?.totalAmount)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>No.</TableHead><TableHead>Date</TableHead><TableHead>Module</TableHead><TableHead>Category</TableHead>
                  <TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No expenses in this range</TableCell></TableRow>
                  ) : items.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="font-mono text-xs">{row.expenseNumber || "—"}</TableCell>
                      <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                      <TableCell>{ex.titleCase(row.module)}</TableCell>
                      <TableCell>{ex.titleCase(row.category)}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{row.description}</TableCell>
                      <TableCell>{row.vendorName || "—"}</TableCell>
                      <TableCell>{money(row.totalAmount)}</TableCell>
                      <TableCell><Badge variant={row.status === "paid" ? "default" : row.status === "pending" ? "secondary" : "outline"}>{ex.titleCase(row.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        {row.status !== "cancelled" && row.sourceType === "manual" && (
                          <Button size="sm" variant="ghost" onClick={() => cancel.mutate(row._id)}>Cancel</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue vs expense by module</CardTitle>
              <CardDescription>Revenue is derived from billed services, expenses from module-tagged spend.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Module</TableHead><TableHead>Revenue</TableHead><TableHead>Expense</TableHead><TableHead>Profit</TableHead><TableHead>Margin</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(pnl?.modules || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data for this range</TableCell></TableRow>
                  ) : pnl.modules.map((m) => (
                    <TableRow key={m.module}>
                      <TableCell className="font-medium">{ex.titleCase(m.module)}</TableCell>
                      <TableCell>{money(m.revenue)}</TableCell>
                      <TableCell>{money(m.expense)}</TableCell>
                      <TableCell className={m.profit < 0 ? "text-destructive" : ""}>{money(m.profit)}</TableCell>
                      <TableCell>{m.margin}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Expense by category</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {(pnl?.expense?.byCategory || []).map((c) => (
                <div key={c.category} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{ex.titleCase(c.category)}</span><span className="font-semibold">{money(c.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Record expense</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={form.module} onValueChange={(v) => set("module", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ex.EXPENSE_MODULES.map((m) => <SelectItem key={m} value={m}>{ex.titleCase(m)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ex.EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{ex.titleCase(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment mode</Label>
              <Select value={form.paymentMode} onValueChange={(v) => set("paymentMode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ex.PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{ex.titleCase(m)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>Description *</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
            <div className="space-y-2"><Label>Vendor</Label><Input value={form.vendorName} onChange={(e) => set("vendorName", e.target.value)} /></div>
            <div className="space-y-2"><Label>Bill reference</Label><Input value={form.invoiceReference} onChange={(e) => set("invoiceReference", e.target.value)} /></div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0" value={form.amount} onChange={(e) => set("amount", Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Tax</Label><Input type="number" min="0" value={form.taxAmount} onChange={(e) => set("taxAmount", Number(e.target.value))} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total: <strong>{money(ex.expenseTotal(form))}</strong></span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button
                  disabled={save.isPending}
                  onClick={() => {
                    if (!form.description.trim()) return toast.error("Description is required");
                    if (!(Number(form.amount) > 0)) return toast.error("Amount must be greater than zero");
                    save.mutate(form);
                  }}
                >{save.isPending ? "Saving..." : "Save expense"}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
