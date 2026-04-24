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
import { playSound } from "@/lib/sounds";
import { Badge } from "@/components/ui/badge";
import ModeToggle from "@/components/shared/ModeToggle";
import ExternalPatientForm from "@/components/shared/ExternalPatientForm";
import PatientAutocomplete, { patientLabel } from "@/components/shared/PatientAutocomplete";
import DoctorAutocomplete, { doctorAutocompleteLabel } from "@/components/shared/DoctorAutocomplete";
import { useValidationPreferences } from "@/lib/ValidationPreferencesContext";
import { getValidationInputClass } from "@/lib/validationPreferences";

const emptyExternal = { name: "", age: "", gender: "", phone: "", address: "", referredBy: "" };

export default function OrderLabTestDialog({ isOpen, onClose, patients, doctors }) {
  const { shouldShowValidation } = useValidationPreferences();
  const formId = "lab_order_dialog";
  const [catalog, setCatalog] = useState([]);
  const [selectedCatalogTests, setSelectedCatalogTests] = useState([]);
  const [mode, setMode] = useState("internal");
  const [externalPatient, setExternalPatient] = useState({ ...emptyExternal });
  const [formData, setFormData] = useState({
    patient: "",
    doctor: "",
    priority: "routine",
    notes: "",
    discount: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchCatalog, setSearchCatalog] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      getLabCatalog({ active: "true" })
        .then((res) => {
          const tests = res?.data?.tests || res?.tests || res?.data || [];
          setCatalog(Array.isArray(tests) ? tests : []);
        })
        .catch(() => {});
    } else {
      setSelectedCatalogTests([]);
      setSearchCatalog("");
      setMode("internal");
      setExternalPatient({ ...emptyExternal });
      setErrors({});
    }
  }, [isOpen]);

  const selectedTests = catalog.filter((c) => selectedCatalogTests.includes(c._id));
  const totalAmount = selectedTests.reduce(
    (sum, test) => sum + Math.max(0, Number(test.price || 0) - (Number(formData.discount) || 0)),
    0
  );

  const toggleCatalogTest = (testId) => {
    setSelectedCatalogTests((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
    setErrors((prev) => ({ ...prev, tests: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (mode === "internal") {
      if (!formData.patient) nextErrors.patient = "Patient is required for internal mode";
      if (!formData.doctor) nextErrors.doctor = "Doctor is required for internal mode";
    }
    if (mode === "external" && !externalPatient.name?.trim()) {
      nextErrors["externalPatient.name"] = "Patient name is required for external mode";
    }
    if (selectedCatalogTests.length === 0) {
      nextErrors.tests = "Please select at least one test";
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error(Object.values(nextErrors).find(Boolean));
      return;
    }

    try {
      setSubmitting(true);
      await createLabTest({
        catalogTestIds: selectedCatalogTests,
        mode,
        ...(mode === "internal"
          ? { patient: formData.patient, doctor: formData.doctor }
          : { externalPatient, doctor: formData.doctor || undefined }),
        priority: formData.priority,
        notes: formData.notes,
        discount: Number(formData.discount) || 0,
      });

      toast.success(
        selectedCatalogTests.length === 1
          ? "Lab test ordered successfully"
          : `${selectedCatalogTests.length} lab tests ordered successfully`
      );

      setFormData({ patient: "", doctor: "", priority: "routine", notes: "", discount: 0 });
      setSelectedCatalogTests([]);
      setExternalPatient({ ...emptyExternal });
      setErrors({});
      setMode("internal");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to order test"); playSound('error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter((c) =>
    String(c?.testName || "").toLowerCase().includes(searchCatalog.toLowerCase()) ||
    String(c?.testCode || "").toLowerCase().includes(searchCatalog.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Lab Test(s)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModeToggle mode={mode} onChange={setMode} />

          {mode === "internal" ? (
            <>
              <div className="space-y-2">
                <Label>Patient *</Label>
                <PatientAutocomplete
                  value={formData.patient}
                  selectedLabel={(() => {
                    const p = patients.find((x) => x._id === formData.patient);
                    return p ? patientLabel(p) : "";
                  })()}
                  onSelect={(p) => {
                    setFormData((prev) => ({ ...prev, patient: p?._id || "" }));
                    setErrors((prev) => ({ ...prev, patient: "" }));
                  }}
                  inputClassName={getValidationInputClass(shouldShowValidation(formId, "patient"), errors.patient)}
                />
                {shouldShowValidation(formId, "patient") && errors.patient && (
                  <p className="text-sm text-destructive">{errors.patient}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Referring Doctor *</Label>
                <DoctorAutocomplete
                  value={formData.doctor}
                  selectedLabel={(() => {
                    const d = doctors.find((x) => x._id === formData.doctor);
                    return d ? doctorAutocompleteLabel(d) : "";
                  })()}
                  onSelect={(d) => {
                    setFormData((prev) => ({ ...prev, doctor: d?._id || "" }));
                    setErrors((prev) => ({ ...prev, doctor: "" }));
                  }}
                  inputClassName={getValidationInputClass(shouldShowValidation(formId, "doctor"), errors.doctor)}
                />
                {shouldShowValidation(formId, "doctor") && errors.doctor && (
                  <p className="text-sm text-destructive">{errors.doctor}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <ExternalPatientForm data={externalPatient} onChange={setExternalPatient} errors={errors} formId={formId} />
              <div className="space-y-2">
                <Label>Referring Doctor (optional)</Label>
                <DoctorAutocomplete
                  value={formData.doctor}
                  selectedLabel={(() => {
                    const d = doctors.find((x) => x._id === formData.doctor);
                    return d ? doctorAutocompleteLabel(d) : "";
                  })()}
                  onSelect={(d) => {
                    setFormData((prev) => ({ ...prev, doctor: d?._id || "" }));
                    setErrors((prev) => ({ ...prev, doctor: "" }));
                  }}
                  placeholder="Search doctor (optional)"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Select Test(s) *</Label>
            <Input
              placeholder="Search tests..."
              value={searchCatalog}
              onChange={(e) => setSearchCatalog(e.target.value)}
              className="mb-2"
            />
            <div className={`max-h-48 overflow-y-auto rounded-md border divide-y ${shouldShowValidation(formId, "tests") && errors.tests ? "border-destructive" : ""}`}>
              {filteredCatalog.map((c) => (
                <div
                  key={c._id}
                  className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedCatalogTests.includes(c._id) ? "bg-primary/10 border-l-4 border-l-primary" : ""}`}
                  onClick={() => toggleCatalogTest(c._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.testName}</p>
                      <p className="text-xs text-muted-foreground">{c.testCode} - {c.category} - {c.sampleType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Rs {c.price}</p>
                      <p className="text-xs text-muted-foreground">{c.turnaroundTime}h TAT</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="p-4 text-center text-muted-foreground text-sm">No tests found. Add tests to catalog first.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedCatalogTests.length} test{selectedCatalogTests.length === 1 ? "" : "s"}
            </p>
            {shouldShowValidation(formId, "tests") && errors.tests && (
              <p className="text-sm text-destructive">{errors.tests}</p>
            )}
          </div>

          {selectedTests.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="font-medium">Selected Tests</p>
              <div className="flex flex-wrap gap-2">
                {selectedTests.map((test) => (
                  <Badge key={test._id} variant="outline">
                    {test.testName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount per Test (Rs)</Label>
              <Input
                type="number"
                min="0"
                value={formData.discount}
                onChange={(e) => setFormData((p) => ({ ...p, discount: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Special instructions..."
            />
          </div>

          {selectedTests.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 border border-primary/20">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="text-lg font-bold text-primary">Rs {totalAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Ordering..." : "Order Test(s)"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
