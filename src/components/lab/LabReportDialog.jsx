import { useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";

export default function LabReportDialog({ isOpen, onClose, test, tests = [] }) {
  const reportRef = useRef(null);

  const reportTests = useMemo(() => {
    if (Array.isArray(tests) && tests.length > 0) return tests;
    return test ? [test] : [];
  }, [test, tests]);

  if (reportTests.length === 0) return null;

  const primaryTest = reportTests[0];
  const isCombined = reportTests.length > 1;

  const titleText = isCombined
    ? `Combined Report - ${primaryTest.patient?.patientId || "Patient"}`
    : `Lab Report - ${primaryTest.testId || "Test"}`;

  const filenameBase = isCombined
    ? `CombinedLabReport_${primaryTest.patient?.patientId || "Patient"}_${reportTests.length}Tests`
    : `LabReport_${primaryTest.testId || "Test"}`;

  const openPrintWindow = () => {
    const content = reportRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>${titleText}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 16px; margin-bottom: 16px; }
          .header h1 { color: #1565c0; margin: 0; font-size: 24px; }
          .header p { margin: 4px 0; color: #555; font-size: 12px; }
          .report-block { margin-bottom: 22px; page-break-inside: avoid; }
          .report-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px; }
          .info-grid .label { color: #888; }
          .info-grid .value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #f0f4f8; padding: 8px 12px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
          td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
          .footer { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrint = () => openPrintWindow();

  const handleDownload = () => {
    const content = reportRef.current;
    if (!content) return;
    const blob = new Blob(
      [`
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 16px; margin-bottom: 16px; }
          .header h1 { color: #1565c0; margin: 0; font-size: 24px; }
          .header p { margin: 4px 0; color: #555; font-size: 12px; }
          .report-block { margin-bottom: 22px; page-break-inside: avoid; }
          .report-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px; }
          .info-grid .label { color: #888; }
          .info-grid .value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #f0f4f8; padding: 8px 12px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
          td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
          .footer { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `],
      { type: "application/msword" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isCombined ? `Combined Lab Reports (${reportTests.length})` : "Lab Report"}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={reportRef} className="space-y-4 p-4 border rounded-lg bg-card">
          <div className="text-center border-b-2 border-primary pb-4">
            <h1 className="text-2xl font-bold text-primary">MediCare Hospital</h1>
            <p className="text-sm text-muted-foreground">
              {isCombined ? "Combined Laboratory Reports" : "Laboratory Report"}
            </p>
            <p className="text-xs text-muted-foreground">123 Healthcare Avenue, Medical District</p>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Patient: </span>
            <span className="font-semibold">{primaryTest.patient?.firstName} {primaryTest.patient?.lastName}</span>
            <span className="text-muted-foreground ml-4">Patient ID: </span>
            <span className="font-semibold">{primaryTest.patient?.patientId}</span>
          </div>

          {reportTests.map((currentTest, index) => (
            <div key={currentTest._id || `${currentTest.testId}-${index}`} className="space-y-3 report-block">
              {index > 0 && <Separator />}

              <div className="report-title">
                {currentTest.testName} ({currentTest.testCode}){" "}
                <span className="text-muted-foreground">| {currentTest.testId}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Sample ID: </span>
                  <span className="font-mono font-semibold">{currentTest.sampleId || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-semibold capitalize">{currentTest.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Referred By: </span>
                  <span className="font-semibold">{currentTest.doctor?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Report Date: </span>
                  <span className="font-semibold">
                    {currentTest.reportGeneratedAt
                      ? new Date(currentTest.reportGeneratedAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Test Results</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left border">Parameter</th>
                      <th className="p-2 text-left border">Value</th>
                      <th className="p-2 text-left border">Unit</th>
                      <th className="p-2 text-left border">Normal Range</th>
                      <th className="p-2 text-left border">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentTest.parameters || []).map((p, i) => (
                      <tr key={`${currentTest._id || currentTest.testId}-param-${i}`}>
                        <td className="p-2 border font-medium">{p.name}</td>
                        <td className={`p-2 border ${p.status === "critical" ? "text-destructive font-bold" : p.status === "abnormal" ? "text-destructive" : ""}`}>
                          {p.value || "-"}
                        </td>
                        <td className="p-2 border text-muted-foreground">{p.unit}</td>
                        <td className="p-2 border text-muted-foreground">{p.normalRange}</td>
                        <td className="p-2 border">
                          <Badge
                            variant={p.status === "normal" ? "secondary" : p.status === "critical" ? "destructive" : "default"}
                            className="capitalize"
                          >
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {currentTest.interpretation && (
                <div>
                  <h4 className="font-semibold text-sm">Interpretation</h4>
                  <p className="text-sm text-muted-foreground">{currentTest.interpretation}</p>
                </div>
              )}

              {currentTest.remarks && (
                <div>
                  <h4 className="font-semibold text-sm">Remarks</h4>
                  <p className="text-sm text-muted-foreground">{currentTest.remarks}</p>
                </div>
              )}
            </div>
          ))}

          <div className="text-xs text-muted-foreground text-center mt-4 border-t pt-2">
            <p>This is a computer-generated report. Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
