import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { collectSample, receiveSample, rejectSample, startProcessing, enterResults, verifyResults, deliverReport } from "@/lib/labTests";
import { toast } from "sonner";
import { TestTubes, Play, CheckCircle, Send, XCircle, FileText } from "lucide-react";

// Helper: resolve reference range for display
const formatRefRange = (ref, gender) => {
  if (!ref) return "-";
  const g = gender || "all";
  const range = ref[g] || ref.all;
  if (!range) return "-";
  return `${range.min ?? ""} - ${range.max ?? ""}`;
};

// Helper: auto-determine status from value & ref range
const autoStatus = (value, refRange, gender) => {
  if (!value || !refRange) return "pending";
  const g = gender || "all";
  const range = refRange[g] || refRange.all;
  if (!range || range.min == null || range.max == null) return "normal";
  const num = parseFloat(value);
  if (isNaN(num)) return "normal";
  if (num < range.min || num > range.max) return "abnormal";
  return "normal";
};

export default function LabTestDetailsDialog({ isOpen, onClose, test, permissions }) {
  const [resultSections, setResultSections] = useState([]);
  const [resultParams, setResultParams] = useState([]);
  const [interpretation, setInterpretation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showResultForm, setShowResultForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!test) return null;

  const patientGender = test.patient?.gender?.toLowerCase() || "all";
  const hasSections = test.sections?.length > 0;

  const initResults = () => {
    if (hasSections) {
      setResultSections(
        test.sections.map(sec => ({
          ...sec,
          tests: sec.tests.map(t => ({
            ...t,
            parameters: t.parameters.map(p => ({
              ...p,
              value: p.value || "",
              status: p.status || "pending",
              subParameters: (p.subParameters || []).map(sp => ({
                ...sp,
                value: sp.value || "",
                status: sp.status || "pending"
              }))
            }))
          }))
        }))
      );
    } else {
      setResultParams(
        (test.parameters || []).map(p => ({
          ...p,
          value: p.value || "",
          status: p.status || "pending",
          subParameters: (p.subParameters || []).map(sp => ({
            ...sp,
            value: sp.value || "",
            status: sp.status || "pending"
          }))
        }))
      );
    }
    setInterpretation(test.interpretation || "");
    setRemarks(test.remarks || "");
    setShowResultForm(true);
  };

  const handleAction = async (action) => {
    try {
      setSubmitting(true);
      const actions = {
        collect: () => collectSample(test._id),
        receive: () => receiveSample(test._id),
        reject: () => rejectSample(test._id, rejectReason),
        process: () => startProcessing(test._id),
        results: () => enterResults(test._id, {
          sections: hasSections ? resultSections : undefined,
          parameters: !hasSections ? resultParams : undefined,
          interpretation,
          remarks
        }),
        verify: () => verifyResults(test._id),
        deliver: () => deliverReport(test._id),
      };
      await actions[action]();
      toast.success("Action completed successfully");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Hierarchical result update helpers
  const updateSectionParam = (si, ti, pi, field, val) => {
    setResultSections(prev => {
      const s = JSON.parse(JSON.stringify(prev));
      s[si].tests[ti].parameters[pi][field] = val;
      if (field === "value") {
        s[si].tests[ti].parameters[pi].status = autoStatus(val, s[si].tests[ti].parameters[pi].referenceRange, patientGender);
      }
      return s;
    });
  };

  const updateSectionSubParam = (si, ti, pi, spi, field, val) => {
    setResultSections(prev => {
      const s = JSON.parse(JSON.stringify(prev));
      s[si].tests[ti].parameters[pi].subParameters[spi][field] = val;
      if (field === "value") {
        s[si].tests[ti].parameters[pi].subParameters[spi].status =
          autoStatus(val, s[si].tests[ti].parameters[pi].subParameters[spi].referenceRange, patientGender);
      }
      return s;
    });
  };

  const updateParamValue = (idx, field, value) => {
    setResultParams(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "value") {
        updated[idx].status = autoStatus(value, updated[idx].referenceRange, patientGender);
      }
      return updated;
    });
  };

  const updateFlatSubParam = (pi, spi, field, val) => {
    setResultParams(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[pi].subParameters[spi][field] = val;
      if (field === "value") {
        updated[pi].subParameters[spi].status = autoStatus(val, updated[pi].subParameters[spi].referenceRange, patientGender);
      }
      return updated;
    });
  };

  // Render results table for viewing completed results
  const renderResultsView = () => {
    if (hasSections && test.sections?.length > 0) {
      return test.sections.map((sec, si) => (
        <div key={si} className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{sec.sectionName}</p>
          {sec.tests.map((t, ti) => (
            <div key={ti} className="mb-2">
              <p className="text-sm font-semibold">{t.testName}</p>
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-1.5 text-left border">Parameter</th>
                    <th className="p-1.5 text-left border">Value</th>
                    <th className="p-1.5 text-left border">Unit</th>
                    <th className="p-1.5 text-left border">Ref. Range</th>
                    <th className="p-1.5 text-left border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {t.parameters.map((p, pi) =>
                    p.subParameters?.length > 0 ? (
                      <>{/* key fragment */}
                        <tr key={`${pi}-h`} className="bg-muted/30"><td className="p-1.5 border font-semibold" colSpan={5}>{p.name}</td></tr>
                        {p.subParameters.map((sp, spi) => (
                          <tr key={`${pi}-${spi}`}>
                            <td className="p-1.5 border pl-6">{sp.name}</td>
                            <td className={`p-1.5 border ${sp.status === "critical" ? "text-destructive font-bold" : sp.status === "abnormal" ? "text-destructive" : ""}`}>{sp.value || "-"}</td>
                            <td className="p-1.5 border text-muted-foreground">{sp.unit || "-"}</td>
                            <td className="p-1.5 border text-muted-foreground">{formatRefRange(sp.referenceRange, patientGender)}</td>
                            <td className="p-1.5 border">
                              <Badge variant={sp.status === "normal" ? "secondary" : sp.status === "critical" ? "destructive" : "default"} className="capitalize text-xs">{sp.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr key={pi}>
                        <td className="p-1.5 border font-medium">{p.name}</td>
                        <td className={`p-1.5 border ${p.status === "critical" ? "text-destructive font-bold" : p.status === "abnormal" ? "text-destructive" : ""}`}>{p.value || "-"}</td>
                        <td className="p-1.5 border text-muted-foreground">{p.unit || "-"}</td>
                        <td className="p-1.5 border text-muted-foreground">{formatRefRange(p.referenceRange, patientGender)}</td>
                        <td className="p-1.5 border">
                          <Badge variant={p.status === "normal" ? "secondary" : p.status === "critical" ? "destructive" : "default"} className="capitalize text-xs">{p.status}</Badge>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ));
    }

    // Legacy flat params view
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Parameter</th>
              <th className="p-2 text-left">Value</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2 text-left">Ref. Range</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {(test.parameters || []).map((p, i) => (
              <>
                <tr key={i} className={p.subParameters?.length > 0 ? "bg-muted/30" : "border-t"}>
                  <td className={`p-2 font-medium ${p.subParameters?.length > 0 ? "font-semibold" : ""}`} colSpan={p.subParameters?.length > 0 ? 5 : 1}>{p.name}</td>
                  {(!p.subParameters || p.subParameters.length === 0) && (
                    <>
                      <td className="p-2">{p.value || '-'}</td>
                      <td className="p-2 text-muted-foreground">{p.unit}</td>
                      <td className="p-2 text-muted-foreground">{formatRefRange(p.referenceRange, patientGender) || p.normalRange || "-"}</td>
                      <td className="p-2">
                        <Badge variant={p.status === 'normal' ? 'secondary' : p.status === 'critical' ? 'destructive' : 'default'} className="capitalize">{p.status}</Badge>
                      </td>
                    </>
                  )}
                </tr>
                {(p.subParameters || []).map((sp, spi) => (
                  <tr key={`${i}-${spi}`} className="border-t">
                    <td className="p-2 pl-6">{sp.name}</td>
                    <td className={`p-2 ${sp.status === "abnormal" ? "text-destructive" : ""}`}>{sp.value || "-"}</td>
                    <td className="p-2 text-muted-foreground">{sp.unit || "-"}</td>
                    <td className="p-2 text-muted-foreground">{formatRefRange(sp.referenceRange, patientGender)}</td>
                    <td className="p-2">
                      <Badge variant={sp.status === 'normal' ? 'secondary' : sp.status === 'critical' ? 'destructive' : 'default'} className="capitalize text-xs">{sp.status}</Badge>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render enter results form
  const renderResultsForm = () => {
    if (hasSections && resultSections.length > 0) {
      return resultSections.map((sec, si) => (
        <div key={si} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{sec.sectionName}</p>
          {sec.tests.map((t, ti) => (
            <div key={ti} className="space-y-2 ml-2">
              <p className="text-sm font-semibold">{t.testName}</p>
              {t.parameters.map((p, pi) =>
                p.subParameters?.length > 0 ? (
                  <div key={pi} className="ml-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">{p.name}</p>
                    {p.subParameters.map((sp, spi) => (
                      <div key={spi} className="grid grid-cols-4 gap-2 items-center ml-4">
                        <div>
                          <p className="text-xs font-medium">{sp.name}</p>
                          <p className="text-[10px] text-muted-foreground">{sp.unit} ({formatRefRange(sp.referenceRange, patientGender)})</p>
                        </div>
                        <Input value={sp.value} onChange={e => updateSectionSubParam(si, ti, pi, spi, "value", e.target.value)} placeholder="Value" className="h-8 text-sm" />
                        <Select value={sp.status} onValueChange={v => updateSectionSubParam(si, ti, pi, spi, "status", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="abnormal">Abnormal</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <div />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div key={pi} className="grid grid-cols-4 gap-2 items-center ml-2">
                    <div>
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.unit} ({formatRefRange(p.referenceRange, patientGender)})</p>
                    </div>
                    <Input value={p.value} onChange={e => updateSectionParam(si, ti, pi, "value", e.target.value)} placeholder="Value" className="h-8 text-sm" />
                    <Select value={p.status} onValueChange={v => updateSectionParam(si, ti, pi, "status", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="abnormal">Abnormal</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <div />
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      ));
    }

    // Legacy flat params form
    return resultParams.map((p, i) => (
      <div key={i}>
        {p.subParameters?.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{p.name}</p>
            {p.subParameters.map((sp, spi) => (
              <div key={spi} className="grid grid-cols-4 gap-2 items-end ml-4">
                <div>
                  <Label className="text-xs">{sp.name}</Label>
                  <p className="text-xs text-muted-foreground">{sp.unit} ({formatRefRange(sp.referenceRange, patientGender)})</p>
                </div>
                <Input value={sp.value} onChange={e => updateFlatSubParam(i, spi, "value", e.target.value)} placeholder="Value" />
                <Select value={sp.status} onValueChange={v => updateFlatSubParam(i, spi, "status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="abnormal">Abnormal</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <div />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 items-end">
            <div>
              <Label className="text-xs">{p.name}</Label>
              <p className="text-xs text-muted-foreground">{p.unit} ({formatRefRange(p.referenceRange, patientGender) || p.normalRange})</p>
            </div>
            <Input value={p.value} onChange={e => updateParamValue(i, 'value', e.target.value)} placeholder="Value" />
            <Select value={p.status} onValueChange={v => updateParamValue(i, 'status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="abnormal">Abnormal</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <div />
          </div>
        )}
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Lab Test Details
            <Badge variant="outline" className="font-mono">{test.testId}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Patient</Label>
              <p className="font-medium">{test.patient?.firstName} {test.patient?.lastName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Referring Doctor</Label>
              <p className="font-medium">{test.doctor?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Test</Label>
              <p className="font-medium">{test.testName} ({test.testCode})</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p className="font-medium capitalize">{test.category}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sample Type</Label>
              <Badge variant="outline" className="capitalize">{test.sampleType}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <Badge variant={test.priority === 'stat' ? 'destructive' : test.priority === 'urgent' ? 'default' : 'secondary'} className="capitalize">{test.priority}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant="outline" className="capitalize">{test.status?.replace('_', ' ')}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium">₹{test.totalAmount}</p>
            </div>
          </div>

          {test.sampleId && (
            <div className="rounded-lg bg-muted/50 p-3">
              <Label className="text-muted-foreground">Sample ID</Label>
              <p className="font-mono font-medium">{test.sampleId}</p>
              {test.sampleCollectedAt && <p className="text-xs text-muted-foreground">Collected: {new Date(test.sampleCollectedAt).toLocaleString()}</p>}
              {test.sampleCollectedBy && <p className="text-xs text-muted-foreground">By: {test.sampleCollectedBy.firstName} {test.sampleCollectedBy.lastName}</p>}
            </div>
          )}

          {test.notes && (
            <div>
              <Label className="text-muted-foreground">Notes</Label>
              <p className="text-sm">{test.notes}</p>
            </div>
          )}

          <Separator />

          {/* Results Section */}
          {(['completed', 'verified', 'delivered'].includes(test.status)) && (
            <div>
              <h3 className="font-semibold mb-2">Results</h3>
              {renderResultsView()}
              {test.interpretation && <div className="mt-2"><Label className="text-muted-foreground">Interpretation</Label><p className="text-sm">{test.interpretation}</p></div>}
              {test.remarks && <div className="mt-1"><Label className="text-muted-foreground">Remarks</Label><p className="text-sm">{test.remarks}</p></div>}
            </div>
          )}

          {/* Enter Results Form */}
          {showResultForm && (
            <div className="space-y-3">
              <h3 className="font-semibold">Enter Results</h3>
              {renderResultsForm()}
              <div className="space-y-2">
                <Label>Interpretation</Label>
                <Textarea value={interpretation} onChange={e => setInterpretation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
              <Button onClick={() => handleAction('results')} disabled={submitting}>
                <CheckCircle className="mr-2 h-4 w-4" />{submitting ? "Saving..." : "Save Results"}
              </Button>
            </div>
          )}

          <Separator />

          {/* Workflow Actions */}
          {permissions.canEdit && (
            <div className="flex flex-wrap gap-2">
              {test.status === 'ordered' && (
                <Button size="sm" onClick={() => handleAction('collect')} disabled={submitting}>
                  <TestTubes className="mr-2 h-4 w-4" />Collect Sample
                </Button>
              )}
              {test.sampleStatus === 'collected' && test.status === 'sample_collected' && (
                <>
                  <Button size="sm" onClick={() => handleAction('receive')} disabled={submitting}>
                    <CheckCircle className="mr-2 h-4 w-4" />Receive Sample
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAction('reject')} disabled={submitting}>
                    <XCircle className="mr-2 h-4 w-4" />Reject
                  </Button>
                </>
              )}
              {(test.sampleStatus === 'collected' || test.sampleStatus === 'received') && test.status !== 'processing' && (
                <Button size="sm" onClick={() => handleAction('process')} disabled={submitting}>
                  <Play className="mr-2 h-4 w-4" />Start Processing
                </Button>
              )}
              {test.status === 'processing' && !showResultForm && (
                <Button size="sm" onClick={initResults} disabled={submitting}>
                  <FileText className="mr-2 h-4 w-4" />Enter Results
                </Button>
              )}
              {test.status === 'completed' && (
                <Button size="sm" onClick={() => handleAction('verify')} disabled={submitting}>
                  <CheckCircle className="mr-2 h-4 w-4" />Verify Results
                </Button>
              )}
              {test.status === 'verified' && (
                <Button size="sm" onClick={() => handleAction('deliver')} disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />Deliver Report
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
