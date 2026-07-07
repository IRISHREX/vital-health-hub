import { printBrandedHtml, resolveBranding, _esc as esc } from "./branding";
import { buildDocumentCodes } from "./document-codes";

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};
const fmtTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const patientName = (p) => {
  if (!p) return "—";
  if (typeof p === "string") return p;
  return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "—";
};
const doctorName = (d) => {
  if (!d) return "—";
  if (typeof d === "string") return d;
  if (d.user) return `Dr. ${d.user.firstName || ""} ${d.user.lastName || ""}`.trim();
  return d.name ? `Dr. ${d.name}` : "—";
};

export const printAppointmentReceipt = (apt, hospital) => {
  if (!apt) return;
  const branding = resolveBranding(hospital || {}, "appointment");
  const tokenBig = apt.tokenNumber ? String(apt.tokenNumber).padStart(3, "0") : "—";

  const body = `
    <div style="text-align:center;margin:6px 0 14px;">
      <div style="font-size:14px;font-weight:700;letter-spacing:1.5px;color:#1565c0;">APPOINTMENT RECEIPT</div>
    </div>

    <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:12px;">
      <div><strong>Appointment ID:</strong> ${esc(apt.appointmentId || apt._id || "-")}</div>
      <div><strong>Issued:</strong> ${esc(new Date().toLocaleString())}</div>
    </div>

    <div style="display:flex;gap:16px;align-items:stretch;margin-bottom:14px;">
      <div style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:10px;">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Patient</div>
        <div style="font-size:14px;font-weight:700;margin-top:2px;">${esc(patientName(apt.patient))}</div>
        <div style="font-size:11px;color:#374151;">ID: ${esc(apt.patient?.patientId || "-")}</div>
        <div style="font-size:11px;color:#374151;">Phone: ${esc(apt.patient?.contactNumber || apt.patient?.phone || "-")}</div>
      </div>
      <div style="flex:0 0 130px;border:2px dashed #1565c0;border-radius:6px;padding:8px;text-align:center;">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;">Token</div>
        <div style="font-size:36px;font-weight:800;color:#1565c0;line-height:1;margin-top:4px;">${esc(tokenBig)}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:12px;">
      <tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;width:30%;">Doctor</td>
        <td style="border:1px solid #d1d5db;padding:7px;">${esc(doctorName(apt.doctor))}${apt.doctor?.specialization ? ` <span style="color:#6b7280;">(${esc(apt.doctor.specialization)})</span>` : ""}</td>
      </tr>
      <tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Date &amp; Time</td>
        <td style="border:1px solid #d1d5db;padding:7px;">${esc(fmtDate(apt.appointmentDate))} at ${esc(fmtTime(apt.appointmentDate))}</td>
      </tr>
      <tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Type</td>
        <td style="border:1px solid #d1d5db;padding:7px;">${esc(String(apt.type || "OPD").toUpperCase())}</td>
      </tr>
      <tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Reason</td>
        <td style="border:1px solid #d1d5db;padding:7px;">${esc(apt.reason || "-")}</td>
      </tr>
      <tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Priority</td>
        <td style="border:1px solid #d1d5db;padding:7px;text-transform:capitalize;">${esc(apt.priority || "normal")}</td>
      </tr>
      ${apt.referredBy?.name || apt.referredBy?.doctor ? `<tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Referred By</td>
        <td style="border:1px solid #d1d5db;padding:7px;">${esc(apt.referredBy?.name || (apt.referredBy?.doctor?.name) || "—")}</td>
      </tr>` : ""}
      ${apt.fee != null ? `<tr>
        <td style="border:1px solid #d1d5db;padding:7px;background:#f3f4f6;font-weight:600;">Consultation Fee</td>
        <td style="border:1px solid #d1d5db;padding:7px;">₹${esc(apt.fee)} <span style="color:#6b7280;">(${esc(apt.paymentMode && apt.paymentMode !== 'pending' ? apt.paymentMode : (apt.paymentStatus || 'pending'))})</span></td>
      </tr>` : ""}
    </table>

    <div style="font-size:10.5px;color:#374151;background:#fffbeb;border:1px solid #fde68a;padding:8px;border-radius:4px;">
      Please arrive 10 minutes before your scheduled time and present this receipt at the reception.
    </div>
  `;

  printBrandedHtml(`Appointment ${apt.appointmentId || ""}`, branding, body);
};
