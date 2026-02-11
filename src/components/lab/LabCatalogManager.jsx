import { useState, useEffect } from "react";
import { getLabCatalog, createLabCatalogItem, updateLabCatalogItem, deleteLabCatalogItem } from "@/lib/labTests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function LabCatalogManager({ permissions }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    testName: "", testCode: "", category: "hematology", sampleType: "blood",
    price: "", turnaroundTime: 24, description: "", instructions: "",
    parameters: [{ name: "", unit: "", normalRange: "" }],
  });

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await getLabCatalog();
      setCatalog(res.data?.tests || []);
    } catch { toast.error("Failed to load catalog"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCatalog(); }, []);

  const resetForm = () => {
    setFormData({
      testName: "", testCode: "", category: "hematology", sampleType: "blood",
      price: "", turnaroundTime: 24, description: "", instructions: "",
      parameters: [{ name: "", unit: "", normalRange: "" }],
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      testName: item.testName, testCode: item.testCode, category: item.category,
      sampleType: item.sampleType, price: item.price, turnaroundTime: item.turnaroundTime,
      description: item.description || "", instructions: item.instructions || "",
      parameters: item.parameters?.length ? item.parameters : [{ name: "", unit: "", normalRange: "" }],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price), turnaroundTime: Number(formData.turnaroundTime), parameters: formData.parameters.filter(p => p.name) };
      if (editItem) {
        await updateLabCatalogItem(editItem._id, payload);
        toast.success("Test updated");
      } else {
        await createLabCatalogItem(payload);
        toast.success("Test added to catalog");
      }
      setDialogOpen(false);
      resetForm();
      fetchCatalog();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLabCatalogItem(id);
      toast.success("Test deactivated");
      fetchCatalog();
    } catch (err) { toast.error(err.message); }
  };

  const addParameter = () => setFormData(p => ({ ...p, parameters: [...p.parameters, { name: "", unit: "", normalRange: "" }] }));
  const removeParameter = (i) => setFormData(p => ({ ...p, parameters: p.parameters.filter((_, idx) => idx !== i) }));
  const updateParameter = (i, field, value) => {
    setFormData(p => {
      const params = [...p.parameters];
      params[i] = { ...params[i], [field]: value };
      return { ...p, parameters: params };
    });
  };

  const filtered = catalog.filter(c =>
    c.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.testCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search catalog..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {permissions.canCreate && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Test
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>TAT</TableHead>
                <TableHead>Params</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c._id}>
                  <TableCell className="font-mono font-medium">{c.testCode}</TableCell>
                  <TableCell className="font-medium">{c.testName}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{c.category}</Badge></TableCell>
                  <TableCell className="capitalize">{c.sampleType}</TableCell>
                  <TableCell className="font-semibold">₹{c.price}</TableCell>
                  <TableCell>{c.turnaroundTime}h</TableCell>
                  <TableCell>{c.parameters?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'secondary' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {permissions.canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {permissions.canDelete && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {loading ? "Loading..." : "No tests in catalog. Add your first test."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Test" : "Add Test to Catalog"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Name *</Label>
                <Input value={formData.testName} onChange={e => setFormData(p => ({ ...p, testName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Test Code *</Label>
                <Input value={formData.testCode} onChange={e => setFormData(p => ({ ...p, testCode: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['hematology', 'biochemistry', 'microbiology', 'pathology', 'radiology', 'immunology', 'urine', 'serology', 'other'].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sample Type *</Label>
                <Select value={formData.sampleType} onValueChange={v => setFormData(p => ({ ...p, sampleType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['blood', 'urine', 'stool', 'sputum', 'csf', 'tissue', 'swab', 'other'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input type="number" min="0" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>TAT (hours)</Label>
                <Input type="number" min="1" value={formData.turnaroundTime} onChange={e => setFormData(p => ({ ...p, turnaroundTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Input value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} placeholder="e.g. Fasting required" />
            </div>

            {/* Parameters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Parameters</Label>
                <Button type="button" size="sm" variant="outline" onClick={addParameter}>+ Add</Button>
              </div>
              {formData.parameters.map((p, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <Input placeholder="Name" value={p.name} onChange={e => updateParameter(i, 'name', e.target.value)} />
                  <Input placeholder="Unit" value={p.unit} onChange={e => updateParameter(i, 'unit', e.target.value)} />
                  <Input placeholder="Normal Range" value={p.normalRange} onChange={e => updateParameter(i, 'normalRange', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeParameter(i)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit">{editItem ? "Update" : "Add"} Test</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
