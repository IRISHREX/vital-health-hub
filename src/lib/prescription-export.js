import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const DEFAULT_HOSPITAL = {
  hospitalName: "Vital Health Hub Hospital",
  address: "Address not configured",
  phone: "N/A",
  email: "N/A",
  website: "",
  registrationNumber: "",
};

const normalizeHospital = (hospitalSettings = {}) => ({
  ...DEFAULT_HOSPITAL,
  ...hospitalSettings,
});

const patientLabel = (rx) =>
  `${rx?.patient?.firstName || ""} ${rx?.patient?.lastName || ""}`.trim() || "Unknown";

const patientIdLabel = (rx) => rx?.patient?.patientId || "-";

const doctorLabel = (rx) => {
  const d = rx?.doctor;
  if (!d) return "Unknown";
  if (d.name) return `Dr. ${d.name}`;
  const root = `${d.firstName || ""} ${d.lastName || ""}`.trim();
  if (root) return `Dr. ${root}`;
  const user = `${d.user?.firstName || ""} ${d.user?.lastName || ""}`.trim();
  return user ? `Dr. ${user}` : "Unknown";
};

const toDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const toDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const csv = (arr = []) => arr.filter(Boolean).join(", ") || "-";

const getSections = (rx, options = {}) => ({
  showVitals: options.showVitals !== false,
  showFemaleSection: options.showFemaleSection !== false,
  showTests: options.showTests !== false,
  showAdvice: options.showAdvice !== false,
  showHeader: options.showHeader !== false,
  showFooter: options.showFooter !== false,
  showDoctorDetails: options.showDoctorDetails !== false,
  medicines: Array.isArray(rx?.items) ? rx.items : [],
  tests: Array.isArray(rx?.testAdvice) ? rx.testAdvice : [],
});

