import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { generateQrDataUrl, generateBarcodeDataUrl } from "@/lib/document-codes";
import { buildCardPayload, employeeFullName, titleCase } from "@/lib/hr";

/**
 * Printable staff ID card (CR80 landscape, 3.375in x 2.125in) with the
 * attendance QR on the back. Scanning the QR at an attendance point marks
 * the employee present.
 */
export function EmployeeIdCard({ employee, hospital }) {
  const cardRef = useRef(null);
  const payload = useMemo(() => buildCardPayload(employee), [employee]);
  const qr = useMemo(() => generateQrDataUrl(payload, { width: 220 }), [payload]);
  const barcode = useMemo(
    () => generateBarcodeDataUrl(employee?.employeeCode || "", { height: 28, fontSize: 9 }),
    [employee?.employeeCode]
  );

  useEffect(() => {
    // no-op: data URLs are generated synchronously above
  }, []);

  const hospitalName = hospital?.hospitalName || "Hospital";
  const address = [hospital?.address, hospital?.city].filter(Boolean).join(", ");

  const print = () => {
    const html = cardRef.current?.innerHTML || "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<html><head><title>ID Card — ${employeeFullName(employee)}</title>
      <style>
        @page { size: auto; margin: 12mm; }
        body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:0}
        .id-wrap{display:flex;gap:16px;flex-wrap:wrap}
        .id-card{width:3.375in;height:2.125in;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;box-sizing:border-box}
        .id-band{background:#0f766e;color:#fff;padding:6px 10px}
        .id-band strong{font-size:12px;display:block;line-height:1.2}
        .id-band span{font-size:8px;opacity:.85}
        .id-body{display:flex;gap:8px;padding:8px 10px}
        .id-photo{width:58px;height:70px;border:1px solid #cbd5e1;border-radius:4px;object-fit:cover;background:#f1f5f9}
        .id-name{font-size:12px;font-weight:700;margin:0 0 2px}
        .id-meta{font-size:9px;color:#334155;margin:0;line-height:1.35}
        .id-back{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;text-align:center}
        .id-back img.qr{width:1.1in;height:1.1in}
        .id-back img.bc{width:1.6in;height:.3in}
        .id-note{font-size:8px;color:#475569;margin:0}
      </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <div ref={cardRef}>
        <div className="id-wrap flex flex-wrap gap-4">
          {/* Front */}
          <div className="id-card w-[3.375in] h-[2.125in] overflow-hidden rounded-lg border border-border">
            <div className="id-band bg-primary px-3 py-1.5 text-primary-foreground">
              <strong className="block text-xs leading-tight">{hospitalName}</strong>
              <span className="text-[8px] opacity-80">{address || "Staff Identity Card"}</span>
            </div>
            <div className="id-body flex gap-2 px-3 py-2">
              {employee.photoUrl ? (
                <img className="id-photo h-[70px] w-[58px] rounded border object-cover" src={employee.photoUrl} alt={`${employeeFullName(employee)} photo`} />
              ) : (
                <div className="id-photo flex h-[70px] w-[58px] items-center justify-center rounded border bg-muted text-[9px] text-muted-foreground">Photo</div>
              )}
              <div>
                <p className="id-name m-0 text-xs font-bold">{employeeFullName(employee)}</p>
                <p className="id-meta m-0 text-[9px] leading-snug text-muted-foreground">
                  {employee.designation || "Staff"}<br />
                  {employee.department ? `${employee.department} · ` : ""}{titleCase(employee.module)}<br />
                  ID: {employee.employeeCode}<br />
                  {employee.bloodGroup ? `Blood: ${employee.bloodGroup}` : ""}
                  {employee.phone ? ` · ${employee.phone}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Back with attendance QR */}
          <div className="id-card w-[3.375in] h-[2.125in] overflow-hidden rounded-lg border border-border">
            <div className="id-back flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
              {qr ? <img className="qr h-[1.1in] w-[1.1in]" src={qr} alt="Attendance QR code" /> : null}
              {barcode ? <img className="bc h-[0.3in] w-[1.6in]" src={barcode} alt={`Barcode ${employee.employeeCode}`} /> : null}
              <p className="id-note m-0 text-[8px] text-muted-foreground">
                Scan at any attendance point to mark attendance. If found, return to {hospitalName}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={print}>
        <Printer className="mr-2 h-4 w-4" />Print ID card
      </Button>
    </div>
  );
}

export default EmployeeIdCard;
