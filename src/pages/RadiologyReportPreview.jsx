import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getRadiologyOrderById } from "@/lib/radiology";
import { getHospitalSettings } from "@/lib/settings";
import { jsPDF } from "jspdf";
import {
  Download, Printer, Bold, Italic, Underline, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, SlidersHorizontal, ArrowLeft
} from "lucide-react";

const defaultHospital = { hospitalName: "Hospital", registrationNumber: "", address: "", phone: "", email: "", website: "" };

const studyTypeLabels = {
  xray: "X-Ray", ct_scan: "CT Scan", mri: "MRI", ultrasound: "Ultrasound",
  mammography: "Mammography", fluoroscopy: "Fluoroscopy", pet_scan: "PET Scan",
  dexa: "DEXA", angiography: "Angiography", other: "Other"
};

export default function RadiologyReportPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showPatientInfo, setShowPatientInfo] = useState(true);
  const [showFindings, setShowFindings] = useState(true);
  const [showImpression, setShowImpression] = useState(true);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showDoctorInfo, setShowDoctorInfo] = useState(true);
  const [fontSizePx, setFontSizePx] = useState("16");
  const [textAlign, setTextAlign] = useState("left");
  const [lineHeight, setLineHeight] = useState("1.6");
  const [wordSpacing, setWordSpacing] = useState("normal");
  const [letterSpacing, setLetterSpacing] = useState("normal");
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#ffffff");
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ["radiology-order", id],
    queryFn: () => getRadiologyOrderById(id),
    enabled: !!id,
  });

  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  const order = orderRes?.data || null;
  const hospitalSettings = useMemo(() => {
    const raw = hospitalRes?.data || {};
    return { ...defaultHospital, ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v)) };
  }, [hospitalRes?.data]);

  const previewStyle = useMemo(() => ({
    fontSize: `${fontSizePx}px`,
    textAlign,
    lineHeight,
    wordSpacing: wordSpacing === "normal" ? "normal" : `${wordSpacing}px`,
    letterSpacing: letterSpacing === "normal" ? "normal" : `${letterSpacing}px`,
    color: textColor,
    backgroundColor: highlightColor,
  }), [fontSizePx, textAlign, lineHeight, wordSpacing, letterSpacing, textColor, highlightColor]);

  const applyCmd = (cmd, val = null) => {
    const el = previewRef.current;
    if (!el) return;
    el.focus();
    try { document.execCommand("styleWithCSS", false, true); document.execCommand(cmd, false, val); } catch {}
  };

  const applyAlign = (a) => {
    setTextAlign(a);
    const map = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
    applyCmd(map[a]);
  };

  const handlePrint = () => {
    const el = previewRef.current;
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Radiology Report</title><style>
      body{font-family:'Segoe UI',sans-serif;padding:20px;color:#1a1a2e}
      .header{text-align:center;border-bottom:2px solid #1565c0;padding-bottom:16px;margin-bottom:16px}
      .header h1{color:#1565c0;margin:0;font-size:24px}.header p{margin:4px 0;color:#555;font-size:12px}
      h3{margin:12px 0 6px;font-size:15px}.section{margin-bottom:16px}
      .footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:8px}
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleDownloadPdf = () => {
    if (!order) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const patient = order.patient || {};
    const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    doc.setFontSize(16);
    doc.text(hospitalSettings.hospitalName, 14, 14);
    doc.setFontSize(10);
    doc.text("Radiology Report", 14, 21);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 14, 14, { align: "right" });

    let y = 32;
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.orderId || "-"}`, 14, y); y += 6;
    doc.text(`Patient: ${patientName}`, 14, y); y += 6;
    doc.text(`Patient ID: ${patient.patientId || "-"}`, 14, y); y += 6;
    doc.text(`Study: ${order.studyName || "-"}`, 14, y); y += 6;
    doc.text(`Type: ${studyTypeLabels[order.studyType] || order.studyType}`, 14, y); y += 6;
    doc.text(`Body Part: ${order.bodyPart || "-"}`, 14, y); y += 6;
    doc.text(`Doctor: ${order.doctor?.name || "-"}`, 14, y); y += 10;

    const addSection = (title, content) => {
      if (!content) return;
      doc.setFontSize(11); doc.text(title, 14, y); y += 6;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(content, pw - 28);
      doc.text(lines, 14, y); y += lines.length * 5 + 6;
      if (y > 270) { doc.addPage(); y = 14; }
    };

    addSection("Findings:", order.findings);
    addSection("Impression:", order.impression);
    addSection("Recommendation:", order.recommendation);
    addSection("Notes:", order.reportNotes);

    y += 4;
    doc.setFontSize(9);
    doc.text(`Reported by: ${order.reportGeneratedBy?.firstName || ""} ${order.reportGeneratedBy?.lastName || ""}`.trim() || "—", 14, y); y += 5;
    if (order.verifiedBy) {
      doc.text(`Verified by: ${order.verifiedBy?.firstName || ""} ${order.verifiedBy?.lastName || ""}`.trim(), 14, y);
    }
    doc.save(`${order.orderId || "radiology-report"}.pdf`);
  };

  if (isLoading || !order) {
    return <div className="p-6">Loading radiology report preview...</div>;
  }

  const patient = order.patient || {};
  const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown";
  const performedDate = order.performedAt ? new Date(order.performedAt).toLocaleString() : "-";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Radiology Report Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditorOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />Editor
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        </div>
      </div>

      {/* Editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>Advanced Editor</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Document Controls</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showHeader} onCheckedChange={(v) => setShowHeader(!!v)} /><Label>Header</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showFooter} onCheckedChange={(v) => setShowFooter(!!v)} /><Label>Footer</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showPatientInfo} onCheckedChange={(v) => setShowPatientInfo(!!v)} /><Label>Patient Info</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showDoctorInfo} onCheckedChange={(v) => setShowDoctorInfo(!!v)} /><Label>Doctor Info</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showFindings} onCheckedChange={(v) => setShowFindings(!!v)} /><Label>Findings</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showImpression} onCheckedChange={(v) => setShowImpression(!!v)} /><Label>Impression</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showRecommendation} onCheckedChange={(v) => setShowRecommendation(!!v)} /><Label>Recommendation</Label></div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"><Checkbox checked={showNotes} onCheckedChange={(v) => setShowNotes(!!v)} /><Label>Notes</Label></div>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label>Font Size</Label>
                  <Select value={fontSizePx} onValueChange={setFontSizePx}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["12","14","16","18","20"].map(s => <SelectItem key={s} value={s}>{s} px</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label>Text Color</Label>
                  <Input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); applyCmd("foreColor", e.target.value); }} className="h-10" />
                </div>
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label className="flex items-center gap-2"><Highlighter className="h-4 w-4" />Highlighter</Label>
                  <Input type="color" value={highlightColor} onChange={(e) => { setHighlightColor(e.target.value); applyCmd("hiliteColor", e.target.value); }} className="h-10" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-3">
                <Button type="button" variant="outline" size="sm" onClick={() => applyCmd("bold")}><Bold className="mr-1 h-4 w-4" />Bold</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyCmd("italic")}><Italic className="mr-1 h-4 w-4" />Italic</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyCmd("underline")}><Underline className="mr-1 h-4 w-4" />Underline</Button>
                <Button type="button" variant={textAlign === "left" ? "default" : "outline"} size="sm" onClick={() => applyAlign("left")}><AlignLeft className="h-4 w-4" /></Button>
                <Button type="button" variant={textAlign === "center" ? "default" : "outline"} size="sm" onClick={() => applyAlign("center")}><AlignCenter className="h-4 w-4" /></Button>
                <Button type="button" variant={textAlign === "right" ? "default" : "outline"} size="sm" onClick={() => applyAlign("right")}><AlignRight className="h-4 w-4" /></Button>
                <Button type="button" variant={textAlign === "justify" ? "default" : "outline"} size="sm" onClick={() => applyAlign("justify")}><AlignJustify className="h-4 w-4" /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label>Line Spacing</Label>
                  <Select value={lineHeight} onValueChange={setLineHeight}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["1.2","1.4","1.6","1.8","2"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label>Word Spacing</Label>
                  <Select value={wordSpacing} onValueChange={setWordSpacing}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["normal","1","2","3","4"].map(v => <SelectItem key={v} value={v}>{v === "normal" ? "Normal" : `${v} px`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Label>Letter Spacing</Label>
                  <Select value={letterSpacing} onValueChange={setLetterSpacing}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["normal","0.5","1","1.5","2"].map(v => <SelectItem key={v} value={v}>{v === "normal" ? "Normal" : `${v} px`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview */}
      <Card>
        <CardHeader><CardTitle>Real-time Preview</CardTitle></CardHeader>
        <CardContent className="bg-muted/20">
          <div
            ref={previewRef}
            contentEditable
            suppressContentEditableWarning
            className="mx-auto w-full max-w-4xl bg-white rounded-md border p-3 sm:p-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={previewStyle}
          >
            {showHeader && (
              <div className="border-b pb-3 mb-4" style={{ borderColor: textColor }}>
                <h2 className="text-xl font-bold" style={{ color: textColor }}>{hospitalSettings.hospitalName}</h2>
                {hospitalSettings.registrationNumber && <p className="text-sm">Reg No: {hospitalSettings.registrationNumber}</p>}
                {hospitalSettings.address && <p className="text-sm">{hospitalSettings.address}</p>}
                {(hospitalSettings.phone || hospitalSettings.email || hospitalSettings.website) && (
                  <p className="text-sm">{[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ")}</p>
                )}
                <p className="text-sm font-semibold mt-1">Radiology Report</p>
                <p className="text-sm">Order ID: {order.orderId || "-"}</p>
              </div>
            )}

            {showPatientInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                <p><strong>Patient:</strong> {patientName}</p>
                <p><strong>Patient ID:</strong> {patient.patientId || "-"}</p>
                <p><strong>Study:</strong> {order.studyName || "-"}</p>
                <p><strong>Type:</strong> {studyTypeLabels[order.studyType] || order.studyType}</p>
                <p><strong>Body Part:</strong> {order.bodyPart || "-"}</p>
                <p><strong>Priority:</strong> <Badge variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "default" : "secondary"} className="capitalize">{order.priority}</Badge></p>
                <p><strong>Status:</strong> <Badge className="capitalize">{order.status}</Badge></p>
                <p><strong>Performed:</strong> {performedDate}</p>
              </div>
            )}

            {showDoctorInfo && (
              <div className="text-sm mb-4">
                <p><strong>Referring Doctor:</strong> {order.doctor?.name || "-"}</p>
                {order.reportGeneratedBy && (
                  <p><strong>Reported by:</strong> {`${order.reportGeneratedBy?.firstName || ""} ${order.reportGeneratedBy?.lastName || ""}`.trim() || "-"}</p>
                )}
                {order.verifiedBy && (
                  <p><strong>Verified by:</strong> {`${order.verifiedBy?.firstName || ""} ${order.verifiedBy?.lastName || ""}`.trim()}</p>
                )}
              </div>
            )}

            {showFindings && order.findings && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1" style={{ color: textColor }}>Findings</h3>
                <p className="text-sm whitespace-pre-wrap">{order.findings}</p>
              </div>
            )}

            {showImpression && order.impression && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1" style={{ color: textColor }}>Impression</h3>
                <p className="text-sm whitespace-pre-wrap">{order.impression}</p>
              </div>
            )}

            {showRecommendation && order.recommendation && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1" style={{ color: textColor }}>Recommendation</h3>
                <p className="text-sm whitespace-pre-wrap">{order.recommendation}</p>
              </div>
            )}

            {showNotes && order.reportNotes && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1" style={{ color: textColor }}>Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{order.reportNotes}</p>
              </div>
            )}

            {showFooter && (
              <div className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                <p>This is a computer-generated report. Generated on {new Date().toLocaleString()}</p>
                <p>{[hospitalSettings.phone, hospitalSettings.email, hospitalSettings.website].filter(Boolean).join(" | ") || "For queries, contact hospital front desk."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
