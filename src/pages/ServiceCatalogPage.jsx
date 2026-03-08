import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Pencil, Trash2, Loader2, Package, BedDouble,
  IndianRupee, Tag, ToggleRight, ShieldCheck
} from "lucide-react";
import {
  getServiceCatalog, createCatalogService, updateCatalogService, deleteCatalogService
} from "@/lib/serviceCatalog";
import {
  getRoomTypeServices, upsertRoomTypeService, updateServiceRule, removeServiceRule
} from "@/lib/roomTypeServices";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";

const categories = [
  { value: "room_utility", label: "Room Utility" },
  { value: "patient_support", label: "Patient Support" },
  { value: "consumable", label: "Consumable" },
  { value: "room_amenity", label: "Room Amenity" },
  { value: "administrative", label: "Administrative" },
  { value: "medical", label: "Medical Service" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "medication", label: "Medication" },
  { value: "room_billable", label: "Room Billable" },
  { value: "food_misc", label: "Food & Misc" },
  { value: "nursing", label: "Nursing" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "other", label: "Other" }
];

const units = [
  { value: "per_day", label: "Per Day" },
  { value: "per_hour", label: "Per Hour" },
  { value: "per_session", label: "Per Session" },
  { value: "per_use", label: "Per Use" },
  { value: "flat", label: "Flat Rate" },
  { value: "per_unit", label: "Per Unit" }
];

const roomTypes = [
  { value: "general", label: "General Ward" },
  { value: "semi_private", label: "Semi Private" },
  { value: "private", label: "Private Room" },
  { value: "icu", label: "ICU" },
  { value: "ccu", label: "CCU" },
  { value: "emergency", label: "Emergency" },
  { value: "ventilator", label: "Ventilator" },
  { value: "pediatric", label: "Pediatric" },
  { value: "maternity", label: "Maternity" }
];

const emptyService = {
  name: "", category: "other", subcategory: "", description: "",
  defaultBillable: true, defaultPrice: 0, unit: "per_use",
  taxable: false, taxPercent: 0, tags: ""
};

