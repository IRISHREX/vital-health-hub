import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getLabCatalog, createLabTest } from "@/lib/labTests";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function OrderLabTestDialog({ isOpen, onClose, patients, doctors }) {
  const [catalog, setCatalog] = useState([]);
  const [selectedCatalogTest, setSelectedCatalogTest] = useState("");
  const [formData, setFormData] = useState({
    patient: "",
    doctor: "",
    priority: "routine",
    notes: "",
    discount: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchCatalog, setSearchCatalog] = useState("");

  useEffect(() => {
    if (isOpen) {
      getLabCatalog({ active: 'true' }).then(res => setCatalog(res.data?.tests || [])).catch(() => {});
    }
  }, [isOpen]);

  const selectedTest = catalog.find(c => c._id === selectedCatalogTest);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient || !formData.doctor || !selectedCatalogTest) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      setSubmitting(true);
      await createLabTest({
        catalogTestId: selectedCatalogTest,
        patient: formData.patient,
        doctor: formData.doctor,
        priority: formData.priority,
        notes: formData.notes,
        discount: Number(formData.discount) || 0,
      });
      toast.success("Lab test ordered successfully");
      setFormData({ patient: "", doctor: "", priority: "routine", notes: "", discount: 0 });
      setSelectedCatalogTest("");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to order test");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter(c =>
    c.testName.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    c.testCode.toLowerCase().includes(searchCatalog.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Lab Test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient */}
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Select value={formData.patient} onValueChange={(v) => setFormData(p => ({ ...p, patient: v }))}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.firstName} {p.lastName} ({p.patientId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Doctor */}
          <div className="space-y-2">
            <Label>Referring Doctor *</Label>
            <Select value={formData.doctor} onValueChange={(v) => setFormData(p => ({ ...p, doctor: v }))}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d._id} value={d._id}>{d.name} - {d.specialization}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test selection from catalog */}
          <div className="space-y-2">
            <Label>Select Test *</Label>
            <Input placeholder="Search tests..." value={searchCatalog} onChange={e => setSearchCatalog(e.target.value)} className="mb-2" />
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
              {filteredCatalog.map(c => (
                <div
                  key={c._id}
                  className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedCatalogTest === c._id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                  onClick={() => setSelectedCatalogTest(c._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.testName}</p>
                      <p className="text-xs text-muted-foreground">{c.testCode} · {c.category} · {c.sampleType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{c.price}</p>
                      <p className="text-xs text-muted-foreground">{c.turnaroundTime}h TAT</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="p-4 text-center text-muted-foreground text-sm">No tests found. Add tests to catalog first.</p>
              )}
            </div>
          </div>

          {selectedTest && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="font-medium">{selectedTest.testName}</p>
              <p className="text-sm text-muted-foreground">Sample: <Badge variant="outline">{selectedTest.sampleType}</Badge></p>
              <p className="text-sm text-muted-foreground">Parameters: {selectedTest.parameters?.length || 0}</p>
              {selectedTest.instructions && <p className="text-sm text-destructive">{selectedTest.instructions}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" min="0" value={formData.discount} onChange={e => setFormData(p => ({ ...p, discount: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Special instructions..." />
          </div>

          {selectedTest && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 border border-primary/20">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-lg font-bold text-primary">₹{(selectedTest.price - (Number(formData.discount) || 0)).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Ordering..." : "Order Test"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
