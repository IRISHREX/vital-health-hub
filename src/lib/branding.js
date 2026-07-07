// Centralised branded header/footer for every printable in the app.
// Consumes HospitalSettings (with optional `branding` block) and resolves per-module overrides.

import { brandedCodesHtml, drawCodesOnPdf } from "./document-codes";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/**
 * Resolve effective branding for a given print module.
 * @param {object} hospital - HospitalSettings document (raw, e.g. response.data)
 * @param {string} moduleKey - one of: 'invoice'|'lab'|'radiology'|'pharmacy'|'prescription'|'ot'|'appointment'|'discharge'
 */
export const resolveBranding = (hospital = {}, moduleKey = "invoice") => {
  const b = (hospital && hospital.branding) || {};
  const mod = (b.modules && b.modules[moduleKey]) || {};
  const pick = (key, fallback = "") => (mod[key] ?? b[key] ?? fallback);
  const pickBool = (key, fallback) => {
    if (mod[key] !== undefined && mod[key] !== null) return Boolean(mod[key]);
    if (b[key] !== undefined && b[key] !== null) return Boolean(b[key]);
    return fallback;
  };

  return {
    hospitalName: hospital.hospitalName || "Hospital",
    registrationNumber: hospital.registrationNumber || "",
    address: hospital.address || "",
    phone: hospital.phone || "",
    email: hospital.email || "",
    website: hospital.website || "",
    gstNumber: hospital.gstNumber || "",
    logo: pick("logo", hospital.logo || ""),
    signature: pick("signature", ""),
    stamp: pick("stamp", ""),
    signatoryName: pick("signatoryName", ""),
    signatoryDesignation: pick("signatoryDesignation", ""),
    headerText: pick("headerText", ""),
    footerText: pick("footerText", ""),
    headerImage: pick("headerImage", ""),
    useHeaderImage: pickBool("useHeaderImage", false),
    showLogo: b.showLogo !== false,
    showSignature: b.showSignature !== false,
    showStamp: b.showStamp !== false,
  };
};

/**
 * HTML header block for print/window.open documents.
 */
export const brandedHeaderHtml = (branding, codes = null) => {
  const b = branding || {};
  const codesBlock = brandedCodesHtml(codes);

  // Full-width header image (letterhead banner) takes precedence when enabled
  if (b.useHeaderImage && b.headerImage) {
    return `
      <div class="brand-header" style="margin-bottom:14px;">
        <img src="${escapeHtml(b.headerImage)}" alt="header" style="display:block;width:100%;max-height:160px;object-fit:contain;" />
        ${codesBlock ? `<div style="display:flex;justify-content:flex-end;margin-top:4px;">${codesBlock}</div>` : ""}
      </div>
    `;
  }

  const logoHtml = b.showLogo && b.logo
    ? `<img src="${escapeHtml(b.logo)}" alt="logo" style="max-height:60px;max-width:160px;object-fit:contain;" />`
    : "";
  const meta = [b.address, b.phone && `Phone: ${b.phone}`, b.email && `Email: ${b.email}`, b.website]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &nbsp;|&nbsp; ");
  const reg = [b.registrationNumber && `Reg No: ${b.registrationNumber}`, b.gstNumber && `GST: ${b.gstNumber}`]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &nbsp;|&nbsp; ");

  return `
    <div class="brand-header" style="display:flex;align-items:center;gap:16px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #1565c0;">
      ${logoHtml ? `<div style="flex:0 0 auto;">${logoHtml}</div>` : ""}
      <div style="flex:1 1 auto;text-align:${logoHtml ? "left" : "center"};">
        <div style="font-size:20px;font-weight:700;color:#1565c0;letter-spacing:.3px;">${escapeHtml(b.hospitalName)}</div>
        ${b.headerText ? `<div style="font-size:11px;color:#374151;margin-top:2px;">${escapeHtml(b.headerText)}</div>` : ""}
        ${meta ? `<div style="font-size:11px;color:#555;margin-top:3px;">${meta}</div>` : ""}
        ${reg ? `<div style="font-size:10.5px;color:#6b7280;margin-top:2px;">${reg}</div>` : ""}
      </div>
      ${codesBlock}
    </div>
  `;
};

/**
 * HTML signature/stamp + footer block.
 */
export const brandedFooterHtml = (branding) => {
  const b = branding || {};
  const signImg = b.showSignature && b.signature
    ? `<img src="${escapeHtml(b.signature)}" alt="signature" style="max-height:50px;max-width:160px;object-fit:contain;display:block;margin-bottom:4px;" />`
    : "";
  const stampImg = b.showStamp && b.stamp
    ? `<img src="${escapeHtml(b.stamp)}" alt="stamp" style="max-height:80px;max-width:120px;object-fit:contain;opacity:.85;" />`
    : "";

  const sigBlock = (signImg || b.signatoryName)
    ? `<div style="text-align:right;font-size:11px;color:#374151;">
         ${signImg}
         <div style="border-top:1px solid #9ca3af;padding-top:3px;min-width:160px;display:inline-block;">
           <div style="font-weight:600;">${escapeHtml(b.signatoryName || "Authorised Signatory")}</div>
           ${b.signatoryDesignation ? `<div style="color:#6b7280;">${escapeHtml(b.signatoryDesignation)}</div>` : ""}
         </div>
       </div>`
    : "";

  const stampBlock = stampImg
    ? `<div style="text-align:left;">${stampImg}</div>`
    : `<div></div>`;

  return `
    <div class="brand-footer" style="margin-top:30px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;">
        ${stampBlock}
        ${sigBlock || "<div></div>"}
      </div>
      <div style="border-top:1px solid #9ca3af;margin-top:12px;padding-top:6px;text-align:center;font-size:10.5px;color:#374151;">
        ${b.footerText ? `<div>${escapeHtml(b.footerText)}</div>` : ""}
        <div>This is a computer-generated document.</div>
      </div>
    </div>
  `;
};