// ─── SERVICE CATALOG TAB ─────────────────────────────────
function ServiceCatalogTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(emptyService);

  const { data: res, isLoading } = useQuery({
    queryKey: ["service-catalog"],
    queryFn: () => getServiceCatalog()
  });

  const services = res?.data?.services || [];

  const createMut = useMutation({
    mutationFn: (payload) => createCatalogService(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-catalog"] }); toast.success("Service created"); handleClose(); },
    onError: (e) => toast.error(e.message || "Failed to create service")
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateCatalogService(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-catalog"] }); toast.success("Service updated"); handleClose(); },
    onError: (e) => toast.error(e.message || "Failed to update service")
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCatalogService(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-catalog"] }); toast.success("Service deleted"); },
    onError: (e) => toast.error(e.message || "Failed to delete service")
  });

  const handleClose = () => {
    setDialogOpen(false);
    setEditingService(null);
    setForm(emptyService);
  };

  const handleEdit = (svc) => {
    setEditingService(svc);
    setForm({
      name: svc.name, category: svc.category, subcategory: svc.subcategory || "",
      description: svc.description || "", defaultBillable: svc.defaultBillable,
      defaultPrice: svc.defaultPrice, unit: svc.unit,
      taxable: svc.taxable || false, taxPercent: svc.taxPercent || 0,
      tags: (svc.tags || []).join(", ")
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      defaultPrice: Number(form.defaultPrice) || 0,
      taxPercent: Number(form.taxPercent) || 0,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : []
    };
    if (editingService) {
      updateMut.mutate({ id: editingService._id, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const filtered = services.filter((s) => {
    if (catFilter !== "all" && s.category !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.serviceId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catLabel = (val) => categories.find(c => c.value === val)?.label || val;
  const unitLabel = (val) => units.find(u => u.value === val)?.label || val;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search services..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setForm(emptyService); setEditingService(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{services.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-status-occupied">{services.filter(s => s.defaultBillable).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Included (Free)</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-status-available">{services.filter(s => !s.defaultBillable).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{new Set(services.map(s => s.category)).size}</div></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Service ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No services found.</TableCell></TableRow>
              ) : filtered.map(svc => (
                <TableRow key={svc._id}>
                  <TableCell className="font-mono text-xs">{svc.serviceId}</TableCell>
                  <TableCell>
                    <div className="font-medium">{svc.name}</div>
                    {svc.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{svc.description}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{catLabel(svc.category)}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={svc.defaultBillable ? "destructive" : "success"}>
                      {svc.defaultBillable ? "Billable" : "Included"}
                    </Badge>
                  </TableCell>
                  <TableCell>{svc.defaultBillable ? `₹${svc.defaultPrice}` : "—"}</TableCell>
                  <TableCell className="text-sm">{unitLabel(svc.unit)}</TableCell>
                  <TableCell>
                    <Badge variant={svc.isActive ? "default" : "secondary"}>{svc.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(svc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                        if (window.confirm(`Delete "${svc.name}"?`)) deleteMut.mutate(svc._id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Service Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Oxygen Supply" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Subcategory</Label>
                <Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Default Price (₹)</Label>
                <Input type="number" min="0" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Default Billable</Label>
                <p className="text-xs text-muted-foreground">Charge patients by default for this service</p>
              </div>
              <Switch checked={form.defaultBillable} onCheckedChange={(v) => setForm({ ...form, defaultBillable: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Taxable</Label>
                <p className="text-xs text-muted-foreground">Apply tax on this service</p>
              </div>
              <Switch checked={form.taxable} onCheckedChange={(v) => setForm({ ...form, taxable: v })} />
            </div>
            {form.taxable && (
              <div className="grid gap-2">
                <Label>Tax %</Label>
                <Input type="number" min="0" max="100" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. room, basic, icu" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.category || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ROOM-SERVICE RULES TAB ──────────────────────────────
function RoomServiceRulesTab() {
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState("");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({ roomType: "", displayName: "", description: "", baseRate: 0 });
  const [ruleForm, setRuleForm] = useState({ serviceId: "", billable: false, overridePrice: "", notes: "" });

  const { data: rulesRes, isLoading: rulesLoading } = useQuery({
    queryKey: ["room-type-services"],
    queryFn: () => getRoomTypeServices()
  });
  const { data: catalogRes } = useQuery({
    queryKey: ["service-catalog"],
    queryFn: () => getServiceCatalog()
  });

  const roomConfigs = rulesRes?.data || [];
  const allServices = catalogRes?.data?.services || [];

  const selectedConfig = roomConfigs.find(r => r.roomType === selectedRoom);

  const upsertMut = useMutation({
    mutationFn: (payload) => upsertRoomTypeService(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-type-services"] });
      toast.success("Room type config saved");
      setRoomDialogOpen(false);
    },
    onError: (e) => toast.error(e.message || "Failed")
  });

  const updateRuleMut = useMutation({
    mutationFn: ({ roomType, payload }) => updateServiceRule(roomType, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-type-services"] });
      toast.success("Rule updated");
      setRuleDialogOpen(false);
      setRuleForm({ serviceId: "", billable: false, overridePrice: "", notes: "" });
    },
    onError: (e) => toast.error(e.message || "Failed")
  });

  const removeRuleMut = useMutation({
    mutationFn: ({ roomType, ruleId }) => removeServiceRule(roomType, ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-type-services"] });
      toast.success("Rule removed");
    }
  });

  const handleCreateRoom = () => {
    setRoomForm({ roomType: "", displayName: "", description: "", baseRate: 0 });
    setRoomDialogOpen(true);
  };

  const handleEditRoom = (config) => {
    setRoomForm({
      roomType: config.roomType,
      displayName: config.displayName,
      description: config.description || "",
      baseRate: config.baseRate || 0
    });
    setRoomDialogOpen(true);
  };

  const roomLabel = (val) => roomTypes.find(r => r.value === val)?.label || val;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select room type" /></SelectTrigger>
            <SelectContent>
              {roomConfigs.map(r => (
                <SelectItem key={r.roomType} value={r.roomType}>{r.displayName || roomLabel(r.roomType)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateRoom}>
          <Plus className="mr-2 h-4 w-4" /> Configure Room Type
        </Button>
      </div>

      {/* Room configs overview */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {roomConfigs.map(config => (
          <Card
            key={config.roomType}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedRoom === config.roomType ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedRoom(config.roomType)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BedDouble className="h-5 w-5 text-primary" />
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditRoom(config); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <h3 className="font-semibold">{config.displayName || roomLabel(config.roomType)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Base: ₹{config.baseRate || 0}/day</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {config.serviceRules?.filter(r => !r.billable).length || 0} included
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {config.serviceRules?.filter(r => r.billable).length || 0} billable
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service rules for selected room */}
      {selectedConfig && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {selectedConfig.displayName || roomLabel(selectedConfig.roomType)} — Service Rules
            </CardTitle>
            <Button size="sm" onClick={() => {
              setRuleForm({ serviceId: "", billable: false, overridePrice: "", notes: "" });
              setRuleDialogOpen(true);
            }}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Add Rule
            </Button>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service ID</TableHead>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>This Room</TableHead>
                      <TableHead>Price Override</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!selectedConfig.serviceRules || selectedConfig.serviceRules.length === 0) ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No rules configured. Add services to define billing behavior.</TableCell></TableRow>
                    ) : selectedConfig.serviceRules.map(rule => (
                      <TableRow key={rule._id}>
                        <TableCell className="font-mono text-xs">{rule.service?.serviceId || "—"}</TableCell>
                        <TableCell className="font-medium">{rule.service?.name || "Unknown"}</TableCell>
                        <TableCell><Badge variant="outline">{rule.service?.category || "—"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={rule.service?.defaultBillable ? "destructive" : "success"}>
                            {rule.service?.defaultBillable ? "Billable" : "Included"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.billable ? "destructive" : "success"}>
                            {rule.billable ? "Billable" : "Included"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.overridePrice !== null && rule.overridePrice !== undefined
                            ? `₹${rule.overridePrice}`
                            : `₹${rule.service?.defaultPrice || 0} (default)`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{rule.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                            if (window.confirm("Remove this rule?")) {
                              removeRuleMut.mutate({ roomType: selectedConfig.roomType, ruleId: rule._id });
                            }
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Room Config Dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure Room Type</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Room Type *</Label>
              <Select value={roomForm.roomType} onValueChange={(v) => setRoomForm({ ...roomForm, roomType: v, displayName: roomForm.displayName || roomTypes.find(r => r.value === v)?.label || v })}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input value={roomForm.displayName} onChange={(e) => setRoomForm({ ...roomForm, displayName: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Base Rate (₹/day)</Label>
              <Input type="number" min="0" value={roomForm.baseRate} onChange={(e) => setRoomForm({ ...roomForm, baseRate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => upsertMut.mutate({ ...roomForm, baseRate: Number(roomForm.baseRate) || 0 })} disabled={!roomForm.roomType || upsertMut.isPending}>
              {upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add/Update Service Rule</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Service *</Label>
              <Select value={ruleForm.serviceId} onValueChange={(v) => setRuleForm({ ...ruleForm, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {allServices.map(s => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.serviceId}) — {s.defaultBillable ? "Billable" : "Included"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Billable for this room type</Label>
                <p className="text-xs text-muted-foreground">Override the service default billing behavior</p>
              </div>
              <Switch checked={ruleForm.billable} onCheckedChange={(v) => setRuleForm({ ...ruleForm, billable: v })} />
            </div>
            <div className="grid gap-2">
              <Label>Price Override (₹)</Label>
              <Input type="number" min="0" placeholder="Leave empty to use default" value={ruleForm.overridePrice} onChange={(e) => setRuleForm({ ...ruleForm, overridePrice: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              updateRuleMut.mutate({
                roomType: selectedRoom,
                payload: {
                  serviceId: ruleForm.serviceId,
                  billable: ruleForm.billable,
                  overridePrice: ruleForm.overridePrice !== "" ? Number(ruleForm.overridePrice) : null,
                  notes: ruleForm.notes
                }
              });
            }} disabled={!ruleForm.serviceId || updateRuleMut.isPending}>
              {updateRuleMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── BILLING MATRIX TAB ─────────────────────────────────
function BillingMatrixTab() {
  const { data: rulesRes, isLoading: rulesLoading } = useQuery({
    queryKey: ["room-type-services"],
    queryFn: () => getRoomTypeServices()
  });
  const { data: catalogRes } = useQuery({
    queryKey: ["service-catalog"],
    queryFn: () => getServiceCatalog()
  });

  const roomConfigs = rulesRes?.data || [];
  const allServices = catalogRes?.data?.services || [];

  if (rulesLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const roomLabel = (val) => roomTypes.find(r => r.value === val)?.label || val;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This matrix shows how each service behaves across different room types. Green = Included in room charge, Red = Billed separately.
      </p>
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Service</TableHead>
              <TableHead className="sticky left-0 bg-background z-10">Default</TableHead>
              {roomConfigs.map(rc => (
                <TableHead key={rc.roomType} className="text-center min-w-[120px]">
                  {rc.displayName || roomLabel(rc.roomType)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allServices.length === 0 ? (
              <TableRow><TableCell colSpan={2 + roomConfigs.length} className="text-center py-10 text-muted-foreground">No services in catalog yet.</TableCell></TableRow>
            ) : allServices.map(svc => (
              <TableRow key={svc._id}>
                <TableCell className="sticky left-0 bg-background z-10">
                  <div className="font-medium text-sm">{svc.name}</div>
                  <div className="text-xs text-muted-foreground">{svc.serviceId}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={svc.defaultBillable ? "destructive" : "success"} className="text-xs">
                    {svc.defaultBillable ? `₹${svc.defaultPrice}` : "Free"}
                  </Badge>
                </TableCell>
                {roomConfigs.map(rc => {
                  const rule = rc.serviceRules?.find(r => r.service?._id === svc._id || r.service === svc._id);
                  const isBillable = rule ? rule.billable : svc.defaultBillable;
                  const price = rule?.overridePrice ?? svc.defaultPrice;
                  return (
                    <TableCell key={rc.roomType} className="text-center">
                      <Badge variant={isBillable ? "destructive" : "success"} className="text-xs">
                        {isBillable ? `₹${price}` : "Included"}
                      </Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────
export default function ServiceCatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Service Catalog & Billing Rules</h1>
        <p className="text-muted-foreground">
          Manage hospital services, configure what's included vs. billable per room type
        </p>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Service Master
          </TabsTrigger>
          <TabsTrigger value="room-rules" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" /> Room-Service Rules
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <ToggleRight className="h-4 w-4" /> Billing Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog"><ServiceCatalogTab /></TabsContent>
        <TabsContent value="room-rules"><RoomServiceRulesTab /></TabsContent>
        <TabsContent value="matrix"><BillingMatrixTab /></TabsContent>
      </Tabs>
    </div>
  );
}
