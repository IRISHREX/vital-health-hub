import { useMemo, useState } from "react";
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
import { IdCard, Plus, RefreshCw, Users, Wallet } from "lucide-react";
import { getHospitalSettings } from "@/lib/settings";
import { EmployeeIdCard } from "@/components/hr/EmployeeIdCard";
import * as hr from "@/lib/hr";

const emptyEmployee = {
  firstName: "", lastName: "", designation: "", department: "", module: "general",
  employmentType: "full_time", phone: "", email: "", gender: "other", bloodGroup: "",
  joiningDate: "", address: "",
  salary: { mode: "monthly", basic: 0, hra: 0, allowances: 0, dailyRate: 0, hourlyRate: 0, pfPercent: 0, esiPercent: 0, professionalTax: 0, otherDeductions: 0 },
};

const money = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN")}`;
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

function EmployeeForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(emptyEmployee);
  const isEdit = Boolean(editing);

  useMemo(() => {
    if (open) {
      setForm(editing
        ? { ...emptyEmployee, ...editing, salary: { ...emptyEmployee.salary, ...(editing.salary || {}) }, joiningDate: editing.joiningDate?.slice(0, 10) || "" }
        : emptyEmployee);
    }
  }, [open, editing]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setSalary = (key, value) => setForm((prev) => ({ ...prev, salary: { ...prev.salary, [key]: value } }));

  const save = useMutation({
    mutationFn: (payload) => (isEdit ? hr.updateEmployee(editing._id, payload) : hr.createEmployee(payload)),
    onSuccess: async () => {
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onOpenChange(false);
      await onSaved?.();
    },
    onError: (err) => toast.error(err.message || "Could not save employee"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit employee" : "New employee"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>First name *</Label><Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Designation</Label><Input value={form.designation || ""} onChange={(e) => set("designation", e.target.value)} /></div>
          <div className="space-y-2"><Label>Department</Label><Input value={form.department || ""} onChange={(e) => set("department", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Cost centre / module</Label>
            <Select value={form.module} onValueChange={(v) => set("module", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{hr.EMPLOYEE_MODULES.map((m) => <SelectItem key={m} value={m}>{hr.titleCase(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Employment type</Label>
            <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{hr.EMPLOYMENT_TYPES.map((m) => <SelectItem key={m} value={m}>{hr.titleCase(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-2"><Label>Joining date</Label><Input type="date" value={form.joiningDate || ""} onChange={(e) => set("joiningDate", e.target.value)} /></div>
          <div className="space-y-2"><Label>Blood group</Label><Input value={form.bloodGroup || ""} onChange={(e) => set("bloodGroup", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address || ""} onChange={(e) => set("address", e.target.value)} /></div>

          <div className="sm:col-span-2 pt-2 text-sm font-semibold">Pay structure</div>
          <div className="space-y-2">
            <Label>Pay mode</Label>
            <Select value={form.salary.mode} onValueChange={(v) => setSalary("mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{hr.SALARY_MODES.map((m) => <SelectItem key={m} value={m}>{hr.titleCase(m)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.salary.mode === "monthly" && (
            <>
              <div className="space-y-2"><Label>Basic</Label><Input type="number" min="0" value={form.salary.basic} onChange={(e) => setSalary("basic", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>HRA</Label><Input type="number" min="0" value={form.salary.hra} onChange={(e) => setSalary("hra", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Allowances</Label><Input type="number" min="0" value={form.salary.allowances} onChange={(e) => setSalary("allowances", Number(e.target.value))} /></div>
            </>
          )}
          {form.salary.mode === "daily" && (
            <div className="space-y-2"><Label>Daily rate</Label><Input type="number" min="0" value={form.salary.dailyRate} onChange={(e) => setSalary("dailyRate", Number(e.target.value))} /></div>
          )}
          {form.salary.mode === "hourly" && (
            <div className="space-y-2"><Label>Hourly rate</Label><Input type="number" min="0" value={form.salary.hourlyRate} onChange={(e) => setSalary("hourlyRate", Number(e.target.value))} /></div>
          )}
          <div className="space-y-2"><Label>PF %</Label><Input type="number" min="0" value={form.salary.pfPercent} onChange={(e) => setSalary("pfPercent", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>ESI %</Label><Input type="number" min="0" value={form.salary.esiPercent} onChange={(e) => setSalary("esiPercent", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Professional tax</Label><Input type="number" min="0" value={form.salary.professionalTax} onChange={(e) => setSalary("professionalTax", Number(e.target.value))} /></div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (!form.firstName.trim()) return toast.error("First name is required");
                save.mutate({ ...form, joiningDate: form.joiningDate || undefined });
              }}
            >
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QrScheduleDialog({ open, onOpenChange, onBulkRotate, isPending }) {
  const [schedule, setSchedule] = useState(() => localStorage.getItem("hr_qr_rotation_schedule") || "disabled");
  const [lastRotated, setLastRotated] = useState(() => localStorage.getItem("hr_qr_last_rotated") || null);

  const saveSchedule = (val) => {
    setSchedule(val);
    localStorage.setItem("hr_qr_rotation_schedule", val);
    toast.success(`QR Auto-Regeneration schedule set to: ${val.replace("_", " ").toUpperCase()}`);
  };

  const handleBulk = async () => {
    await onBulkRotate();
    const now = new Date().toISOString();
    setLastRotated(now);
    localStorage.setItem("hr_qr_last_rotated", now);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> ID Card QR Code Regeneration &amp; Schedule
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Regenerating ID card QR codes invalidates old printed cards for security (e.g. lost cards or annual staff rotation).
          </p>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <Label className="text-xs font-semibold">1-Click Bulk QR Regeneration</Label>
            <p className="text-[11px] text-muted-foreground">
              Immediately regenerate new QR codes for all active staff members across all departments.
            </p>
            <Button size="sm" variant="default" onClick={handleBulk} disabled={isPending} className="w-full">
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Regenerating All QR Codes..." : "Regenerate All Active Staff QR Codes"}
            </Button>
            {lastRotated && (
              <p className="text-[10px] text-muted-foreground text-center">
                Last bulk regeneration: {new Date(lastRotated).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <Label className="text-xs font-semibold">Automated Scheduled QR Rotation</Label>
            <p className="text-[11px] text-muted-foreground">
              Configure automatic routine QR code expiration for hospital security compliance.
            </p>
            <Select value={schedule} onValueChange={saveSchedule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled (Manual Regeneration Only)</SelectItem>
                <SelectItem value="30_days">Every 30 Days (Monthly Rotation)</SelectItem>
                <SelectItem value="90_days">Every 90 Days (Quarterly Rotation)</SelectItem>
                <SelectItem value="180_days">Every 180 Days (Bi-Annual Rotation)</SelectItem>
                <SelectItem value="365_days">Every 365 Days (Annual Rotation)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[10px] capitalize">
              Current Schedule: {schedule.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HR() {
  const qc = useQueryClient();
  const now = new Date();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cardEmployee, setCardEmployee] = useState(null);
  const [qrScheduleOpen, setQrScheduleOpen] = useState(false);
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [runId, setRunId] = useState("");
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", leaveType: "casual", from: "", to: "", reason: "" });

  const { data: hospitalRes } = useQuery({ queryKey: ["hospital-settings"], queryFn: () => getHospitalSettings() });
  const hospital = hospitalRes?.data || {};

  const summaryQ = useQuery({ queryKey: ["hr", "summary"], queryFn: () => hr.getHrSummary() });
  const employeesQ = useQuery({ queryKey: ["hr", "employees", search], queryFn: () => hr.listEmployees({ search: search || undefined, limit: 100 }) });
  const leavesQ = useQuery({ queryKey: ["hr", "leaves"], queryFn: () => hr.listLeaveRequests({ limit: 100 }) });
  const runsQ = useQuery({ queryKey: ["hr", "payroll"], queryFn: () => hr.listPayrollRuns() });
  const runQ = useQuery({ queryKey: ["hr", "payroll", runId], queryFn: () => hr.getPayrollRun(runId), enabled: Boolean(runId) });

  const employees = employeesQ.data?.items || [];
  const leaves = leavesQ.data?.items || [];
  const runs = runsQ.data?.items || [];
  const run = runQ.data;
  const summary = summaryQ.data || {};

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr"] });

  const rotate = useMutation({
    mutationFn: (id) => hr.rotateEmployeeCard(id),
    onSuccess: async (emp) => { toast.success("Card QR rotated — reprint the ID card"); setCardEmployee(emp); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not rotate card"),
  });
  const bulkRotate = useMutation({
    mutationFn: (data) => hr.bulkRotateEmployeeCards(data),
    onSuccess: async (res) => { toast.success(res.message || "Bulk QR rotation complete"); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not bulk rotate QR codes"),
  });
  const deactivate = useMutation({
    mutationFn: (id) => hr.deactivateEmployee(id),
    onSuccess: async () => { toast.success("Employee marked inactive"); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not deactivate"),
  });
  const createLeave = useMutation({
    mutationFn: (payload) => hr.createLeaveRequest(payload),
    onSuccess: async () => { toast.success("Leave request created"); setLeaveForm({ employeeId: "", leaveType: "casual", from: "", to: "", reason: "" }); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not create leave request"),
  });
  const decideLeave = useMutation({
    mutationFn: ({ id, status }) => hr.decideLeaveRequest(id, { status }),
    onSuccess: async () => { toast.success("Leave updated"); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not update leave"),
  });
  const generate = useMutation({
    mutationFn: () => hr.generatePayrollRun(period),
    onSuccess: async (created) => { toast.success(`Payroll generated for ${created.period}`); setRunId(created._id); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not generate payroll"),
  });
  const finalize = useMutation({
    mutationFn: (id) => hr.finalizePayrollRun(id),
    onSuccess: async () => { toast.success("Payroll finalized"); await invalidate(); await runQ.refetch(); },
    onError: (e) => toast.error(e.message || "Could not finalize"),
  });
  const pay = useMutation({
    mutationFn: ({ slipId }) => hr.payPayslip(run._id, slipId, { paymentMode: "bank_transfer" }),
    onSuccess: async () => { toast.success("Salary marked paid and posted to expenses"); await invalidate(); await runQ.refetch(); },
    onError: (e) => toast.error(e.message || "Could not record payment"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR &amp; Payroll</h1>
          <p className="text-muted-foreground">Employee master, ID cards, leave and monthly salary processing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setQrScheduleOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />QR Rotation &amp; Schedule
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />New employee</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active employees</p><p className="text-2xl font-bold">{summary.activeEmployees ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total on record</p><p className="text-2xl font-bold">{summary.totalEmployees ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending leave</p><p className="text-2xl font-bold">{summary.pendingLeave ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Monthly salary cost</p><p className="text-2xl font-bold">{money(summary.monthlySalaryCost)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="mr-2 h-4 w-4" />Employees</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll"><Wallet className="mr-2 h-4 w-4" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Input placeholder="Search name, code, designation, department…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Designation</TableHead>
                <TableHead>Module</TableHead><TableHead>Gross</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No employees yet</TableCell></TableRow>
                ) : employees.map((emp) => (
                  <TableRow key={emp._id}>
                    <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                    <TableCell className="font-medium">{hr.employeeFullName(emp)}</TableCell>
                    <TableCell>{emp.designation || "—"}</TableCell>
                    <TableCell>{hr.titleCase(emp.module)}</TableCell>
                    <TableCell>{money(hr.fullGross(emp.salary))}</TableCell>
                    <TableCell><Badge variant={emp.isActive ? "default" : "outline"}>{emp.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setCardEmployee(emp)}><IdCard className="mr-1 h-3 w-3" />ID card</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(emp); setFormOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => rotate.mutate(emp._id)}><RefreshCw className="h-3 w-3" /></Button>
                        {emp.isActive && <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(emp._id)}>Exit</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Apply / record leave</CardTitle>
              <CardDescription>Approved paid leave counts as payable days in payroll.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-2 sm:col-span-2">
                <Label>Employee</Label>
                <Select value={leaveForm.employeeId} onValueChange={(v) => setLeaveForm((p) => ({ ...p, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e._id} value={e._id}>{hr.employeeFullName(e)} ({e.employeeCode})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm((p) => ({ ...p, leaveType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{hr.LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{hr.titleCase(t)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>From</Label><Input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm((p) => ({ ...p, from: e.target.value }))} /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm((p) => ({ ...p, to: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-4"><Label>Reason</Label><Input value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} /></div>
              <div className="flex items-end">
                <Button
                  disabled={createLeave.isPending}
                  onClick={() => {
                    if (!leaveForm.employeeId || !leaveForm.from || !leaveForm.to) return toast.error("Employee and dates are required");
                    createLeave.mutate(leaveForm);
                  }}
                >Submit</Button>
              </div>
            </CardContent>
          </Card>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Ref</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead>
                <TableHead>Period</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No leave requests</TableCell></TableRow>
                ) : leaves.map((l) => (
                  <TableRow key={l._id}>
                    <TableCell className="font-mono text-xs">{l.requestNumber || "—"}</TableCell>
                    <TableCell>{l.employeeName || hr.employeeFullName(l.employee)}</TableCell>
                    <TableCell>{hr.titleCase(l.leaveType)}</TableCell>
                    <TableCell className="text-xs">{new Date(l.from).toLocaleDateString()} → {new Date(l.to).toLocaleDateString()}</TableCell>
                    <TableCell>{l.days}</TableCell>
                    <TableCell><Badge variant={l.status === "approved" ? "default" : l.status === "pending" ? "secondary" : "outline"}>{hr.titleCase(l.status)}</Badge></TableCell>
                    <TableCell className="text-right">
                      {l.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => decideLeave.mutate({ id: l._id, status: "approved" })}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => decideLeave.mutate({ id: l._id, status: "rejected" })}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly payroll</CardTitle>
              <CardDescription>Generated from attendance and approved leave. Paid salaries post to expenses automatically.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(period.month)} onValueChange={(v) => setPeriod((p) => ({ ...p, month: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{monthOptions.map((m) => <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" })}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))} /></div>
              <div className="flex items-end"><Button disabled={generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? "Generating..." : "Generate / refresh"}</Button></div>
              <div className="space-y-2">
                <Label>Open run</Label>
                <Select value={runId} onValueChange={setRunId}>
                  <SelectTrigger><SelectValue placeholder="Select a run" /></SelectTrigger>
                  <SelectContent>{runs.map((r) => <SelectItem key={r._id} value={r._id}>{r.period} · {hr.titleCase(r.status)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {run && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{run.period} · {hr.titleCase(run.status)}</CardTitle>
                  <CardDescription>Gross {money(run.totalGross)} · Deductions {money(run.totalDeductions)} · Net {money(run.totalNet)} · Paid {money(run.totalPaid)}</CardDescription>
                </div>
                {run.status === "draft" && <Button size="sm" onClick={() => finalize.mutate(run._id)}>Finalize</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employee</TableHead><TableHead>Present</TableHead><TableHead>Paid leave</TableHead>
                    <TableHead>Payable days</TableHead><TableHead>Earned</TableHead><TableHead>Deductions</TableHead>
                    <TableHead>Net</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {run.items.map((slip) => (
                      <TableRow key={slip._id}>
                        <TableCell className="font-medium">{slip.employeeName}<span className="ml-1 text-xs text-muted-foreground">({slip.employeeCode})</span></TableCell>
                        <TableCell>{slip.presentDays}</TableCell>
                        <TableCell>{slip.paidLeaveDays}</TableCell>
                        <TableCell>{slip.payableDays}/{slip.monthDays}</TableCell>
                        <TableCell>{money(slip.earnedGross)}</TableCell>
                        <TableCell>{money(slip.totalDeductions)}</TableCell>
                        <TableCell className="font-semibold">{money(slip.netPay)}</TableCell>
                        <TableCell className="text-right">
                          {slip.paid
                            ? <Badge variant="default">Paid</Badge>
                            : run.status !== "draft"
                              ? <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate({ slipId: slip._id })}>Mark paid</Button>
                              : <span className="text-xs text-muted-foreground">Finalize first</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />

      <QrScheduleDialog
        open={qrScheduleOpen}
        onOpenChange={setQrScheduleOpen}
        onBulkRotate={() => bulkRotate.mutateAsync({})}
        isPending={bulkRotate.isPending}
      />

      <Dialog open={Boolean(cardEmployee)} onOpenChange={(open) => !open && setCardEmployee(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Staff ID card — {hr.employeeFullName(cardEmployee)}</DialogTitle></DialogHeader>
          <EmployeeIdCard
            employee={cardEmployee}
            hospital={hospital}
            onRotate={(id) => rotate.mutate(id)}
            isRotating={rotate.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
