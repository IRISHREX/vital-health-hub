import { useMemo, useState } from "react";
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
import { getHospitalSettings } from "@/lib/settings";
import { resolveBranding, printBrandedHtml } from "@/lib/branding";
import { buildDocumentCodes } from "@/lib/document-codes";
import PatientAutocomplete from "@/components/shared/PatientAutocomplete";
import * as api from "@/lib/vital-records";
import { Pencil, Printer, CheckCircle2, X } from "lucide-react";

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

const statusVariant = {
  draft: "outline",
  registered: "secondary",
  certificate_issued: "default",
  cancelled: "destructive",
};

const statusLabel = {
  draft: "Draft",
  registered: "Registered",
  certificate_issued: "Certificate Issued",
  cancelled: "Cancelled",
};

const emptyBirth = {
  patient: "",
  patientLabel: "",
  babyName: "",
  gender: "other",
  dateOfBirth: "",
  timeOfBirth: "",
  weightGrams: "",
  gestationWeeks: "",
  deliveryType: "normal",
  multipleBirth: "single",
  placeOfBirth: "",
  ward: "",
  motherName: "",
  motherAge: "",
  fatherName: "",
  address: "",
  phone: "",
  informantName: "",
  informantRelation: "",
  notes: "",
};

const emptyDeath = {
  patient: "",
  patientLabel: "",
  deceasedName: "",
  gender: "other",
  age: "",
  ageUnit: "years",
  dateOfDeath: "",
  timeOfDeath: "",
  placeOfDeath: "hospital",
  ward: "",
  causeImmediate: "",
  causeAntecedent: "",
  causeUnderlying: "",
  mannerOfDeath: "natural",
  policeInformed: false,
  informantName: "",
  informantRelation: "",
  phone: "",
  address: "",
  notes: "",
};

/** Pure: strip empty strings so optional numeric/date fields are not sent as "". */
const cleanPayload = (form) =>
  Object.entries(form).reduce((acc, [key, value]) => {
    if (value !== "" && value !== null && value !== undefined) acc[key] = value;
    return acc;
  }, {});

const todayLocalStrings = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

const parseLocalDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const isFutureLocalDate = (value) => {
  if (!value) return false;
  const date = parseLocalDate(value);
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const localValue = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return localValue > localToday;
};

