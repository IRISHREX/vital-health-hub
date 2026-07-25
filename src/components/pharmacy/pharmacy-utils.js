// Pure helpers shared across pharmacy dialogs (Dispense / Prescription / Walk-in).
// All functions here MUST stay pure — no React, no I/O, no side effects.

export const parseCsvList = (value) =>
  String(value || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

export const uniqueTruthy = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

export const getDoctorDisplayName = (doctor) => {
  if (!doctor) return "Unknown";
  if (doctor.name) return doctor.name;
  const rootName = `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();
  if (rootName) return rootName;
  const userName = `${doctor.user?.firstName || ""} ${doctor.user?.lastName || ""}`.trim();
  return userName || "Unknown";
};

export const getPatientDisplayName = (patient, fallback = "Unknown") => {
  if (!patient) return fallback;
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || fallback;
};

export const getPatientLabelWithId = (patient) => {
  const fullName = getPatientDisplayName(patient, "");
  if (!fullName) return "Unknown";
  return patient?.patientId ? `${fullName} (${patient.patientId})` : fullName;
};

/**
 * Compute the maximum a pharmacist can dispense for a given prescription item.
 * Falls back to prescribed quantity when the medicine isn't linked to inventory.
 */
export const computeDispenseCap = (item, resolvedStock) => {
  const prescribed = Number(item?.quantity || 0);
  if (!item?.medicine) return prescribed;
  const stock = Math.max(0, Number(resolvedStock ?? 0));
  return Math.min(prescribed, stock);
};

export const readItemStock = (item) => {
  if (typeof item?.medicine?.stock === "number") return item.medicine.stock;
  return null;
};

/**
 * Compose a walk-in payment note that survives on the auto-generated invoice.
 */
export const composePaymentNote = (paymentMethod, paymentReference, notes) => {
  const method = String(paymentMethod || "").toUpperCase();
  const ref = paymentReference ? ` (Ref: ${paymentReference})` : "";
  const paymentNote = `Payment: ${method}${ref}`;
  return [notes?.trim(), paymentNote].filter(Boolean).join(" | ");
};
