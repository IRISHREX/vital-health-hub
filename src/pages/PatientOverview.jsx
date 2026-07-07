import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/PageState";

import { getPatientById, getPatientHistory } from "@/lib/patients";
import { getLatestVital } from "@/lib/vitals";
import { getInvoices } from "@/lib/invoices";
import { getAppointments } from "@/lib/appointments";
import { getHospitalSettings } from "@/lib/settings";
import { resolveBranding, addJsPdfHeader, addJsPdfFooter, wrapBrandedPrintHtml, printBrandedHtml } from "@/lib/branding";
import { buildDocumentCodes } from "@/lib/document-codes";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const fullName = (p) => `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || "-";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "-");

const calculateAge = (dob) => {
  if (!dob) return "-";
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return "-";
  const diff = Date.now() - b.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${years} yrs`;
};

export default function PatientOverview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: patientRes, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatientById(id),
    enabled: !!id,
  });
  const patient =
    patientRes?.data?.patient ||
    patientRes?.patient ||
    patientRes?.data ||
    patientRes ||
    {};

  const { data: historyRes } = useQuery({
    queryKey: ["patient-history", id],
    queryFn: () => getPatientHistory(id, { page: 1, limit: 50 }),
    enabled: !!id,
  });
  const history = historyRes?.data || historyRes || {};

  const { data: vitalRes } = useQuery({
    queryKey: ["patient-latest-vital", id],
    queryFn: () => getLatestVital(id),
    enabled: !!id,
  });
  const latestVital = vitalRes?.data || vitalRes?.vital || null;

  const { data: invoicesRes } = useQuery({
    queryKey: ["patient-invoices", id],
    queryFn: () => getInvoices({ patientId: id }),
    enabled: !!id,
  });
  const invoices = Array.isArray(invoicesRes) ? invoicesRes : invoicesRes?.data || [];

  const { data: apptsRes } = useQuery({
    queryKey: ["patient-appointments", id],
    queryFn: () => getAppointments({ patient: id }),
    enabled: !!id,
  });
  const appointments = Array.isArray(apptsRes?.data)
    ? apptsRes.data
    : Array.isArray(apptsRes)
    ? apptsRes
    : apptsRes?.data?.appointments || [];

  const { data: settingsRes } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });
  const hospital = settingsRes?.data || settingsRes || {};

  const billingTotals = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    return { total, paid, due: Math.max(0, total - paid) };
  }, [invoices]);

  if (isLoading) return <LoadingState />;
  if (!patient || !patient._id) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="mt-4 text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  const admissions = history?.admissions || [];
  const prescriptions = history?.prescriptions || [];
  const labTests = history?.labTests || [];
  const radiology = history?.radiologyOrders || history?.radiology || [];

  const handlePrint = () => {
    const branding = resolveBranding(hospital, "invoice");
    const body = document.getElementById("patient-overview-printable")?.innerHTML || "";
    printBrandedHtml(`Patient Overview - ${fullName(patient)}`, branding, body, `
      h2 { font-size: 14px; margin: 14px 0 6px; color:#1565c0; border-bottom:1px solid #e5e7eb; padding-bottom:3px;}
      table th, table td { border:1px solid #d1d5db; padding:5px 7px; font-size:11px; text-align:left;}
      table th { background:#f3f4f6;}
      .kv { display:grid; grid-template-columns:repeat(2,1fr); gap:4px 16px; font-size:11.5px;}
      .kv div span { color:#6b7280; }
      .summary { display:flex; gap:12px; margin:6px 0 10px;}
      .summary .box { flex:1; border:1px solid #d1d5db; border-radius:6px; padding:6px 8px; font-size:11px;}
      .summary .box b { display:block; font-size:13px; }
    `);
  };

  const handleDownloadPdf = async () => {
    const branding = resolveBranding(hospital, "invoice");
    const doc = new jsPDF();
    let y = addJsPdfHeader(doc, branding);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Patient Overview", 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const idLabel = patient.patientId || patient._id;
    const rows = [
      ["Patient ID", String(idLabel)],
      ["Name", fullName(patient)],
      ["Age / Gender", `${calculateAge(patient.dateOfBirth)} / ${patient.gender || "-"}`],
      ["Phone", patient.phone || "-"],
      ["Email", patient.email || "-"],
      ["Blood Group", patient.bloodGroup || "-"],
      ["Address", typeof patient.address === "string" ? patient.address : [patient.address?.street, patient.address?.city, patient.address?.state, patient.address?.pincode].filter(Boolean).join(", ") || "-"],
      ["Registered On", fmtDate(patient.createdAt)],
      ["Status", patient.status || "-"],
    ];
    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 101, 192] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    if (latestVital) {
      doc.setFont("helvetica", "bold");
      doc.text("Latest Vitals", 14, y);
      y += 2;
      autoTable(doc, {
        startY: y + 2,
        head: [["BP", "Pulse", "Temp", "SpO2", "Resp", "Recorded"]],
        body: [[
          latestVital.bloodPressure ? `${latestVital.bloodPressure.systolic || "-"}/${latestVital.bloodPressure.diastolic || "-"}` : "-",
          latestVital.pulse ?? "-",
          latestVital.temperature ?? "-",
          latestVital.oxygenSaturation ?? "-",
          latestVital.respiratoryRate ?? "-",
          fmtDateTime(latestVital.recordedAt || latestVital.createdAt),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 101, 192] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (admissions.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Admissions", 14, y);
      autoTable(doc, {
        startY: y + 2,
        head: [["Admission ID", "Type", "Admitted", "Discharged", "Status"]],
        body: admissions.slice(0, 20).map((a) => [
          a.admissionId || "-",
          a.admissionType || "-",
          fmtDate(a.admissionDate || a.createdAt),
          fmtDate(a.dischargeDate),
          a.status || "-",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 101, 192] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (appointments.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Appointments", 14, y);
      autoTable(doc, {
        startY: y + 2,
        head: [["Date", "Doctor", "Reason", "Status"]],
        body: appointments.slice(0, 20).map((a) => [
          fmtDate(a.appointmentDate || a.date),
          fullName(a.doctor?.user || a.doctor) || "-",
          a.reason || a.notes || "-",
          a.status || "-",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 101, 192] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (invoices.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Billing Summary", 14, y);
      autoTable(doc, {
        startY: y + 2,
        head: [["Invoice", "Date", "Type", "Total", "Paid", "Due", "Status"]],
        body: invoices.slice(0, 30).map((i) => [
          i.invoiceNumber || "-",
          fmtDate(i.createdAt),
          i.type || "-",
          Number(i.totalAmount || 0).toLocaleString(),
          Number(i.paidAmount || 0).toLocaleString(),
          Number(Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0))).toLocaleString(),
          i.status || "-",
        ]),
        foot: [["", "", "Totals", billingTotals.total.toLocaleString(), billingTotals.paid.toLocaleString(), billingTotals.due.toLocaleString(), ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 101, 192] },
        footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    addJsPdfFooter(doc, branding);
    doc.save(`patient-overview-${patient.patientId || patient._id}.pdf`);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div id="patient-overview-printable" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{fullName(patient)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  ID: {patient.patientId || patient._id} · {calculateAge(patient.dateOfBirth)} · {patient.gender || "-"}
                </p>
              </div>
              {patient.status && <Badge variant="secondary">{patient.status}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="kv grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Phone: </span>{patient.phone || "-"}</div>
              <div><span className="text-muted-foreground">Email: </span>{patient.email || "-"}</div>
              <div><span className="text-muted-foreground">DOB: </span>{fmtDate(patient.dateOfBirth)}</div>
              <div><span className="text-muted-foreground">Blood Group: </span>{patient.bloodGroup || "-"}</div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Address: </span>
                {typeof patient.address === "string"
                  ? patient.address
                  : [patient.address?.street, patient.address?.city, patient.address?.state, patient.address?.pincode]
                      .filter(Boolean)
                      .join(", ") || "-"}
              </div>
              <div><span className="text-muted-foreground">Emergency Contact: </span>{patient.emergencyContact?.name || "-"} {patient.emergencyContact?.phone ? `(${patient.emergencyContact.phone})` : ""}</div>
              <div><span className="text-muted-foreground">Registered: </span>{fmtDate(patient.createdAt)}</div>
            </div>
          </CardContent>
        </Card>

        <div className="summary grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-lg font-semibold">Rs {billingTotals.total.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold text-status-available">Rs {billingTotals.paid.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Due</p><p className="text-lg font-semibold text-status-occupied">Rs {billingTotals.due.toLocaleString()}</p></CardContent></Card>
        </div>

        {latestVital && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Latest Vitals</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                <div><span className="text-muted-foreground">BP: </span>{latestVital.bloodPressure ? `${latestVital.bloodPressure.systolic || "-"}/${latestVital.bloodPressure.diastolic || "-"}` : "-"}</div>
                <div><span className="text-muted-foreground">Pulse: </span>{latestVital.pulse ?? "-"}</div>
                <div><span className="text-muted-foreground">Temp: </span>{latestVital.temperature ?? "-"}</div>
                <div><span className="text-muted-foreground">SpO2: </span>{latestVital.oxygenSaturation ?? "-"}</div>
                <div><span className="text-muted-foreground">Resp: </span>{latestVital.respiratoryRate ?? "-"}</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Recorded {fmtDateTime(latestVital.recordedAt || latestVital.createdAt)}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Admissions ({admissions.length})</CardTitle></CardHeader>
          <CardContent>
            {admissions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Admitted</TableHead>
                    <TableHead>Discharged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admissions.slice(0, 10).map((a) => (
                    <TableRow key={a._id}>
                      <TableCell>{a.admissionId || "-"}</TableCell>
                      <TableCell>{a.admissionType || "-"}</TableCell>
                      <TableCell>{fmtDate(a.admissionDate || a.createdAt)}</TableCell>
                      <TableCell>{fmtDate(a.dischargeDate)}</TableCell>
                      <TableCell>{a.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No admissions recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Appointments ({appointments.length})</CardTitle></CardHeader>
          <CardContent>
            {appointments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.slice(0, 10).map((a) => (
                    <TableRow key={a._id}>
                      <TableCell>{fmtDate(a.appointmentDate || a.date)}</TableCell>
                      <TableCell>{fullName(a.doctor?.user || a.doctor) || "-"}</TableCell>
                      <TableCell>{a.reason || a.notes || "-"}</TableCell>
                      <TableCell>{a.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Invoices ({invoices.length})</CardTitle></CardHeader>
          <CardContent>
            {invoices.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 15).map((i) => (
                    <TableRow key={i._id}>
                      <TableCell>{i.invoiceNumber || "-"}</TableCell>
                      <TableCell>{fmtDate(i.createdAt)}</TableCell>
                      <TableCell>{i.type || "-"}</TableCell>
                      <TableCell className="text-right">{Number(i.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(i.paidAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0))).toLocaleString()}</TableCell>
                      <TableCell>{i.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices.</p>
            )}
          </CardContent>
        </Card>

        {(prescriptions.length > 0 || labTests.length > 0 || radiology.length > 0) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Clinical History</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="font-medium">Prescriptions:</span> {prescriptions.length}</div>
              <div><span className="font-medium">Lab Tests:</span> {labTests.length}</div>
              <div><span className="font-medium">Radiology Orders:</span> {radiology.length}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
