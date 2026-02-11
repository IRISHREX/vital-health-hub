import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";

export default function LabReportDialog({ isOpen, onClose, test }) {
  const reportRef = useRef(null);

  if (!test) return null;

  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Lab Report - ${test.testId}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a2e; }
          .header { text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 16px; margin-bottom: 16px; }
          .header h1 { color: #1565c0; margin: 0; font-size: 24px; }
          .header p { margin: 4px 0; color: #555; font-size: 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px; }
          .info-grid .label { color: #888; }
          .info-grid .value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #f0f4f8; padding: 8px 12px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
          td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
          .abnormal { color: #d32f2f; font-weight: bold; }
          .critical { color: #b71c1c; font-weight: bold; background: #ffebee; }
          .normal { color: #2e7d32; }
          .footer { margin-top: 32px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
          .sig-block { text-align: center; }
          .sig-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; padding-top: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const content = reportRef.current;
    if (!content) return;
    const blob = new Blob([`
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 16px; }
          .header h1 { color: #1565c0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #f0f4f8; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .abnormal { color: red; font-weight: bold; }
          .critical { color: darkred; font-weight: bold; }
          .normal { color: green; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LabReport_${test.testId}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Lab Report</span>
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
          {/* Hospital Header */}
          <div className="header text-center border-b-2 border-primary pb-4">
            <h1 className="text-2xl font-bold text-primary">MediCare Hospital</h1>
            <p className="text-sm text-muted-foreground">Laboratory Report</p>
            <p className="text-xs text-muted-foreground">123 Healthcare Avenue, Medical District</p>
          </div>

          {/* Patient & Test Info */}
          <div className="info-grid grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="label text-muted-foreground">Patient Name: </span>
              <span className="value font-semibold">{test.patient?.firstName} {test.patient?.lastName}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Patient ID: </span>
              <span className="value font-semibold">{test.patient?.patientId}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Test ID: </span>
              <span className="value font-mono font-semibold">{test.testId}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Sample ID: </span>
              <span className="value font-mono font-semibold">{test.sampleId || '-'}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Test Name: </span>
              <span className="value font-semibold">{test.testName}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Category: </span>
              <span className="value font-semibold capitalize">{test.category}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Referred By: </span>
              <span className="value font-semibold">{test.doctor?.name}</span>
            </div>
            <div>
              <span className="label text-muted-foreground">Report Date: </span>
              <span className="value font-semibold">{test.reportGeneratedAt ? new Date(test.reportGeneratedAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>

          <Separator />

          {/* Results Table */}
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
                {(test.parameters || []).map((p, i) => (
                  <tr key={i}>
                    <td className="p-2 border font-medium">{p.name}</td>
                    <td className={`p-2 border ${p.status === 'critical' ? 'text-destructive font-bold' : p.status === 'abnormal' ? 'text-destructive' : ''}`}>
                      {p.value || '-'}
                    </td>
                    <td className="p-2 border text-muted-foreground">{p.unit}</td>
                    <td className="p-2 border text-muted-foreground">{p.normalRange}</td>
                    <td className="p-2 border">
                      <Badge variant={p.status === 'normal' ? 'secondary' : p.status === 'critical' ? 'destructive' : 'default'} className="capitalize">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {test.interpretation && (
            <div>
              <h4 className="font-semibold text-sm">Interpretation</h4>
              <p className="text-sm text-muted-foreground">{test.interpretation}</p>
            </div>
          )}

          {test.remarks && (
            <div>
              <h4 className="font-semibold text-sm">Remarks</h4>
              <p className="text-sm text-muted-foreground">{test.remarks}</p>
            </div>
          )}

          <Separator />

          {/* Signatures */}
          <div className="signatures flex justify-between mt-12 pt-4">
            <div className="sig-block text-center">
              <div className="border-t border-foreground w-48 mx-auto mt-10 pt-1">
                <p className="text-sm font-medium">{test.reportGeneratedBy?.firstName} {test.reportGeneratedBy?.lastName}</p>
                <p className="text-xs text-muted-foreground">Lab Technician</p>
              </div>
            </div>
            <div className="sig-block text-center">
              <div className="border-t border-foreground w-48 mx-auto mt-10 pt-1">
                <p className="text-sm font-medium">{test.verifiedBy?.firstName} {test.verifiedBy?.lastName}</p>
                <p className="text-xs text-muted-foreground">Pathologist</p>
              </div>
            </div>
          </div>

          <div className="footer text-xs text-muted-foreground text-center mt-4 border-t pt-2">
            <p>This is a computer-generated report. Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
