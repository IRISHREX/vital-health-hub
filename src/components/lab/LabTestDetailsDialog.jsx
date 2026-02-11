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

export default function LabTestDetailsDialog({ isOpen, onClose, test, permissions }) {
  const [resultParams, setResultParams] = useState([]);
  const [interpretation, setInterpretation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showResultForm, setShowResultForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!test) return null;

  const initResults = () => {
    setResultParams(
      (test.parameters || []).map(p => ({ ...p, value: p.value || "", status: p.status || "pending" }))
    );
    setInterpretation(test.interpretation || "");
    setRemarks(test.remarks || "");
    setShowResultForm(true);
  };

  const handleAction = async (action, payload) => {
    try {
      setSubmitting(true);
      const actions = {
        collect: () => collectSample(test._id),
        receive: () => receiveSample(test._id),
        reject: () => rejectSample(test._id, rejectReason),
        process: () => startProcessing(test._id),
        results: () => enterResults(test._id, { parameters: resultParams, interpretation, remarks }),
        verify: () => verifyResults(test._id),
        deliver: () => deliverReport(test._id),
      };
      await actions[action]();
      toast.success(`Action completed successfully`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateParamValue = (idx, field, value) => {
    setResultParams(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
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
          {(test.status === 'completed' || test.status === 'verified' || test.status === 'delivered') && test.parameters?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Results</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Parameter</th>
                      <th className="p-2 text-left">Value</th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-left">Normal Range</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.parameters.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2">{p.value || '-'}</td>
                        <td className="p-2 text-muted-foreground">{p.unit}</td>
                        <td className="p-2 text-muted-foreground">{p.normalRange}</td>
                        <td className="p-2">
                          <Badge variant={p.status === 'normal' ? 'secondary' : p.status === 'critical' ? 'destructive' : 'default'} className="capitalize">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {test.interpretation && <div className="mt-2"><Label className="text-muted-foreground">Interpretation</Label><p className="text-sm">{test.interpretation}</p></div>}
              {test.remarks && <div className="mt-1"><Label className="text-muted-foreground">Remarks</Label><p className="text-sm">{test.remarks}</p></div>}
            </div>
          )}

          {/* Enter Results Form */}
          {showResultForm && (
            <div className="space-y-3">
              <h3 className="font-semibold">Enter Results</h3>
              {resultParams.map((p, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end">
                  <div>
                    <Label className="text-xs">{p.name}</Label>
                    <p className="text-xs text-muted-foreground">{p.unit} ({p.normalRange})</p>
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
              ))}
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