export const downloadPrescriptionPdf = (rx, options = {}) => {
  const hospital = normalizeHospital(options.hospitalSettings);
  const section = getSections(rx, options);
  const doc = new jsPDF("p", "mm", "a4");
  const pageHeight = 297;
  const left = 12;
  const right = 198;
  const width = right - left;
  let y = 14;

  const ensureSpace = (needed = 10) => {
    if (y + needed <= pageHeight - 20) return;
    doc.addPage();
    y = 14;
  };

  const drawWrapped = (label, value, fontSize = 9) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.text(label, left, y);
    const x = left + 28;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value || "-"), width - 28);
    doc.text(lines, x, y);
    y += Math.max(5, lines.length * 4.5);
  };

  if (section.showHeader) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(hospital.hospitalName || DEFAULT_HOSPITAL.hospitalName), (left + right) / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(hospital.address || DEFAULT_HOSPITAL.address), (left + right) / 2, y, { align: "center" });
    y += 4.8;
    doc.text(
      `Phone: ${hospital.phone || "-"}    Email: ${hospital.email || "-"}${hospital.website ? `    Web: ${hospital.website}` : ""}`,
      (left + right) / 2,
      y,
      { align: "center" }
    );
    y += 5;
    doc.setDrawColor(40, 40, 40);
    doc.line(left, y, right, y);
    y += 7;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PRESCRIPTION", (left + right) / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Rx ID: ${rx?._id || "-"}`, left, y);
  doc.text(`Date: ${toDateTime(rx?.createdAt)}`, right, y, { align: "right" });
  y += 5.5;
  if (hospital.registrationNumber) {
    doc.text(`Hospital Reg: ${hospital.registrationNumber}`, left, y);
    y += 5;
  }

  ensureSpace(28);
  const detailsBody = [
    ["Follow-up", toDate(rx?.followUpDate), "Gender", rx?.patient?.gender || "-"],
  ];
  if (section.showDoctorDetails) {
    detailsBody.unshift(["Doctor", doctorLabel(rx), "Encounter", String(rx?.encounterType || "opd").toUpperCase()]);
  } else {
    detailsBody.unshift(["Encounter", String(rx?.encounterType || "opd").toUpperCase(), "", ""]);
  }

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: [190, 190, 190], lineWidth: 0.2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    head: [["Patient", patientLabel(rx), "Patient ID", patientIdLabel(rx)]],
    body: detailsBody,
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" }, 1: { cellWidth: 70 }, 2: { cellWidth: 24, fontStyle: "bold" }, 3: { cellWidth: 68 } },
    margin: { left, right: 210 - right },
  });
  y = (doc.lastAutoTable?.finalY || y) + 6;

  ensureSpace(20);
  drawWrapped("Complaints:", csv(rx?.complaints || []));
  drawWrapped("History:", csv(rx?.medicalHistory || []));
  drawWrapped("Diagnosis:", rx?.diagnosis || "-");

  if (section.showVitals && rx?.vitals) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Vitals", left, y);
    y += 5;
    drawWrapped(
      "",
      [
        rx?.vitals?.bloodPressure ? `BP ${rx.vitals.bloodPressure}` : "",
        rx?.vitals?.pulseRate ? `PR ${rx.vitals.pulseRate}` : "",
        rx?.vitals?.spo2 ? `SpO2 ${rx.vitals.spo2}` : "",
        rx?.vitals?.temperature ? `Temp ${rx.vitals.temperature}` : "",
        rx?.vitals?.heightCm ? `Height ${rx.vitals.heightCm} cm` : "",
        rx?.vitals?.weightKg ? `Weight ${rx.vitals.weightKg} kg` : "",
        rx?.vitals?.bmi ? `BMI ${rx.vitals.bmi}` : "",
      ].filter(Boolean).join(" | ") || "-"
    );
  }

  const female = String(rx?.patient?.gender || "").toLowerCase() === "female";
  if (section.showFemaleSection && female && rx?.femaleHealth) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Female Clinical Details", left, y);
    y += 5;
    drawWrapped(
      "",
      [
        rx?.femaleHealth?.gravida ? `Gravida ${rx.femaleHealth.gravida}` : "",
        (rx?.femaleHealth?.parityA || rx?.femaleHealth?.parityB)
          ? `Parity ${rx?.femaleHealth?.parityA || "-"}+${rx?.femaleHealth?.parityB || "-"}`
          : "",
        rx?.femaleHealth?.lmp ? `LMP ${toDate(rx.femaleHealth.lmp)}` : "",
        rx?.femaleHealth?.edd ? `EDD ${toDate(rx.femaleHealth.edd)}` : "",
        rx?.femaleHealth?.pog ? `POG ${rx.femaleHealth.pog}` : "",
        (rx?.femaleHealth?.lcb || rx?.femaleHealth?.mod)
          ? `LCB/MOD ${rx?.femaleHealth?.lcb || "-"} / ${rx?.femaleHealth?.mod || "-"}`
          : "",
      ].filter(Boolean).join(" | ") || "-"
    );
  }

  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Rx", left, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
    head: [["Medicine", "Dose", "Frequency", "Route", "Duration", "Qty", "Instructions"]],
    body: section.medicines.map((item) => [
      item?.medicineName || "-",
      item?.dosage || "-",
      item?.frequency || "-",
      item?.route || "-",
      item?.duration || "-",
      String(item?.quantity || "-"),
      item?.instructions || "-",
    ]),
    margin: { left, right: 210 - right },
  });
  y = (doc.lastAutoTable?.finalY || y) + 6;

  if (section.showTests && section.tests.length > 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Suggested Tests", left, y);
    y += 5;
    section.tests.forEach((test) => {
      ensureSpace(5);
      const line = `- ${test?.testName || "-"}${test?.instructions ? ` (${test.instructions})` : ""}`;
      const lines = doc.splitTextToSize(line, width);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(lines, left, y);
      y += Math.max(5, lines.length * 4.2);
    });
  }

  if (section.showAdvice) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Advice", left, y);
    y += 5;
    const advice = doc.splitTextToSize(String(rx?.notes || "-"), width);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(advice, left, y);
    y += Math.max(6, advice.length * 4.2);
  }

  if (section.showFooter) {
    ensureSpace(16);
    doc.setDrawColor(170, 170, 170);
    doc.line(left, y, right, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `For queries contact: ${hospital.phone || "-"}${hospital.email ? ` | ${hospital.email}` : ""}${hospital.website ? ` | ${hospital.website}` : ""}`,
      (left + right) / 2,
      y,
      { align: "center" }
    );
    y += 4.5;
    doc.text("This is a digitally generated prescription.", (left + right) / 2, y, { align: "center" });
  }

  doc.save(`prescription-${rx?._id || "record"}.pdf`);
};

