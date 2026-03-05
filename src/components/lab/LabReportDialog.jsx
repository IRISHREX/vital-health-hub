import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getHospitalSettings } from "@/lib/settings";
import { Download, Printer } from "lucide-react";

const defaultHospital = { hospitalName: "Hospital", address: "", phone: "", email: "", website: "" };

const formatRefRange = (ref, gender) => {
  if (!ref) return "-";
  const g = gender || "all";
  const range = ref[g] || ref.all;
  if (!range) return "-";
  return `${range.min ?? ""} - ${range.max ?? ""}`;
};

export default function LabReportDialog({ isOpen, onClose, test, tests = [] }) {
  const reportRef = useRef(null);
  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  const reportTests = useMemo(() => {
    if (Array.isArray(tests) && tests.length > 0) return tests;
    return test ? [test] : [];
  }, [test, tests]);

  const hospitalSettings = useMemo(() => {
    const raw = hospitalRes?.data || {};
    return { ...defaultHospital, ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v)) };
  }, [hospitalRes?.data]);

  if (reportTests.length === 0) return null;

  const primaryTest = reportTests[0];
  const isCombined = reportTests.length > 1;
  const patientGender = primaryTest.patient?.gender?.toLowerCase() || "all";

  const getReferredByName = (rt) => {
    if (rt?.doctor?.name) return rt.doctor.name;
    const docFull = `${rt?.doctor?.firstName || ""} ${rt?.doctor?.lastName || ""}`.trim();
    if (docFull) return docFull;
    const orderedFull = `${rt?.orderedBy?.firstName || ""} ${rt?.orderedBy?.lastName || ""}`.trim();
    return orderedFull || "N/A";
  };

  const titleText = isCombined
    ? `Combined Report - ${primaryTest.patient?.patientId || "Patient"}`
    : `Lab Report - ${primaryTest.testId || "Test"}`;
  const filenameBase = isCombined
    ? `CombinedLabReport_${primaryTest.patient?.patientId || "Patient"}_${reportTests.length}Tests`
    : `LabReport_${primaryTest.testId || "Test"}`;

  const printStyles = `
    body{font-family:'Segoe UI',sans-serif;padding:20px;color:#1a1a2e}
    .header{text-align:center;border-bottom:2px solid #1565c0;padding-bottom:16px;margin-bottom:16px}
    .header h1{color:#1565c0;margin:0;font-size:24px}.header p{margin:4px 0;color:#555;font-size:12px}
    .report-block{margin-bottom:22px;page-break-inside:avoid}
    .section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1565c0;border-bottom:1px solid #ddd;padding-bottom:4px;margin:12px 0 8px}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    th{background:#f0f4f8;padding:6px 10px;text-align:left;border:1px solid #ddd;font-size:11px}
    td{padding:6px 10px;border:1px solid #ddd;font-size:12px}
    .group-header td{background:#f8f9fa;font-weight:600;font-size:12px}
    .sub-param td:first-child{padding-left:24px}
    .footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:8px}
  `;

  const openPrintWindow = () => {
    const content = reportRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${titleText}</title><style>${printStyles}</style></head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleDownload = () => {
    const content = reportRef.current;
    if (!content) return;
    const blob = new Blob(
      [`<html><head><style>${printStyles}</style></head><body>${content.innerHTML}</body></html>`],
      { type: "application/msword" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTestResults = (currentTest) => {
    const hasSections = currentTest.sections?.length > 0;

    if (hasSections) {
      return currentTest.sections.map((sec, si) => (
        <div key={si}>
          <div className="section-title text-xs font-bold uppercase tracking-wider text-primary border-b pb-1 mb-2">{sec.sectionName}</div>
          {sec.tests.map((t, ti) => (
            <div key={ti} className="mb-3">
              <p className="text-sm font-semibold mb-1">{t.testName}</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
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
                      <>
                        <tr key={`${pi}-h`} className="group-header bg-muted/30">
                          <td className="p-1.5 border font-semibold" colSpan={5}>{p.name}</td>
                        </tr>
                        {p.subParameters.map((sp, spi) => (
                          <tr key={`${pi}-${spi}`} className="sub-param">
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

    // Legacy flat params
    return (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 text-left border">Parameter</th>
            <th className="p-2 text-left border">Value</th>
            <th className="p-2 text-left border">Unit</th>
            <th className="p-2 text-left border">Ref. Range</th>
            <th className="p-2 text-left border">Status</th>
          </tr>
        </thead>
        <tbody>
          {(currentTest.parameters || []).map((p, i) => (
            <>
              {p.subParameters?.length > 0 ? (
                <>
                  <tr key={`${i}-h`} className="bg-muted/30"><td className="p-2 border font-semibold" colSpan={5}>{p.name}</td></tr>
                  {p.subParameters.map((sp, spi) => (
                    <tr key={`${i}-${spi}`}>
                      <td className="p-2 border pl-6">{sp.name}</td>
                      <td className={`p-2 border ${sp.status === "critical" ? "text-destructive font-bold" : sp.status === "abnormal" ? "text-destructive" : ""}`}>{sp.value || "-"}</td>
                      <td className="p-2 border text-muted-foreground">{sp.unit || "-"}</td>
                      <td className="p-2 border text-muted-foreground">{formatRefRange(sp.referenceRange, patientGender)}</td>
                      <td className="p-2 border"><Badge variant={sp.status === "normal" ? "secondary" : sp.status === "critical" ? "destructive" : "default"} className="capitalize">{sp.status}</Badge></td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr key={i}>
                  <td className="p-2 border font-medium">{p.name}</td>
                  <td className={`p-2 border ${p.status === "critical" ? "text-destructive font-bold" : p.status === "abnormal" ? "text-destructive" : ""}`}>{p.value || "-"}</td>
                  <td className="p-2 border text-muted-foreground">{p.unit}</td>
                  <td className="p-2 border text-muted-foreground">{formatRefRange(p.referenceRange, patientGender) || p.normalRange || "-"}</td>
                  <td className="p-2 border"><Badge variant={p.status === "normal" ? "secondary" : p.status === "critical" ? "destructive" : "default"} className="capitalize">{p.status}</Badge></td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isCombined ? `Combined Lab Reports (${reportTests.length})` : "Lab Report"}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openPrintWindow}><Printer className="mr-2 h-4 w-4" />Print</Button>
              <Button size="sm" variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Download</Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={reportRef} className="space-y-4 p-4 border rounded-lg bg-card">
          <div className="text-center border-b-2 border-primary pb-4">
            <h1 className="text-2xl font-bold text-primary">{hospitalSettings.hospitalName}</h1>
            <p className="text-sm text-muted-foreground">{isCombined ? "Combined Laboratory Reports" : "Laboratory Report"}</p>
            {hospitalSettings.address && <p className="text-xs text-muted-foreground">{hospitalSettings.address}</p>}
            {(hospitalSettings.phone || hospitalSettings.email || hospitalSettings.website) && (
              <p className="text-xs text-muted-foreground">{[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ")}</p>
            )}
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Patient: </span>
            <span className="font-semibold">{primaryTest.patient?.firstName} {primaryTest.patient?.lastName}</span>
            <span className="text-muted-foreground ml-4">Patient ID: </span>
            <span className="font-semibold">{primaryTest.patient?.patientId}</span>
            {primaryTest.patient?.gender && (
              <><span className="text-muted-foreground ml-4">Gender: </span><span className="font-semibold capitalize">{primaryTest.patient.gender}</span></>
            )}
          </div>

          {reportTests.map((currentTest, index) => (
            <div key={currentTest._id || `${currentTest.testId}-${index}`} className="space-y-3 report-block">
              {index > 0 && <Separator />}
              <div className="space-y-1">
                <div className="font-semibold">
                  {currentTest.testName} ({currentTest.testCode}) | {currentTest.testId}
                </div>
                <div className="text-sm flex flex-wrap gap-4">
                  <span><span className="text-muted-foreground">Sample ID:</span> <span className="font-mono font-semibold">{currentTest.sampleId || "-"}</span></span>
                  <span><span className="text-muted-foreground">Referred By:</span> <span className="font-semibold">{getReferredByName(currentTest)}</span></span>
                  <span>
                    <span className="text-muted-foreground">Report Date:</span>{" "}
                    <span className="font-semibold">{currentTest.reportGeneratedAt ? new Date(currentTest.reportGeneratedAt).toLocaleDateString() : "-"}</span>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Test Results</h3>
                {renderTestResults(currentTest)}
              </div>

              {currentTest.interpretation && (
                <div><h4 className="font-semibold text-sm">Interpretation</h4><p className="text-sm text-muted-foreground">{currentTest.interpretation}</p></div>
              )}
              {currentTest.remarks && (
                <div><h4 className="font-semibold text-sm">Remarks</h4><p className="text-sm text-muted-foreground">{currentTest.remarks}</p></div>
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
