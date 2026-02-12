import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const patientLabel = (rx) =>
  `${rx?.patient?.firstName || ""} ${rx?.patient?.lastName || ""}`.trim() || "Unknown";

const doctorLabel = (rx) => {
  const d = rx?.doctor;
  if (!d) return "Unknown";
  if (d.name) return `Dr. ${d.name}`;
  const root = `${d.firstName || ""} ${d.lastName || ""}`.trim();
  if (root) return `Dr. ${root}`;
  const user = `${d.user?.firstName || ""} ${d.user?.lastName || ""}`.trim();
  return user ? `Dr. ${user}` : "Unknown";
};

export const downloadPrescriptionPdf = (rx) => {
  const doc = new jsPDF();
  const date = rx?.createdAt ? new Date(rx.createdAt).toLocaleString() : "-";
  doc.setFontSize(16);
  doc.text("Clinical Prescription", 14, 16);
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 14, 24);
  doc.text(`Patient: ${patientLabel(rx)}`, 14, 30);
  doc.text(`Doctor: ${doctorLabel(rx)}`, 14, 36);
  doc.text(`Encounter: ${(rx?.encounterType || "opd").toUpperCase()}`, 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [["Medicine", "Dose", "Frequency", "Route", "Duration"]],
    body: (rx?.items || []).map((item) => [
      item?.medicineName || "-",
      item?.dosage || "-",
      item?.frequency || "-",
      item?.route || "-",
      item?.duration || "-",
    ]),
    styles: { fontSize: 9 },
  });

  const notesY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 120;
  doc.setFontSize(10);
  doc.text("Advice:", 14, notesY);
  doc.setFontSize(9);
  doc.text(String(rx?.notes || "-"), 14, notesY + 6, { maxWidth: 180 });
  doc.save(`prescription-${rx?._id || "record"}.pdf`);
};

export const printPrescription = (rx) => {
  const date = rx?.createdAt ? new Date(rx.createdAt).toLocaleString() : "-";
  const rows = (rx?.items || [])
    .map(
      (item) => `
      <tr>
        <td>${item?.medicineName || "-"}</td>
        <td>${item?.dosage || "-"}</td>
        <td>${item?.frequency || "-"}</td>
        <td>${item?.route || "-"}</td>
        <td>${item?.duration || "-"}</td>
      </tr>`
    )
    .join("");
  const html = `
    <html>
      <head>
        <title>Prescription</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
          h2{margin:0 0 12px}
          p{margin:3px 0}
          table{width:100%;border-collapse:collapse;margin-top:10px}
          th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px}
        </style>
      </head>
      <body>
        <h2>Clinical Prescription</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Patient:</strong> ${patientLabel(rx)}</p>
        <p><strong>Doctor:</strong> ${doctorLabel(rx)}</p>
        <p><strong>Encounter:</strong> ${(rx?.encounterType || "opd").toUpperCase()}</p>
        <table>
          <thead>
            <tr>
              <th>Medicine</th><th>Dose</th><th>Frequency</th><th>Route</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:12px"><strong>Advice:</strong> ${String(rx?.notes || "-")}</p>
      </body>
    </html>
  `;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
};
