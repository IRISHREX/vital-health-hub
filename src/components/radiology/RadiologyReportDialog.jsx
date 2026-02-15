import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createReport, verifyReport } from "@/lib/radiology";
import { getHospitalSettings } from "@/lib/settings";
import { jsPDF } from "jspdf";
import { Download, Loader2, CheckCircle2, FileText } from "lucide-react";

const studyTypeLabels = {
  xray: "X-Ray", ct_scan: "CT Scan", mri: "MRI", ultrasound: "Ultrasound",
  mammography: "Mammography", fluoroscopy: "Fluoroscopy", pet_scan: "PET Scan",
  dexa: "DEXA", angiography: "Angiography", other: "Other"
};

const defaultHospital = {
  hospitalName: "Hospital",
  address: "",
  phone: "",
  email: "",
  website: "",
};

export default function RadiologyReportDialog({ isOpen, onClose, order, permissions }) {
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: hospitalRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  useEffect(() => {
    if (order) {
      setFindings(order.findings || "");
      setImpression(order.impression || "");
      setRecommendation(order.recommendation || "");
      setReportNotes(order.reportNotes || "");
    }
  }, [order]);

  if (!order) return null;

  const patient = order.patient || {};
  const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown";
  const hospitalSettings = hospitalRes?.data || defaultHospital;
  const isReported = ["reported", "verified", "delivered"].includes(order.status);
  const canEdit = ["completed", "reported"].includes(order.status) && (permissions?.canEdit || permissions?.canCreate);

  const handleSaveReport = async () => {
    if (!findings.trim()) { toast.error("Findings are required"); return; }
    try {
      setSubmitting(true);
      await createReport(order._id, { findings, impression, recommendation, reportNotes });
      toast.success("Report saved");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    try {
      setSubmitting(true);
      await verifyReport(order._id);
      toast.success("Report verified");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(hospitalSettings.hospitalName || defaultHospital.hospitalName, 14, 14);
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
    doc.text(`Doctor: ${order.doctor?.name || "-"}`, 14, y); y += 6;
    doc.text(`Date: ${order.performedAt ? new Date(order.performedAt).toLocaleString() : "-"}`, 14, y); y += 10;

    doc.setFontSize(11);
    doc.text("Findings:", 14, y); y += 6;
    doc.setFontSize(9);
    const findingsLines = doc.splitTextToSize(findings || "N/A", pw - 28);
    doc.text(findingsLines, 14, y); y += findingsLines.length * 5 + 6;

    doc.setFontSize(11);
    doc.text("Impression:", 14, y); y += 6;
    doc.setFontSize(9);
    const impressionLines = doc.splitTextToSize(impression || "N/A", pw - 28);
    doc.text(impressionLines, 14, y); y += impressionLines.length * 5 + 6;

    if (recommendation) {
      doc.setFontSize(11);
      doc.text("Recommendation:", 14, y); y += 6;
      doc.setFontSize(9);
      const recLines = doc.splitTextToSize(recommendation, pw - 28);
      doc.text(recLines, 14, y); y += recLines.length * 5 + 6;
    }

    if (reportNotes) {
      doc.setFontSize(11);
      doc.text("Notes:", 14, y); y += 6;
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(reportNotes, pw - 28);
      doc.text(noteLines, 14, y); y += noteLines.length * 5 + 6;
    }

    y += 6;
    doc.setFontSize(9);
    doc.text(`Reported by: ${order.reportGeneratedBy?.firstName || ""} ${order.reportGeneratedBy?.lastName || ""}`.trim() || "—", 14, y); y += 5;
    if (order.verifiedBy) {
      doc.text(`Verified by: ${order.verifiedBy?.firstName || ""} ${order.verifiedBy?.lastName || ""}`.trim(), 14, y);
    }

    doc.save(`${order.orderId || "radiology-report"}.pdf`);
  };

  const downloadDoc = () => {
    const content = `
RADIOLOGY REPORT
================
${hospitalSettings.hospitalName || defaultHospital.hospitalName}

Order ID: ${order.orderId || "-"}
Patient: ${patientName}
Patient ID: ${patient.patientId || "-"}
Study: ${order.studyName || "-"} (${studyTypeLabels[order.studyType] || order.studyType})
Body Part: ${order.bodyPart || "-"}
Doctor: ${order.doctor?.name || "-"}
Date: ${order.performedAt ? new Date(order.performedAt).toLocaleString() : "-"}

FINDINGS
--------
${findings || "N/A"}

IMPRESSION
----------
${impression || "N/A"}

RECOMMENDATION
--------------
${recommendation || "N/A"}

NOTES
-----
${reportNotes || "N/A"}

Reported by: ${order.reportGeneratedBy?.firstName || ""} ${order.reportGeneratedBy?.lastName || ""}
${order.verifiedBy ? `Verified by: ${order.verifiedBy?.firstName || ""} ${order.verifiedBy?.lastName || ""}` : ""}
    `.trim();

    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${order.orderId || "radiology-report"}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Radiology Report — {order.orderId}
          </DialogTitle>
          <DialogDescription>
            {studyTypeLabels[order.studyType] || order.studyType} • {order.bodyPart} • {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{order.studyName}</Badge>
            <Badge variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "default" : "secondary"}>{order.priority}</Badge>
            <Badge>{order.status}</Badge>
          </div>

          <div className="space-y-2">
            <Label>Findings *</Label>
            <Textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} disabled={!canEdit && isReported} placeholder="Describe radiological findings..." />
          </div>
          <div className="space-y-2">
            <Label>Impression</Label>
            <Textarea rows={3} value={impression} onChange={(e) => setImpression(e.target.value)} disabled={!canEdit && isReported} placeholder="Overall impression..." />
          </div>
          <div className="space-y-2">
            <Label>Recommendation</Label>
            <Textarea rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} disabled={!canEdit && isReported} placeholder="Suggested follow-up..." />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} disabled={!canEdit && isReported} placeholder="Additional notes..." />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {isReported && (
            <>
              <Button variant="outline" onClick={downloadPdf}><Download className="mr-2 h-4 w-4" />PDF</Button>
              <Button variant="outline" onClick={downloadDoc}><Download className="mr-2 h-4 w-4" />DOC</Button>
            </>
          )}
          {canEdit && (
            <Button onClick={handleSaveReport} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isReported ? "Update Report" : "Save Report"}
            </Button>
          )}
          {order.status === "reported" && permissions?.canEdit && (
            <Button variant="default" onClick={handleVerify} disabled={submitting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Verify
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