export const printPrescription = (rx, options = {}) => {
  const hospital = normalizeHospital(options.hospitalSettings);
  const section = getSections(rx, options);
  const female = String(rx?.patient?.gender || "").toLowerCase() === "female";

  const medicineRows = section.medicines
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item?.medicineName || "-")}</td>
        <td>${escapeHtml(item?.dosage || "-")}</td>
        <td>${escapeHtml(item?.frequency || "-")}</td>
        <td>${escapeHtml(item?.route || "-")}</td>
        <td>${escapeHtml(item?.duration || "-")}</td>
        <td>${escapeHtml(item?.quantity || "-")}</td>
        <td>${escapeHtml(item?.instructions || "-")}</td>
      </tr>`
    )
    .join("");

  const tests = section.tests
    .map((test) => `<li>${escapeHtml(test?.testName || "-")}${test?.instructions ? ` - ${escapeHtml(test.instructions)}` : ""}</li>`)
    .join("");

  const vitalsLine =
    [
      rx?.vitals?.bloodPressure ? `BP ${rx.vitals.bloodPressure}` : "",
      rx?.vitals?.pulseRate ? `PR ${rx.vitals.pulseRate}` : "",
      rx?.vitals?.spo2 ? `SpO2 ${rx.vitals.spo2}` : "",
      rx?.vitals?.temperature ? `Temp ${rx.vitals.temperature}` : "",
      rx?.vitals?.heightCm ? `Height ${rx.vitals.heightCm} cm` : "",
      rx?.vitals?.weightKg ? `Weight ${rx.vitals.weightKg} kg` : "",
      rx?.vitals?.bmi ? `BMI ${rx.vitals.bmi}` : "",
    ]
      .filter(Boolean)
      .join(" | ") || "-";

  const html = `
    <html>
      <head>
        <title>Prescription</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 12px;
            line-height: 1.35;
          }
          .sheet {
            width: 190mm;
            margin: 0 auto;
            padding: 0;
          }
          .hospital {
            text-align: center;
            border-bottom: 1px solid #1f2937;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .hidden { display: none; }
          .hospital h1 {
            margin: 0;
            font-size: 22px;
            letter-spacing: .3px;
          }
          .hospital .meta { margin-top: 3px; font-size: 11px; color: #374151; }
          .title {
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            margin: 2px 0 10px;
            letter-spacing: .8px;
          }
          .rx-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .grid td, .grid th {
            border: 1px solid #d1d5db;
            padding: 6px 7px;
            vertical-align: top;
          }
          .grid th {
            background: #f3f4f6;
            text-align: left;
            font-size: 11px;
          }
          .label { font-weight: 700; width: 24%; background: #fafafa; }
          .section-title {
            font-weight: 700;
            margin: 8px 0 4px;
            font-size: 12px;
          }
          .rx-title {
            font-size: 20px;
            font-weight: 700;
            margin: 8px 0 4px;
            letter-spacing: .4px;
          }
          .block {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            margin-bottom: 8px;
            min-height: 24px;
            white-space: pre-wrap;
          }
          ul { margin: 0; padding-left: 18px; }
          .footer {
            border-top: 1px solid #9ca3af;
            margin-top: 12px;
            padding-top: 6px;
            text-align: center;
            font-size: 10.5px;
            color: #374151;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="hospital ${section.showHeader ? "" : "hidden"}">
            <h1>${escapeHtml(hospital.hospitalName)}</h1>
            <div class="meta">${escapeHtml(hospital.address)}</div>
            <div class="meta">Phone: ${escapeHtml(hospital.phone || "-")} | Email: ${escapeHtml(hospital.email || "-")}${hospital.website ? ` | Web: ${escapeHtml(hospital.website)}` : ""}</div>
          </div>
          <div class="title">PRESCRIPTION</div>
          <div class="rx-meta">
            <div>Rx ID: ${escapeHtml(rx?._id || "-")}</div>
            <div>Date: ${escapeHtml(toDateTime(rx?.createdAt))}</div>
          </div>
          <table class="grid">
            <tr><td class="label">Patient</td><td>${escapeHtml(patientLabel(rx))}</td><td class="label">Patient ID</td><td>${escapeHtml(patientIdLabel(rx))}</td></tr>
            ${
              section.showDoctorDetails
                ? `<tr><td class="label">Doctor</td><td>${escapeHtml(doctorLabel(rx))}</td><td class="label">Encounter</td><td>${escapeHtml(String(rx?.encounterType || "opd").toUpperCase())}</td></tr>`
                : `<tr><td class="label">Encounter</td><td>${escapeHtml(String(rx?.encounterType || "opd").toUpperCase())}</td><td class="label"></td><td></td></tr>`
            }
            <tr><td class="label">Follow-up</td><td>${escapeHtml(toDate(rx?.followUpDate))}</td><td class="label">Gender</td><td>${escapeHtml(rx?.patient?.gender || "-")}</td></tr>
          </table>

          <div class="section-title">Complaints</div>
          <div class="block">${escapeHtml(csv(rx?.complaints || []))}</div>
          <div class="section-title">Medical History</div>
          <div class="block">${escapeHtml(csv(rx?.medicalHistory || []))}</div>
          <div class="section-title">Diagnosis</div>
          <div class="block">${escapeHtml(rx?.diagnosis || "-")}</div>

          ${
            section.showVitals
              ? `<div class="section-title">Vitals</div><div class="block">${escapeHtml(vitalsLine)}</div>`
              : ""
          }

          ${
            section.showFemaleSection && female && rx?.femaleHealth
              ? `<div class="section-title">Female Clinical Details</div>
                 <div class="block">${escapeHtml([
                   rx?.femaleHealth?.gravida ? `Gravida ${rx.femaleHealth.gravida}` : "",
                   (rx?.femaleHealth?.parityA || rx?.femaleHealth?.parityB) ? `Parity ${rx?.femaleHealth?.parityA || "-"}+${rx?.femaleHealth?.parityB || "-"}` : "",
                   rx?.femaleHealth?.lmp ? `LMP ${toDate(rx.femaleHealth.lmp)}` : "",
                   rx?.femaleHealth?.edd ? `EDD ${toDate(rx.femaleHealth.edd)}` : "",
                   rx?.femaleHealth?.pog ? `POG ${rx.femaleHealth.pog}` : "",
                   (rx?.femaleHealth?.lcb || rx?.femaleHealth?.mod) ? `LCB/MOD ${rx?.femaleHealth?.lcb || "-"} / ${rx?.femaleHealth?.mod || "-"}` : "",
                 ].filter(Boolean).join(" | ") || "-")}</div>`
              : ""
          }

          <div class="rx-title">Rx</div>
          <table class="grid">
            <thead>
              <tr>
                <th>Medicine</th><th>Dose</th><th>Frequency</th><th>Route</th><th>Duration</th><th>Qty</th><th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${medicineRows || '<tr><td colspan="7">No medicine added</td></tr>'}
            </tbody>
          </table>

          ${
            section.showTests && section.tests.length > 0
              ? `<div class="section-title">Suggested Tests</div><div class="block"><ul>${tests}</ul></div>`
              : ""
          }

          ${
            section.showAdvice
              ? `<div class="section-title">Advice</div><div class="block">${escapeHtml(rx?.notes || "-")}</div>`
              : ""
          }

          <div class="footer ${section.showFooter ? "" : "hidden"}">
            <div>For queries contact: ${escapeHtml(hospital.phone || "-")}${hospital.email ? ` | ${escapeHtml(hospital.email)}` : ""}${hospital.website ? ` | ${escapeHtml(hospital.website)}` : ""}</div>
            <div>This is a digitally generated prescription.</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};