/**
 * Wrap any body HTML with branded header + footer in a printable A4 page.
 * `codes` (optional) is a bundle from buildDocumentCodes() — rendered top-right of the header.
 */
export const wrapBrandedPrintHtml = (title, branding, bodyHtml, extraStyles = "", codes = null) => `
  <html>
    <head>
      <title>${escapeHtml(title || "Document")}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.4; }
        .sheet { width: 100%; }
        table { border-collapse: collapse; width: 100%; }
        ${extraStyles}
      </style>
    </head>
    <body>
      <div class="sheet">
        ${brandedHeaderHtml(branding, codes)}
        ${bodyHtml}
        ${brandedFooterHtml(branding)}
      </div>
    </body>
  </html>
`;

/**
 * Open a new window and print branded HTML.
 * `codes` (optional) is a bundle from buildDocumentCodes().
 */
export const printBrandedHtml = (title, branding, bodyHtml, extraStyles = "", codes = null) => {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(wrapBrandedPrintHtml(title, branding, bodyHtml, extraStyles, codes));
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 200);
};

// ---------- jsPDF helpers ----------

/**
 * Draw a branded header on the current jsPDF page. Returns the new Y cursor.
 */
export const addJsPdfHeader = (doc, branding, opts = {}) => {
  const b = branding || {};
  const left = opts.left ?? 12;
  const right = opts.right ?? (doc.internal.pageSize.getWidth() - 12);
  const codes = opts.codes || null;
  // Reserve space on the right for QR/barcode so title text doesn't collide
  const rightTextBound = codes && (codes.qrDataUrl || codes.barcodeDataUrl) ? right - 26 : right;
  let y = opts.top ?? 12;

  // Full-width header image (letterhead banner) takes precedence when enabled
  if (b.useHeaderImage && b.headerImage) {
    try {
      const width = right - left;
      const height = opts.headerImageHeight ?? 32;
      doc.addImage(b.headerImage, left, y, width, height);
      return y + height + 4;
    } catch {
      // fall through to default text header
    }
  }


  let textX = left;
  let textAlign = "center";
  let centerX = (left + right) / 2;

  if (b.showLogo && b.logo) {
    try {
      doc.addImage(b.logo, "PNG", left, y, 22, 18);
      textX = left + 26;
      textAlign = "left";
    } catch {
      // logo format may be unsupported; ignore
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(String(b.hospitalName || "Hospital"), textAlign === "left" ? textX : centerX, y + 5, { align: textAlign });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let line = y + 10;
  if (b.headerText) {
    doc.text(String(b.headerText), textAlign === "left" ? textX : centerX, line, { align: textAlign });
    line += 4;
  }
  const meta = [b.address, b.phone && `Ph: ${b.phone}`, b.email, b.website].filter(Boolean).join(" | ");
  if (meta) {
    doc.text(meta, textAlign === "left" ? textX : centerX, line, { align: textAlign });
    line += 4;
  }
  const reg = [b.registrationNumber && `Reg: ${b.registrationNumber}`, b.gstNumber && `GST: ${b.gstNumber}`].filter(Boolean).join("  |  ");
  if (reg) {
    doc.text(reg, textAlign === "left" ? textX : centerX, line, { align: textAlign });
    line += 4;
  }

  const headerEnd = Math.max(line, y + 22);
  // Draw QR + barcode on the top-right of the header area
  if (codes) {
    drawCodesOnPdf(doc, codes, { right, top: y - 1 });
  }
  doc.setDrawColor(21, 101, 192);
  doc.setLineWidth(0.5);
  doc.line(left, headerEnd, right, headerEnd);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  return headerEnd + 5;
};

/**
 * Draw branded signature/stamp + footer at the bottom of the current jsPDF page.
 */
export const addJsPdfFooter = (doc, branding, opts = {}) => {
  const b = branding || {};
  const ph = doc.internal.pageSize.getHeight();
  const pw = doc.internal.pageSize.getWidth();
  const left = opts.left ?? 12;
  const right = opts.right ?? (pw - 12);
  const baseY = opts.bottom ?? (ph - 10);

  // Stamp on the left
  if (b.showStamp && b.stamp) {
    try { doc.addImage(b.stamp, "PNG", left, baseY - 38, 28, 28); } catch {}
  }
  // Signature on the right
  if (b.showSignature && b.signature) {
    try { doc.addImage(b.signature, "PNG", right - 40, baseY - 30, 36, 14); } catch {}
  }
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.2);
  doc.line(right - 50, baseY - 14, right, baseY - 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(b.signatoryName || "Authorised Signatory", right, baseY - 9, { align: "right" });
  if (b.signatoryDesignation) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(String(b.signatoryDesignation), right, baseY - 5, { align: "right" });
  }

  // Footer line
  doc.setDrawColor(150, 150, 150);
  doc.line(left, baseY - 1, right, baseY - 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  if (b.footerText) {
    doc.text(String(b.footerText), (left + right) / 2, baseY + 2, { align: "center" });
  } else {
    doc.text("This is a computer-generated document.", (left + right) / 2, baseY + 2, { align: "center" });
  }
};

export const _esc = escapeHtml;
