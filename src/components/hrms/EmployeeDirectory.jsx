import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, UserRound } from "lucide-react";
import * as he from "@/lib/hrms-employees";

const emptyEmployee = {
  firstName: "", lastName: "", staffCategory: "other", designation: "", department: "",
  employmentType: "full_time", phone: "", email: "", joiningDate: "",
};

const emptySubForms = {
  licenses: { type: "medical_council", number: "", issuingAuthority: "", issuedOn: "", expiresOn: "" },
  certifications: { name: "", provider: "", certifiedOn: "", expiresOn: "" },
  immunizations: { vaccine: "hep_b", doseLabel: "", administeredOn: "", nextDueOn: "" },
  healthChecks: { checkType: "annual", performedOn: "", nextDueOn: "", findings: "", fitForDuty: true },
  hazardExposures: { exposureType: "needle_stick", occurredOn: "", description: "" },
  privileges: { procedure: "", specialty: "", level: "assist", grantedOn: "", expiresOn: "" },
};

function EmployeeForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(emptyEmployee);
  const isEdit = Boolean(editing);

  useMemo(() => {
    if (open) {
      setForm(editing
        ? { ...emptyEmployee, ...editing, joiningDate: editing.joiningDate?.slice(0, 10) || "" }
        : emptyEmployee);
    }
  }, [open, editing]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: (payload) => (isEdit ? he.updateHrmsEmployee(editing._id, payload) : he.createHrmsEmployee(payload)),
    onSuccess: async () => {
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onOpenChange(false);
      await onSaved?.();
    },
    onError: (err) => toast.error(err.message || "Could not save employee"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit employee" : "New employee"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>First name *</Label><Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Staff category</Label>
            <Select value={form.staffCategory} onValueChange={(v) => set("staffCategory", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{he.STAFF_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{he.titleCase(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Designation</Label><Input value={form.designation || ""} onChange={(e) => set("designation", e.target.value)} /></div>
          <div className="space-y-2"><Label>Department</Label><Input value={form.department || ""} onChange={(e) => set("department", e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-2"><Label>Joining date</Label><Input type="date" value={form.joiningDate || ""} onChange={(e) => set("joiningDate", e.target.value)} /></div>
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

const SUB_CONFIG = {
  licenses: {
    label: "Licenses", api: he.licensesApi,
    fields: [
      { key: "type", label: "Type", type: "select", options: he.LICENSE_TYPES },
      { key: "number", label: "Number", type: "text" },
      { key: "issuingAuthority", label: "Issuing authority", type: "text" },
      { key: "issuedOn", label: "Issued on", type: "date" },
      { key: "expiresOn", label: "Expires on", type: "date" },
    ],
    columns: (row) => [he.titleCase(row.type), row.number, row.issuingAuthority, row.expiresOn?.slice(0, 10) || "—"],
    headers: ["Type", "Number", "Authority", "Expires"],
  },
  certifications: {
    label: "Certifications", api: he.certificationsApi,
    fields: [
      { key: "name", label: "Name (e.g. BLS, ACLS)", type: "text" },
      { key: "provider", label: "Provider", type: "text" },
      { key: "certifiedOn", label: "Certified on", type: "date" },
      { key: "expiresOn", label: "Expires on", type: "date" },
    ],
    columns: (row) => [row.name, row.provider, row.certifiedOn?.slice(0, 10) || "—", row.expiresOn?.slice(0, 10) || "—"],
    headers: ["Name", "Provider", "Certified", "Expires"],
  },
  immunizations: {
    label: "Immunizations", api: he.immunizationsApi,
    fields: [
      { key: "vaccine", label: "Vaccine", type: "select", options: he.IMMUNIZATION_VACCINES },
      { key: "doseLabel", label: "Dose", type: "text" },
      { key: "administeredOn", label: "Administered on", type: "date" },
      { key: "nextDueOn", label: "Next due on", type: "date" },
    ],
    columns: (row) => [he.titleCase(row.vaccine), row.doseLabel, row.administeredOn?.slice(0, 10) || "—", row.nextDueOn?.slice(0, 10) || "—"],
    headers: ["Vaccine", "Dose", "Administered", "Next due"],
  },
  healthChecks: {
    label: "Health checks", api: he.healthChecksApi,
    fields: [
      { key: "checkType", label: "Type", type: "select", options: he.HEALTH_CHECK_TYPES },
      { key: "performedOn", label: "Performed on", type: "date" },
      { key: "nextDueOn", label: "Next due on", type: "date" },
      { key: "findings", label: "Findings", type: "text" },
    ],
    columns: (row) => [he.titleCase(row.checkType), row.performedOn?.slice(0, 10) || "—", row.nextDueOn?.slice(0, 10) || "—", row.fitForDuty ? "Fit" : "Not fit"],
    headers: ["Type", "Performed", "Next due", "Status"],
  },
  hazardExposures: {
    label: "Hazard exposures", api: he.hazardExposuresApi,
    fields: [
      { key: "exposureType", label: "Type", type: "select", options: he.HAZARD_EXPOSURE_TYPES },
      { key: "occurredOn", label: "Occurred on", type: "date" },
      { key: "description", label: "Description", type: "text" },
    ],
    columns: (row) => [he.titleCase(row.exposureType), row.occurredOn?.slice(0, 10) || "—", row.description, row.followUpDone ? "Done" : "Pending"],
    headers: ["Type", "Occurred", "Description", "Follow-up"],
  },
  privileges: {
    label: "Privileges", api: he.privilegesApi,
    fields: [
      { key: "procedure", label: "Procedure", type: "text" },
      { key: "specialty", label: "Specialty", type: "text" },
      { key: "level", label: "Level", type: "select", options: he.PRIVILEGE_LEVELS },
      { key: "grantedOn", label: "Granted on", type: "date" },
      { key: "expiresOn", label: "Expires on", type: "date" },
    ],
    columns: (row) => [row.procedure, row.specialty, he.titleCase(row.level), row.status, row.expiresOn?.slice(0, 10) || "—"],
    headers: ["Procedure", "Specialty", "Level", "Status", "Expires"],
  },
};

function SubArrayEditor({ employeeId, field, rows, onChanged }) {
  const config = SUB_CONFIG[field];
  const [form, setForm] = useState(emptySubForms[field]);

  const add = useMutation({
    mutationFn: () => config.api.add(employeeId, form),
    onSuccess: async () => { toast.success(`${config.label.slice(0, -1)} added`); setForm(emptySubForms[field]); await onChanged?.(); },
    onError: (e) => toast.error(e.message || "Could not add entry"),
  });
  const remove = useMutation({
    mutationFn: (itemId) => config.api.remove(employeeId, itemId),
    onSuccess: async () => { toast.success("Entry removed"); await onChanged?.(); },
    onError: (e) => toast.error(e.message || "Could not remove entry"),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-5 items-end">
        {config.fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            {f.type === "select" ? (
              <Select value={form[f.key]} onValueChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{he.titleCase(o)}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input type={f.type} value={form[f.key] || ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
        <Button size="sm" disabled={add.isPending} onClick={() => add.mutate()}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          {config.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {(rows || []).length === 0 ? (
            <TableRow><TableCell colSpan={config.headers.length + 1} className="text-center text-muted-foreground">No entries yet</TableCell></TableRow>
          ) : rows.map((row) => (
            <TableRow key={row._id}>
              {config.columns(row).map((v, i) => <TableCell key={i}>{v || "—"}</TableCell>)}
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(row._id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmployeeDrillIn({ employeeId, onOpenChange }) {
  const { data: employee, refetch } = useQuery({
    queryKey: ["hrms-employee", employeeId],
    queryFn: () => he.getHrmsEmployee(employeeId),
    enabled: Boolean(employeeId),
  });

  return (
    <Dialog open={Boolean(employeeId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{he.employeeFullName(employee)} — {he.titleCase(employee?.staffCategory)}</DialogTitle>
        </DialogHeader>
        {employee && (
          <Tabs defaultValue="licenses">
            <TabsList className="flex-wrap h-auto">
              {Object.entries(SUB_CONFIG).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key}>{cfg.label}</TabsTrigger>
              ))}
            </TabsList>
            {Object.keys(SUB_CONFIG).map((key) => (
              <TabsContent key={key} value={key} className="pt-3">
                <SubArrayEditor employeeId={employee._id} field={key} rows={employee[key]} onChanged={refetch} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeeDirectory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [staffCategory, setStaffCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drillInId, setDrillInId] = useState(null);

  const employeesQ = useQuery({
    queryKey: ["hrms-employees", search, staffCategory, page],
    queryFn: () => he.listHrmsEmployees({
      search: search || undefined,
      staffCategory: staffCategory === "all" ? undefined : staffCategory,
      page, limit: 20,
    }),
  });

  const employees = employeesQ.data?.items || [];
  const pages = employeesQ.data?.pages || 1;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hrms-employees"] });

  const deactivate = useMutation({
    mutationFn: (id) => he.deactivateHrmsEmployee(id),
    onSuccess: async () => { toast.success("Employee marked inactive"); await invalidate(); },
    onError: (e) => toast.error(e.message || "Could not deactivate"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search name, code, designation…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          <Select value={staffCategory} onValueChange={(v) => { setStaffCategory(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {he.STAFF_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{he.titleCase(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />New employee</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
            <TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No employees yet</TableCell></TableRow>
            ) : employees.map((emp) => (
              <TableRow key={emp._id}>
                <TableCell>{emp.employeeCode}</TableCell>
                <TableCell>{he.employeeFullName(emp)}</TableCell>
                <TableCell><Badge variant="outline">{he.titleCase(emp.staffCategory)}</Badge></TableCell>
                <TableCell>{emp.department || "—"}</TableCell>
                <TableCell>{emp.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setDrillInId(emp._id)}><UserRound className="mr-1 h-3.5 w-3.5" />Records</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(emp); setFormOpen(true); }}>Edit</Button>
                  {emp.isActive && (
                    <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(emp._id)}>Deactivate</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {pages > 1 && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground self-center">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <EmployeeForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />
      <EmployeeDrillIn employeeId={drillInId} onOpenChange={(v) => !v && setDrillInId(null)} />
    </div>
  );
}
