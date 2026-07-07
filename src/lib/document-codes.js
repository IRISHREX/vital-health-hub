// Shared helpers to generate barcode + QR code data URLs for any
// printable document (appointment, prescription, lab, radiology, invoice, token).
// The QR code encodes an in-app verification URL so staff can scan to open
// the record; the barcode encodes the raw document ID for quick lookup.

import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/** Generate a CODE128 barcode as a PNG data URL. Sync — falls back to empty string on failure. */
export const generateBarcodeDataUrl = (text, opts = {}) => {
  if (typeof document === "undefined") return "";
  const raw = String(text || "").trim();
  if (!raw) return "";
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, raw, {
      format: "CODE128",
      width: opts.width ?? 1.6,
      height: opts.height ?? 40,
      displayValue: opts.displayValue !== false,
      fontSize: opts.fontSize ?? 11,
      margin: opts.margin ?? 4,
      background: opts.background ?? "#ffffff",
      lineColor: opts.lineColor ?? "#111827",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
};

/** Generate a QR code as a PNG data URL. Uses qrcode's sync toCanvas path. */
export const generateQrDataUrl = (text, opts = {}) => {
  if (typeof document === "undefined") return "";
  const raw = String(text || "").trim();
  if (!raw) return "";
  try {
    const canvas = document.createElement("canvas");
    let ok = false;
    QRCode.toCanvas(
      canvas,
      raw,
      {
        width: opts.width ?? 110,
        margin: opts.margin ?? 1,
        errorCorrectionLevel: opts.errorCorrectionLevel || "M",
        color: {
          dark: opts.dark || "#111827",
          light: opts.light || "#ffffff",
        },
      },
      (err) => {
        if (!err) ok = true;
      }
    );
    return ok ? canvas.toDataURL("image/png") : "";
  } catch {
    return "";
  }
};

/**
 * Build a full code bundle for a printable document.
 * @param {object} p
 * @param {string} p.docId - unique doc identifier (appointmentId, rx._id, testId, orderId, invoiceNumber, token)
 * @param {string} [p.patientId]
 * @param {string} [p.type] - one of: appointment | prescription | lab | radiology | invoice | token
 * @param {string} [p.origin] - override for window.location.origin (mostly for tests)
 */
export const buildDocumentCodes = ({ docId, patientId, type = "doc", origin } = {}) => {
  if (!docId) return null;
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const verifyUrl = `${base}/verify/${encodeURIComponent(type)}/${encodeURIComponent(docId)}`;
  return {
    docId: String(docId),
    patientId: patientId ? String(patientId) : "",
    type,
    verifyUrl,
    qrDataUrl: generateQrDataUrl(verifyUrl),
    barcodeDataUrl: generateBarcodeDataUrl(String(docId)),
  };
};

/** HTML block containing QR + barcode + doc ID, sized for the top-right of a printed header. */
export const brandedCodesHtml = (codes) => {
  if (!codes || (!codes.qrDataUrl && !codes.barcodeDataUrl)) return "";
  const q = codes.qrDataUrl
    ? `<img src="${escapeHtml(codes.qrDataUrl)}" alt="QR" style="display:block;width:70px;height:70px;object-fit:contain;" />`
    : "";
  const b = codes.barcodeDataUrl
    ? `<img src="${escapeHtml(codes.barcodeDataUrl)}" alt="barcode" style="display:block;height:32px;max-width:160px;object-fit:contain;margin-top:2px;" />`
    : `<div style="font-family:monospace;font-size:10px;color:#374151;margin-top:2px;">${escapeHtml(codes.docId)}</div>`;
  return `
    <div class="brand-codes" style="flex:0 0 auto;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
      ${q}
      ${b}
    </div>
  `;
};

/** Small in-app React-friendly renderable via <img>. Callers pass codes object. */
export const brandedCodesInlineStyle = {
  qr: { width: 72, height: 72, objectFit: "contain", display: "block" },
  barcode: { height: 32, maxWidth: 160, objectFit: "contain", display: "block", marginTop: 2 },
};

/** Draw QR + barcode on the top-right of the current jsPDF header area. Returns nothing. */
export const drawCodesOnPdf = (doc, codes, opts = {}) => {
  if (!doc || !codes) return;
  const right = opts.right ?? doc.internal.pageSize.getWidth() - 12;
  const top = opts.top ?? 10;
  const qrSize = opts.qrSize ?? 22;
  try {
    if (codes.qrDataUrl) {
      doc.addImage(codes.qrDataUrl, "PNG", right - qrSize, top, qrSize, qrSize);
    }
    if (codes.barcodeDataUrl) {
      const bw = opts.barcodeWidth ?? 40;
      const bh = opts.barcodeHeight ?? 10;
      doc.addImage(codes.barcodeDataUrl, "PNG", right - bw, top + qrSize + 1, bw, bh);
    }
  } catch {
    // ignore rendering issues
  }
};
