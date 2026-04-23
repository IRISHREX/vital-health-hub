import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Check, X, Clock, ShieldAlert, Inbox, PlayCircle, Mail, Users, Timer, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  listApprovalRules, createApprovalRule, updateApprovalRule, deleteApprovalRule,
  listApprovalRequests, respondApprovalRequest, findApplicableRule,
  APPROVAL_MODULES, APPROVAL_ACTIONS, APPROVAL_ROLES
} from "@/lib/approvals";

const emptyRule = {
  name: "",
  description: "",
  enabled: true,
  module: "patients",
  action: "delete",
  actionLabel: "",
  approverType: "role",
  approverEmail: "",
  approverRole: "hospital_admin",
  formFields: [],
  slaHours: 24,
  escalationEmail: "",
  escalationRole: "",
  blocking: "hard",
};

function FieldEditor({ fields, onChange }) {
  const update = (i, key, val) => {
    const next = [...fields];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...fields, { key: `field_${fields.length + 1}`, label: "New Field", type: "text", required: false, options: [] }]);
  const remove = (i) => onChange(fields.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Form Fields</Label>
        <Button size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-3 w-3" />Add Field</Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">No custom fields. Requesters will only see a Submit button.</p>}
      {fields.map((f, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Key (no spaces)</Label>
              <Input value={f.key} onChange={(e) => update(i, "key", e.target.value.replace(/\s+/g, "_"))} />
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={f.label} onChange={(e) => update(i, "label", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={f.type} onValueChange={(v) => update(i, "type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["text", "textarea", "number", "date", "select", "checkbox"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={f.required} onCheckedChange={(v) => update(i, "required", v)} />
              <span className="text-xs">Required</span>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {f.type === "select" && (
            <div>
              <Label className="text-xs">Options (comma-separated)</Label>
              <Input
                value={(f.options || []).join(", ")}
                onChange={(e) => update(i, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Placeholder</Label>
            <Input value={f.placeholder || ""} onChange={(e) => update(i, "placeholder", e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RuleDialog({ rule, onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(rule || emptyRule);

  const handleOpen = (o) => {
    setOpen(o);
    if (o) setData(rule || emptyRule);
  };

  const save = async () => {
    if (!data.name?.trim()) return toast.error("Name required");
    if (data.approverType === "email" && !data.approverEmail) return toast.error("Approver email required");
    if (data.approverType === "role" && !data.approverRole) return toast.error("Approver role required");
    await onSave(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Approval Rule" : "New Approval Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="e.g. Patient deletion approval" />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={data.enabled} onCheckedChange={(v) => setData({ ...data, enabled: v })} />
              <span className="text-sm pb-2">Enabled</span>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Module</Label>
              <Select value={data.module} onValueChange={(v) => setData({ ...data, module: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APPROVAL_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action</Label>
              <Select value={data.action} onValueChange={(v) => setData({ ...data, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APPROVAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action Label (optional)</Label>
              <Input value={data.actionLabel} onChange={(e) => setData({ ...data, actionLabel: e.target.value })} placeholder="e.g. discharge" />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <Label className="text-sm font-semibold">Approver</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={data.approverType} onValueChange={(v) => setData({ ...data, approverType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Specific Email</SelectItem>
                    <SelectItem value="role">By Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {data.approverType === "email" ? (
                <div className="col-span-2">
                  <Label className="text-xs">Approver Email</Label>
                  <Input type="email" value={data.approverEmail} onChange={(e) => setData({ ...data, approverEmail: e.target.value })} />
                </div>
              ) : (
                <div className="col-span-2">
                  <Label className="text-xs">Approver Role</Label>
                  <Select value={data.approverRole} onValueChange={(v) => setData({ ...data, approverRole: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APPROVAL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <Label className="text-sm font-semibold">SLA & Escalation</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">SLA (hours)</Label>
                <Input type="number" min="1" value={data.slaHours} onChange={(e) => setData({ ...data, slaHours: parseInt(e.target.value) || 24 })} />
              </div>
              <div>
                <Label className="text-xs">Escalation Email</Label>
                <Input type="email" value={data.escalationEmail} onChange={(e) => setData({ ...data, escalationEmail: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Escalation Role</Label>
                <Select value={data.escalationRole || "_none"} onValueChange={(v) => setData({ ...data, escalationRole: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {APPROVAL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Blocking Mode</Label>
              <Select value={data.blocking} onValueChange={(v) => setData({ ...data, blocking: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hard">Hard (action blocked until approved)</SelectItem>
                  <SelectItem value="soft">Soft (warn only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <FieldEditor fields={data.formFields || []} onChange={(f) => setData({ ...data, formFields: f })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestRespondDialog({ request, onDone }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("approved");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await respondApprovalRequest(request._id, { decision, comment });
      toast.success(`Request ${decision}`);
      setOpen(false);
      setComment("");
      onDone?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Respond</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Respond to: {request.ruleName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm space-y-1">
            <p><strong>Requester:</strong> {request.requesterName || request.requesterEmail}</p>
            <p><strong>Module/Action:</strong> {request.module} / {request.action}</p>
            <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleString()}</p>
            <p><strong>Due:</strong> {new Date(request.dueAt).toLocaleString()}</p>
          </div>
          {Object.keys(request.formData || {}).length > 0 && (
            <div className="rounded-md border p-2 bg-muted/30 text-xs space-y-1">
              {Object.entries(request.formData).map(([k, v]) => (
                <div key={k}><strong>{k}:</strong> {String(v)}</div>
              ))}
            </div>
          )}
          <div>
            <Label>Decision</Label>
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Comment</Label>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimulatePreview({ rule, requesterName, requesterEmail, formData }) {
  if (!rule) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
        No enabled approval rule matches this module + action. The action would proceed immediately without approval.
      </div>
    );
  }
  const dueAt = new Date(Date.now() + (rule.slaHours || 24) * 60 * 60 * 1000);
  const escalationTarget = rule.escalationEmail || (rule.escalationRole ? `Role: ${rule.escalationRole}` : null);
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{rule.module} · {rule.action}</Badge>
          <Badge variant="outline">{rule.blocking}</Badge>
          {!rule.enabled && <Badge variant="destructive">Disabled</Badge>}
          <span className="font-semibold text-sm">{rule.name}</span>
        </div>
        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {rule.approverType === "email" ? <Mail className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            APPROVER
          </div>
          <p className="font-medium">
            {rule.approverType === "email" ? rule.approverEmail : `Role: ${rule.approverRole}`}
          </p>
        </div>
        <div className="rounded-md border p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Timer className="h-3 w-3" />SLA / DUE
          </div>
          <p className="font-medium">{rule.slaHours}h → {dueAt.toLocaleString()}</p>
        </div>
        <div className="rounded-md border p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldAlert className="h-3 w-3" />ESCALATION
          </div>
          <p className="font-medium">{escalationTarget || <span className="text-muted-foreground">None configured</span>}</p>
        </div>
        <div className="rounded-md border p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            REQUESTER (sample)
          </div>
          <p className="font-medium">{requesterName || "—"}</p>
          <p className="text-xs text-muted-foreground">{requesterEmail || "—"}</p>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
          <FileText className="h-3 w-3" />FORM FIELDS REQUESTER WILL SEE
        </div>
        {(!rule.formFields || rule.formFields.length === 0) ? (
          <p className="text-xs text-muted-foreground">No custom fields. Requester sees only a Submit button.</p>
        ) : (
          <div className="space-y-1.5">
            {rule.formFields.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground ml-1">({f.key} · {f.type})</span>
                </span>
                {f.required && <Badge variant="outline" className="text-xs">required</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      {formData && Object.keys(formData).length > 0 && (
        <div className="rounded-md border p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">SAMPLE FORM DATA</div>
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(formData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function SimulateDialog({ trigger, presetRule = null, lookup = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [module, setModule] = useState(presetRule?.module || "patients");
  const [action, setAction] = useState(presetRule?.action || "delete");
  const [requesterName, setRequesterName] = useState(
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Sample User"
  );
  const [requesterEmail, setRequesterEmail] = useState(user?.email || "sample@hospital.com");
  const [resolvedRule, setResolvedRule] = useState(presetRule);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({});

  const runLookup = async () => {
    try {
      setLoading(true);
      const res = await findApplicableRule(module, action);
      setResolvedRule(res?.data || null);
    } catch (e) {
      toast.error(e.message);
      setResolvedRule(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (o) => {
    setOpen(o);
    if (o) {
      if (presetRule) setResolvedRule(presetRule);
      setFormValues({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Simulate Approval Request {presetRule ? `— ${presetRule.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {lookup && (
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs">Module</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={runLookup} disabled={loading}>
                {loading ? "Looking up…" : "Find Rule"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sample requester name</Label>
              <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Sample requester email</Label>
              <Input type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} />
            </div>
          </div>

          {resolvedRule?.formFields?.length > 0 && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <Label className="text-xs font-semibold">Try the form (optional)</Label>
              {resolvedRule.formFields.map((f, i) => (
                <div key={i}>
                  <Label className="text-xs">
                    {f.label}{f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={2}
                      placeholder={f.placeholder}
                      value={formValues[f.key] || ""}
                      onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                    />
                  ) : f.type === "select" ? (
                    <Select value={formValues[f.key] || ""} onValueChange={(v) => setFormValues({ ...formValues, [f.key]: v })}>
                      <SelectTrigger><SelectValue placeholder={f.placeholder || "Select..."} /></SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === "checkbox" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={!!formValues[f.key]}
                        onCheckedChange={(v) => setFormValues({ ...formValues, [f.key]: v })}
                      />
                      <span className="text-xs">{f.placeholder || "Toggle"}</span>
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      placeholder={f.placeholder}
                      value={formValues[f.key] || ""}
                      onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <SimulatePreview
            rule={resolvedRule}
            requesterName={requesterName}
            requesterEmail={requesterEmail}
            formData={formValues}
          />

          <p className="text-xs text-muted-foreground italic">
            This is a preview only — no request is created and no notifications are sent.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApprovalsManager({ isAdmin = true }) {
  const qc = useQueryClient();
  const { data: rulesRes } = useQuery({ queryKey: ["approval-rules"], queryFn: () => listApprovalRules() });
  const rules = rulesRes?.data || [];

  const { data: reqsRes } = useQuery({ queryKey: ["approval-requests"], queryFn: () => listApprovalRequests({ scope: "all" }) });
  const requests = reqsRes?.data || [];

  const createMut = useMutation({
    mutationFn: createApprovalRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approval-rules"] }); toast.success("Rule created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateApprovalRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approval-rules"] }); toast.success("Rule updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: deleteApprovalRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approval-rules"] }); toast.success("Rule deleted"); },
  });

  const pending = requests.filter((r) => ["pending", "escalated"].includes(r.status));
  const completed = requests.filter((r) => !["pending", "escalated"].includes(r.status));

  const refresh = () => qc.invalidateQueries({ queryKey: ["approval-requests"] });

  const statusBadge = (s) => {
    const map = {
      pending: "secondary", approved: "default", rejected: "destructive",
      escalated: "destructive", expired: "outline"
    };
    return <Badge variant={map[s] || "outline"} className="capitalize">{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <ShieldAlert className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Dynamic Approval Workflows</p>
          <p className="text-muted-foreground">
            Define rules that gate any module action behind an approval request. Requesters fill a custom form;
            approvers (by email or role) get notified by email + in-app, with SLA-based escalation.
          </p>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="pending"><Clock className="mr-1 h-3 w-3" />Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="history"><Inbox className="mr-1 h-3 w-3" />History ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <RuleDialog
                onSave={(d) => createMut.mutateAsync(d)}
                trigger={<Button><Plus className="mr-1 h-4 w-4" />New Rule</Button>}
              />
            </div>
          )}
          {rules.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No approval rules configured.</CardContent></Card>
          ) : rules.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.name}</p>
                    {!r.enabled && <Badge variant="outline">Disabled</Badge>}
                    <Badge variant="secondary">{r.module} · {r.action}</Badge>
                    <Badge variant="outline">{r.blocking}</Badge>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Approver: {r.approverType === "email" ? r.approverEmail : `Role: ${r.approverRole}`}
                    {" · "}SLA: {r.slaHours}h
                    {r.formFields?.length > 0 && ` · ${r.formFields.length} form field(s)`}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <RuleDialog
                      rule={r}
                      onSave={(d) => updateMut.mutateAsync({ id: r._id, data: d })}
                      trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(r._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-2">
          {pending.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending requests</CardContent></Card>
          ) : pending.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.ruleName}</p>
                    {statusBadge(r.status)}
                    <Badge variant="outline">{r.module} · {r.action}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {r.requesterName || r.requesterEmail} · Due {new Date(r.dueAt).toLocaleString()}
                  </p>
                </div>
                <RequestRespondDialog request={r} onDone={refresh} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {completed.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No history</CardContent></Card>
          ) : completed.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.ruleName}</p>
                    {statusBadge(r.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.requesterName || r.requesterEmail} · {r.module}/{r.action} ·{" "}
                    {r.reviewedAt ? `Reviewed ${new Date(r.reviewedAt).toLocaleString()}` : ""}
                    {r.reviewComment ? ` — "${r.reviewComment}"` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
