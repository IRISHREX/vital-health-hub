import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as roster from "@/lib/hrms-roster";

const emptyTemplate = {
  code: "", name: "", kind: "morning", startTime: "07:00", endTime: "15:00",
  breakMinutes: 30, unit: "general_ward", nightDifferentialPercent: 0,
  hazardAllowance: 0, minRestHoursAfter: 11, isActive: true,
};

function TemplateForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(emptyTemplate);
  const isEdit = Boolean(editing);

  useMemo(() => {
    if (open) setForm(editing ? { ...emptyTemplate, ...editing } : emptyTemplate);
  }, [open, editing]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: (payload) => (isEdit ? roster.updateShiftTemplate(editing._id, payload) : roster.createShiftTemplate(payload)),
    onSuccess: async () => {
      toast.success(isEdit ? "Shift template updated" : "Shift template created");
      onOpenChange(false);
      await onSaved?.();
    },
    onError: (err) => toast.error(err.message || "Could not save shift template"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isEdit ? "Edit shift template" : "New shift template"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} /></div>
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Kind</Label>
            <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{roster.SHIFT_KINDS.map((k) => <SelectItem key={k} value={k}>{roster.shiftKindLabel(k)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{roster.UNITS.map((u) => <SelectItem key={u} value={u}>{roster.unitLabel(u)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Start time</Label><Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
          <div className="space-y-2"><Label>End time</Label><Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
          <div className="space-y-2"><Label>Break (minutes)</Label><Input type="number" min="0" value={form.breakMinutes} onChange={(e) => set("breakMinutes", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Min rest hours after</Label><Input type="number" min="0" value={form.minRestHoursAfter} onChange={(e) => set("minRestHoursAfter", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Night differential (%)</Label><Input type="number" min="0" value={form.nightDifferentialPercent} onChange={(e) => set("nightDifferentialPercent", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Hazard allowance</Label><Input type="number" min="0" value={form.hazardAllowance} onChange={(e) => set("hazardAllowance", Number(e.target.value))} /></div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="template-active" />
            <Label htmlFor="template-active">Active</Label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (!form.code.trim() || !form.name.trim()) return toast.error("Code and name are required");
                save.mutate(form);
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

export default function ShiftTemplatesPanel() {
  const qc = useQueryClient();
  const [unitFilter, setUnitFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const templatesQ = useQuery({
    queryKey: ["hrms-roster", "shift-templates", unitFilter],
    queryFn: () => roster.listShiftTemplates({ unit: unitFilter === "all" ? undefined : unitFilter }),
  });
  const templates = templatesQ.data?.items || [];

  const remove = useMutation({
    mutationFn: (id) => roster.deleteShiftTemplate(id),
    onSuccess: async () => {
      toast.success("Shift template deactivated");
      await qc.invalidateQueries({ queryKey: ["hrms-roster", "shift-templates"] });
    },
    onError: (err) => toast.error(err.message || "Could not deactivate shift template"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Shift templates</CardTitle>
          <CardDescription>Reusable shift definitions used to build the roster.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              {roster.UNITS.map((u) => <SelectItem key={u} value={u}>{roster.unitLabel(u)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />New template</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Kind</TableHead>
              <TableHead>Unit</TableHead><TableHead>Time</TableHead><TableHead>Break</TableHead>
              <TableHead>Night diff.</TableHead><TableHead>Hazard</TableHead><TableHead>Min rest</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templatesQ.isLoading ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : templates.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No shift templates yet</TableCell></TableRow>
            ) : templates.map((t) => (
              <TableRow key={t._id}>
                <TableCell className="font-medium">{t.code}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{roster.shiftKindLabel(t.kind)}</TableCell>
                <TableCell>{roster.unitLabel(t.unit)}</TableCell>
                <TableCell>{t.startTime}–{t.endTime}</TableCell>
                <TableCell>{t.breakMinutes || 0}m</TableCell>
                <TableCell>{t.nightDifferentialPercent || 0}%</TableCell>
                <TableCell>{t.hazardAllowance || 0}</TableCell>
                <TableCell>{t.minRestHoursAfter ?? 11}h</TableCell>
                <TableCell><Badge variant={t.isActive ? "success" : "outline"}>{t.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={!t.isActive || remove.isPending} onClick={() => remove.mutate(t._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <TemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["hrms-roster", "shift-templates"] })}
      />
    </Card>
  );
}