const isTodayLocalDate = (value) => {
  if (!value) return false;
  const date = parseLocalDate(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isFutureLocalTime = (value) => {
  if (!value) return false;
  const [hour, minute] = value.split(":").map(Number);
  const now = new Date();
  return hour * 60 + minute > now.getHours() * 60 + now.getMinutes();
};

const detailRows = (record, fields) =>
  fields
    .filter(([, key]) => record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "")
    .map(([label, key, format]) => `<tr><th>${label}</th><td>${format ? format(record[key]) : record[key]}</td></tr>`)
    .join("");

function CertificatePrinter({ record, kind, hospitalSettings }) {
  const print = () => {
    const isBirth = kind === "birth";
    const fields = isBirth
      ? [
          ["Certificate No.", "certificateNumber"],
          ["Record No.", "recordNumber"],
          ["Name of Child", "babyName"],
          ["Sex", "gender"],
          ["Date of Birth", "dateOfBirth", fmtDate],
          ["Time of Birth", "timeOfBirth"],
          ["Place of Birth", "placeOfBirth"],
          ["Weight (g)", "weightGrams"],
          ["Delivery Type", "deliveryType"],
          ["Name of Mother", "motherName"],
          ["Name of Father", "fatherName"],
          ["Address", "address"],
          ["Informant", "informantName"],
        ]
      : [
          ["Certificate No.", "certificateNumber"],
          ["Record No.", "recordNumber"],
          ["Name of Deceased", "deceasedName"],
          ["Sex", "gender"],
          ["Age", "age"],
          ["Date of Death", "dateOfDeath", fmtDate],
          ["Time of Death", "timeOfDeath"],
          ["Place of Death", "placeOfDeath"],
          ["Immediate Cause", "causeImmediate"],
          ["Antecedent Cause", "causeAntecedent"],
          ["Underlying Cause", "causeUnderlying"],
          ["Manner of Death", "mannerOfDeath"],
          ["Informant", "informantName"],
          ["Address", "address"],
        ];

    const body = `
      <h2 style="text-align:center;margin:12px 0 4px">${isBirth ? "CERTIFICATE OF BIRTH" : "CERTIFICATE OF DEATH"}</h2>
      <table class="kv" style="width:100%;border-collapse:collapse">
        ${detailRows(record, fields)}
      </table>
      <style>
        table.kv th, table.kv td { border:1px solid #999; padding:6px 8px; font-size:13px; text-align:left; }
        table.kv th { width:35%; background:#f4f7fa; }
      </style>
    `;

    const branding = resolveBranding(hospitalSettings, "report");
    const codes = buildDocumentCodes({
      docId: record?._id,
      patientId: record?.patient?._id || record?.patient,
      type: isBirth ? "birth-certificate" : "death-certificate",
    });
    printBrandedHtml(
      isBirth ? "Birth Certificate" : "Death Certificate",
      branding,
      body,
      "",
      codes
    );
  };

  return (
    <Button size="icon" variant="ghost" title="Print certificate" onClick={print}>
      <Printer className="h-4 w-4" />
    </Button>
  );
}

function RecordsTab({ kind, permissions, hospitalSettings }) {
  const qc = useQueryClient();
  const isBirth = kind === "birth";
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(isBirth ? emptyBirth : emptyDeath);
  const [editing, setEditing] = useState(null);

  const listKey = ["vital-records", kind, filters];
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      (isBirth ? api.listBirthRecords : api.listDeathRecords)({
        search: filters.search || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      }),
  });
  const rows = data?.items || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["vital-records"] });

  const save = useMutation({
    mutationFn: (payload) =>
      editing
        ? (isBirth ? api.updateBirthRecord : api.updateDeathRecord)(editing._id, payload)
        : (isBirth ? api.createBirthRecord : api.createDeathRecord)(payload),
    onSuccess: () => {
      toast({ title: editing ? "Record updated" : "Record registered" });
      setFormOpen(false);
      setEditing(null);
      setForm(isBirth ? emptyBirth : emptyDeath);
      invalidate();
    },
    onError: (e) => toast({ title: "Could not save record", description: e.message, variant: "destructive" }),
  });

  const issue = useMutation({
    mutationFn: (id) => (isBirth ? api.issueBirthCertificate : api.issueDeathCertificate)(id),
    onSuccess: () => {
      toast({ title: "Certificate issued" });
      invalidate();
    },
    onError: (e) => toast({ title: "Could not issue certificate", description: e.message, variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: (id) => (isBirth ? api.cancelBirthRecord : api.cancelDeathRecord)(id),
    onSuccess: () => {
      toast({ title: "Record cancelled" });
      invalidate();
    },
    onError: (e) => toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm(isBirth ? emptyBirth : emptyDeath);
    setFormOpen(true);
  };

  const openEdit = (record) => {
    const base = isBirth ? emptyBirth : emptyDeath;
    const next = { ...base };
    Object.keys(base).forEach((key) => {
      const value = record[key];
      if (value === undefined || value === null) return;
      next[key] = key.startsWith("date") ? String(value).slice(0, 10) : value;
    });
    if (record.patient) {
      const p = typeof record.patient === "object" ? record.patient : null;
      next.patient = p?._id || record.patient;
      if (p) {
        const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
        next.patientLabel = p.patientId ? `${name} (${p.patientId})` : name;
      }
    }
    setEditing(record);
    setForm(next);
    setFormOpen(true);
  };

  const submit = () => {
    const required = isBirth
      ? [["motherName", "Mother's name"], ["dateOfBirth", "Date of birth"]]
      : [["deceasedName", "Name of deceased"], ["dateOfDeath", "Date of death"]];
    const missing = required.find(([key]) => !form[key]);
    if (missing) {
      toast({ title: `${missing[1]} is required`, variant: "destructive" });
      return;
    }

    const dateKey = isBirth ? "dateOfBirth" : "dateOfDeath";
    const timeKey = isBirth ? "timeOfBirth" : "timeOfDeath";
    if (isFutureLocalDate(form[dateKey])) {
      toast({ title: `${isBirth ? "Date of Birth" : "Date of Death"} cannot be in the future`, variant: "destructive" });
      return;
    }

    if (form[timeKey] && isTodayLocalDate(form[dateKey]) && isFutureLocalTime(form[timeKey])) {
      toast({ title: `${isBirth ? "Time of Birth" : "Time of Death"} cannot be in the future`, variant: "destructive" });
      return;
    }

    save.mutate(cleanPayload(form));
  };

  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Search</Label>
          <Input
            placeholder={isBirth ? "Baby, mother, father, record no." : "Deceased name, record no."}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(statusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        {permissions.canCreate && (
          <Button onClick={openNew}>{isBirth ? "Register Birth" : "Register Death"}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Record No.</TableHead>
                  <TableHead>{isBirth ? "Baby" : "Deceased"}</TableHead>
                  <TableHead>{isBirth ? "Mother" : "Age"}</TableHead>
                  <TableHead>{isBirth ? "Date of Birth" : "Date of Death"}</TableHead>
                  <TableHead>{isBirth ? "Delivery" : "Place"}</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading records…</TableCell></TableRow>
                )}
                {!isLoading && !rows.length && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No records found</TableCell></TableRow>
                )}
                {rows.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium">{record.recordNumber || "—"}</TableCell>
                    <TableCell>{isBirth ? record.babyName || "Baby of " + (record.motherName || "—") : record.deceasedName}</TableCell>
                    <TableCell>{isBirth ? record.motherName : `${record.age ?? "—"} ${record.age ? record.ageUnit : ""}`}</TableCell>
                    <TableCell>{fmtDate(isBirth ? record.dateOfBirth : record.dateOfDeath)}</TableCell>
                    <TableCell className="capitalize">{(isBirth ? record.deliveryType : record.placeOfDeath)?.replace(/_/g, " ")}</TableCell>
                    <TableCell>{record.certificateNumber || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[record.status] || "outline"}>
                        {statusLabel[record.status] || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {permissions.canEdit && record.status !== "cancelled" && (
                          <Button size="icon" variant="ghost" title="Edit record" onClick={() => openEdit(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {permissions.canEdit && record.status === "registered" && (
                          <Button size="icon" variant="ghost" title="Issue certificate" onClick={() => issue.mutate(record._id)} disabled={issue.isPending}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {record.status === "certificate_issued" && (
                          <Button size="icon" variant="ghost" title="Print certificate" onClick={() => {}}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        {permissions.canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Cancel record"
                            onClick={() => cancel.mutate(record._id)}
                            disabled={record.status === "certificate_issued"}
                          >
                            <X className="h-4 w-4" />
                          </Button>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] w-[98vw] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Register"} {isBirth ? "Birth Record" : "Death Record"}
            </DialogTitle>
          </DialogHeader>

          {isBirth ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Link Registered Patient / Mother (Optional)</Label>
                <PatientAutocomplete
                  value={form.patient || ""}
                  selectedLabel={form.patientLabel || ""}
                  placeholder="Type to search mother by name, phone, or UHID..."
                  onSelect={(p) => {
                    if (p) {
                      const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
                      let age = "";
                      if (p.dateOfBirth) {
                        age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
                      }
                      setForm((prev) => ({
                        ...prev,
                        patient: p._id,
                        patientLabel: p.patientId ? `${name} (${p.patientId})` : name,
                        motherName: name || prev.motherName,
                        motherAge: age !== "" ? age : prev.motherAge,
                        phone: p.contactNumber || p.phone || prev.phone,
                        address: p.address || prev.address,
                      }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        patient: "",
                        patientLabel: "",
                      }));
                    }
                  }}
                />
              </div>

              <div><Label>Baby Name</Label><Input value={form.babyName} onChange={(e) => field("babyName", e.target.value)} /></div>
              <div>
                <Label>Sex</Label>
                <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["male", "female", "other", "ambiguous"].map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date of Birth *</Label><Input type="date" max={todayLocalStrings().date} value={form.dateOfBirth} onChange={(e) => field("dateOfBirth", e.target.value)} /></div>
              <div><Label>Time of Birth</Label><Input type="time" max={todayLocalStrings().time} value={form.timeOfBirth} onChange={(e) => field("timeOfBirth", e.target.value)} /></div>
              <div><Label>Weight (grams)</Label><Input type="number" min="0" value={form.weightGrams} onChange={(e) => field("weightGrams", e.target.value)} /></div>
              <div><Label>Gestation (weeks)</Label><Input type="number" min="0" value={form.gestationWeeks} onChange={(e) => field("gestationWeeks", e.target.value)} /></div>
              <div>
                <Label>Delivery Type</Label>
                <Select value={form.deliveryType} onValueChange={(v) => field("deliveryType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["normal", "c_section", "assisted", "water", "other"].map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Multiple Birth</Label>
                <Select value={form.multipleBirth} onValueChange={(v) => field("multipleBirth", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["single", "twin", "triplet", "other"].map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Place of Birth</Label><Input value={form.placeOfBirth} onChange={(e) => field("placeOfBirth", e.target.value)} /></div>
              <div><Label>Ward</Label><Input value={form.ward} onChange={(e) => field("ward", e.target.value)} /></div>
              <div><Label>Mother's Name *</Label><Input value={form.motherName} onChange={(e) => field("motherName", e.target.value)} /></div>
              <div><Label>Mother's Age</Label><Input type="number" min="0" value={form.motherAge} onChange={(e) => field("motherAge", e.target.value)} /></div>
              <div><Label>Father's Name</Label><Input value={form.fatherName} onChange={(e) => field("fatherName", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => field("phone", e.target.value)} /></div>
              <div><Label>Informant</Label><Input value={form.informantName} onChange={(e) => field("informantName", e.target.value)} /></div>
              <div><Label>Informant Relation</Label><Input value={form.informantRelation} onChange={(e) => field("informantRelation", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Address</Label><Textarea value={form.address} onChange={(e) => field("address", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => field("notes", e.target.value)} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <Label className="text-xs font-semibold text-foreground">Link Registered Patient (Optional)</Label>
                <PatientAutocomplete
                  value={form.patient || ""}
                  selectedLabel={form.patientLabel || ""}
                  placeholder="Type to search deceased patient by name, phone, or UHID..."
                  onSelect={(p) => {
                    if (p) {
                      const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
                      let age = "";
                      if (p.dateOfBirth) {
                        age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
                      }
                      setForm((prev) => ({
                        ...prev,
                        patient: p._id,
                        patientLabel: p.patientId ? `${name} (${p.patientId})` : name,
                        deceasedName: name || prev.deceasedName,
                        gender: p.gender || prev.gender,
                        age: age !== "" ? age : prev.age,
                        phone: p.contactNumber || p.phone || prev.phone,
                        address: p.address || prev.address,
                      }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        patient: "",
                        patientLabel: "",
                      }));
                    }
                  }}
                />
              </div>

              <div className="sm:col-span-2"><Label>Name of Deceased *</Label><Input value={form.deceasedName} onChange={(e) => field("deceasedName", e.target.value)} /></div>
              <div>
                <Label>Sex</Label>
                <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["male", "female", "other"].map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Age</Label><Input type="number" min="0" value={form.age} onChange={(e) => field("age", e.target.value)} /></div>
              <div>
                <Label>Age Unit</Label>
                <Select value={form.ageUnit} onValueChange={(v) => field("ageUnit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["years", "months", "days"].map((u) => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date of Death *</Label><Input type="date" max={todayLocalStrings().date} value={form.dateOfDeath} onChange={(e) => field("dateOfDeath", e.target.value)} /></div>
              <div><Label>Time of Death</Label><Input type="time" max={todayLocalStrings().time} value={form.timeOfDeath} onChange={(e) => field("timeOfDeath", e.target.value)} /></div>
              <div>
                <Label>Place of Death</Label>
                <Select value={form.placeOfDeath} onValueChange={(v) => field("placeOfDeath", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["hospital", "home", "in_transit", "brought_dead", "other"].map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ward</Label><Input value={form.ward} onChange={(e) => field("ward", e.target.value)} /></div>
              <div>
                <Label>Manner of Death</Label>
                <Select value={form.mannerOfDeath} onValueChange={(v) => field("mannerOfDeath", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["natural", "accident", "suicide", "homicide", "pending_investigation", "undetermined"].map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3"><Label>Immediate Cause</Label><Input value={form.causeImmediate} onChange={(e) => field("causeImmediate", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Antecedent Cause</Label><Input value={form.causeAntecedent} onChange={(e) => field("causeAntecedent", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Underlying Cause</Label><Input value={form.causeUnderlying} onChange={(e) => field("causeUnderlying", e.target.value)} /></div>
              <div><Label>Informant</Label><Input value={form.informantName} onChange={(e) => field("informantName", e.target.value)} /></div>
              <div><Label>Relation</Label><Input value={form.informantRelation} onChange={(e) => field("informantRelation", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => field("phone", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Address</Label><Textarea value={form.address} onChange={(e) => field("address", e.target.value)} /></div>
              <div className="sm:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => field("notes", e.target.value)} /></div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Record"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const BirthDeathRecords = () => {
  const { getModulePermissions } = useVisualAuth();
  const permissions = getModulePermissions("vital_records");
  const { data: hospitalRes } = useQuery({ queryKey: ["hospital-settings"], queryFn: () => getHospitalSettings() });
  const hospitalSettings = hospitalRes?.data || hospitalRes || {};

  const { data: stats } = useQuery({ queryKey: ["vital-record-stats"], queryFn: () => api.getVitalRecordStats() });

  const cards = useMemo(
    () => [
      { label: "Births", value: stats?.births ?? 0 },
      { label: "Deaths", value: stats?.deaths ?? 0 },
      { label: "C-Sections", value: stats?.csections ?? 0 },
      { label: "Certificates Issued", value: stats?.certificatesIssued ?? 0 },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Birth &amp; Death Register</h1>
        <p className="text-sm text-muted-foreground">
          Statutory register with sequential record numbers, certificate issuance and branded printouts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{card.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="births">
        <TabsList>
          <TabsTrigger value="births">Birth Records</TabsTrigger>
          <TabsTrigger value="deaths">Death Records</TabsTrigger>
        </TabsList>
        <TabsContent value="births" className="pt-4">
          <RecordsTab kind="birth" permissions={permissions} hospitalSettings={hospitalSettings} />
        </TabsContent>
        <TabsContent value="deaths" className="pt-4">
          <RecordsTab kind="death" permissions={permissions} hospitalSettings={hospitalSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BirthDeathRecords;
