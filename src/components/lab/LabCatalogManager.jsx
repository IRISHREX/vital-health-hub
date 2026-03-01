import { useState, useEffect } from "react";
import { getLabCatalog, createLabCatalogItem, updateLabCatalogItem, deleteLabCatalogItem } from "@/lib/labTests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";

const emptySubParam = () => ({ name: "", unit: "", referenceRange: null });
const emptyParam = () => ({ name: "", unit: "", referenceRange: null, subParameters: [] });
const emptyTest = () => ({ testName: "", testCode: "", price: 0, parameters: [emptyParam()] });
const emptySection = () => ({ sectionName: "", tests: [emptyTest()] });

const ReferenceRangeEditor = ({ value, onChange }) => {
  const [mode, setMode] = useState(() => {
    if (!value) return "none";
    if (value.all) return "all";
    return "gendered";
  });

  const getVal = (key, field) => value?.[key]?.[field] ?? "";

  const update = (key, field, v) => {
    const current = value || {};
    const updated = { ...current, [key]: { ...(current[key] || {}), [field]: v === "" ? undefined : Number(v) } };
    onChange(updated);
  };

  return (
    <div className="space-y-1">
      <Select value={mode} onValueChange={(m) => {
        setMode(m);
        if (m === "none") onChange(null);
        else if (m === "all") onChange({ all: { min: 0, max: 0 } });
        else onChange({ male: { min: 0, max: 0 }, female: { min: 0, max: 0 } });
      }}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Range</SelectItem>
          <SelectItem value="all">Universal</SelectItem>
          <SelectItem value="gendered">Male/Female/Child</SelectItem>
        </SelectContent>
      </Select>
      {mode === "all" && (
        <div className="flex gap-1">
          <Input className="h-7 text-xs" type="number" placeholder="Min" value={getVal("all", "min")} onChange={(e) => update("all", "min", e.target.value)} />
          <Input className="h-7 text-xs" type="number" placeholder="Max" value={getVal("all", "max")} onChange={(e) => update("all", "max", e.target.value)} />
        </div>
      )}
      {mode === "gendered" && (
        <div className="space-y-1">
          {["male", "female", "child"].map((g) => (
            <div key={g} className="flex items-center gap-1">
              <span className="text-xs w-10 capitalize">{g[0].toUpperCase()}</span>
              <Input className="h-7 text-xs" type="number" placeholder="Min" value={getVal(g, "min")} onChange={(e) => update(g, "min", e.target.value)} />
              <Input className="h-7 text-xs" type="number" placeholder="Max" value={getVal(g, "max")} onChange={(e) => update(g, "max", e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function LabCatalogManager({ permissions }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState({
    testName: "", testCode: "", category: "hematology", sampleType: "blood",
    price: "", turnaroundTime: 24, description: "", instructions: "",
    sections: [emptySection()],
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
      sections: [emptySection()],
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      testName: item.testName, testCode: item.testCode, category: item.category,
      sampleType: item.sampleType, price: item.price, turnaroundTime: item.turnaroundTime,
      description: item.description || "", instructions: item.instructions || "",
      sections: item.sections?.length ? item.sections : [emptySection()],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        turnaroundTime: Number(formData.turnaroundTime),
        sections: formData.sections.filter(s => s.sectionName),
      };
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

  // Section helpers
  const addSection = () => setFormData(p => ({ ...p, sections: [...p.sections, emptySection()] }));
  const removeSection = (si) => setFormData(p => ({ ...p, sections: p.sections.filter((_, i) => i !== si) }));
  const updateSection = (si, field, val) => {
    setFormData(p => {
      const s = [...p.sections];
      s[si] = { ...s[si], [field]: val };
      return { ...p, sections: s };
    });
  };

  // Test helpers
  const addTest = (si) => {
    setFormData(p => {
      const s = [...p.sections];
      s[si] = { ...s[si], tests: [...s[si].tests, emptyTest()] };
      return { ...p, sections: s };
    });
  };
  const removeTest = (si, ti) => {
    setFormData(p => {
      const s = [...p.sections];
      s[si] = { ...s[si], tests: s[si].tests.filter((_, i) => i !== ti) };
      return { ...p, sections: s };
    });
  };
  const updateTest = (si, ti, field, val) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      tests[ti] = { ...tests[ti], [field]: val };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };

  // Parameter helpers
  const addParam = (si, ti) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      tests[ti] = { ...tests[ti], parameters: [...tests[ti].parameters, emptyParam()] };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };
  const removeParam = (si, ti, pi) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      tests[ti] = { ...tests[ti], parameters: tests[ti].parameters.filter((_, i) => i !== pi) };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };
  const updateParam = (si, ti, pi, field, val) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      const params = [...tests[ti].parameters];
      params[pi] = { ...params[pi], [field]: val };
      tests[ti] = { ...tests[ti], parameters: params };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };

  // Sub-parameter helpers
  const addSubParam = (si, ti, pi) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      const params = [...tests[ti].parameters];
      params[pi] = { ...params[pi], subParameters: [...(params[pi].subParameters || []), emptySubParam()] };
      tests[ti] = { ...tests[ti], parameters: params };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };
  const removeSubParam = (si, ti, pi, spi) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      const params = [...tests[ti].parameters];
      params[pi] = { ...params[pi], subParameters: params[pi].subParameters.filter((_, i) => i !== spi) };
      tests[ti] = { ...tests[ti], parameters: params };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };
  const updateSubParam = (si, ti, pi, spi, field, val) => {
    setFormData(p => {
      const s = [...p.sections];
      const tests = [...s[si].tests];
      const params = [...tests[ti].parameters];
      const subs = [...(params[pi].subParameters || [])];
      subs[spi] = { ...subs[spi], [field]: val };
      params[pi] = { ...params[pi], subParameters: subs };
      tests[ti] = { ...tests[ti], parameters: params };
      s[si] = { ...s[si], tests };
      return { ...p, sections: s };
    });
  };

  const filtered = catalog.filter(c =>
    c.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.testCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalParams = (item) => {
    if (item.sections?.length > 0) {
      return item.sections.reduce((acc, sec) =>
        acc + sec.tests.reduce((a2, t) =>
          a2 + t.parameters.reduce((a3, p) =>
            a3 + (p.subParameters?.length || 0) + (p.subParameters?.length ? 0 : 1), 0), 0), 0);
    }
    return item.parameters?.length || 0;
  };

  const formatRefRange = (ref, gender) => {
    if (!ref) return "-";
    const g = gender || "all";
    const range = ref[g] || ref.all;
    if (!range) return "-";
    return `${range.min ?? ""} - ${range.max ?? ""}`;
  };

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
                <TableHead></TableHead>
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
                <Collapsible key={c._id} asChild open={expandedId === c._id} onOpenChange={(open) => setExpandedId(open ? c._id : null)}>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedId === c._id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{c.testCode}</TableCell>
                      <TableCell className="font-medium">{c.testName}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{c.category}</Badge></TableCell>
                      <TableCell className="capitalize">{c.sampleType}</TableCell>
                      <TableCell className="font-semibold">₹{c.price}</TableCell>
                      <TableCell>{c.turnaroundTime}h</TableCell>
                      <TableCell>{getTotalParams(c)}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'secondary' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {permissions.canEdit && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={10} className="p-0">
                          <div className="bg-muted/20 p-4 space-y-3">
                            {c.sections?.length > 0 ? c.sections.map((sec, si) => (
                              <div key={si}>
                                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{sec.sectionName}</p>
                                {sec.tests.map((test, ti) => (
                                  <div key={ti} className="mb-3">
                                    <p className="text-sm font-semibold mb-1">{test.testName} {test.testCode ? `(${test.testCode})` : ""}</p>
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-muted/50">
                                          <th className="p-1.5 text-left border">Parameter</th>
                                          <th className="p-1.5 text-left border">Unit</th>
                                          <th className="p-1.5 text-left border">Reference Range</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {test.parameters.map((param, pi) => (
                                          param.subParameters?.length > 0 ? (
                                            <>
                                              <tr key={`${pi}-header`} className="bg-muted/30">
                                                <td className="p-1.5 border font-semibold" colSpan={3}>{param.name}</td>
                                              </tr>
                                              {param.subParameters.map((sp, spi) => (
                                                <tr key={`${pi}-${spi}`}>
                                                  <td className="p-1.5 border pl-6">{sp.name}</td>
                                                  <td className="p-1.5 border text-muted-foreground">{sp.unit || "-"}</td>
                                                  <td className="p-1.5 border text-muted-foreground">{formatRefRange(sp.referenceRange)}</td>
                                                </tr>
                                              ))}
                                            </>
                                          ) : (
                                            <tr key={pi}>
                                              <td className="p-1.5 border font-medium">{param.name}</td>
                                              <td className="p-1.5 border text-muted-foreground">{param.unit || "-"}</td>
                                              <td className="p-1.5 border text-muted-foreground">{formatRefRange(param.referenceRange)}</td>
                                            </tr>
                                          )
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground">No hierarchical structure defined. Uses legacy flat parameters.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Sections</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSection}>+ Section</Button>
              </div>

              {formData.sections.map((sec, si) => (
                <div key={si} className="border rounded-lg p-3 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Section Name (e.g. HAEMATOLOGY)" value={sec.sectionName}
                      onChange={e => updateSection(si, "sectionName", e.target.value)} className="font-semibold uppercase" />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeSection(si)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {sec.tests.map((test, ti) => (
                    <div key={ti} className="border rounded-md p-2 space-y-2 bg-background">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Test Name" value={test.testName} onChange={e => updateTest(si, ti, "testName", e.target.value)} className="flex-1" />
                        <Input placeholder="Code" value={test.testCode || ""} onChange={e => updateTest(si, ti, "testCode", e.target.value)} className="w-24" />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeTest(si, ti)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {test.parameters.map((param, pi) => (
                        <div key={pi} className="ml-4 space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex gap-2">
                                <Input placeholder="Parameter Name" value={param.name} onChange={e => updateParam(si, ti, pi, "name", e.target.value)} className="flex-1 h-8 text-sm" />
                                <Input placeholder="Unit" value={param.unit || ""} onChange={e => updateParam(si, ti, pi, "unit", e.target.value)} className="w-24 h-8 text-sm" />
                              </div>
                              <div className="w-64">
                                <ReferenceRangeEditor value={param.referenceRange} onChange={(v) => updateParam(si, ti, pi, "referenceRange", v)} />
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => addSubParam(si, ti, pi)}>+Sub</Button>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => removeParam(si, ti, pi)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Sub-parameters */}
                          {(param.subParameters || []).map((sp, spi) => (
                            <div key={spi} className="ml-6 flex items-start gap-2 bg-muted/30 rounded p-1.5">
                              <div className="flex-1 space-y-1">
                                <div className="flex gap-2">
                                  <Input placeholder="Sub-param Name" value={sp.name} onChange={e => updateSubParam(si, ti, pi, spi, "name", e.target.value)} className="flex-1 h-7 text-xs" />
                                  <Input placeholder="Unit" value={sp.unit || ""} onChange={e => updateSubParam(si, ti, pi, spi, "unit", e.target.value)} className="w-20 h-7 text-xs" />
                                </div>
                                <div className="w-56">
                                  <ReferenceRangeEditor value={sp.referenceRange} onChange={(v) => updateSubParam(si, ti, pi, spi, "referenceRange", v)} />
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive h-6 w-6 shrink-0" onClick={() => removeSubParam(si, ti, pi, spi)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="ghost" className="text-xs ml-4" onClick={() => addParam(si, ti)}>+ Parameter</Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => addTest(si)}>+ Test in Section</Button>
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
