const STORAGE_KEY = "vhh.prescription.templates.v1";

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getPrescriptionTemplates = () => {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const savePrescriptionTemplate = (template) => {
  const current = getPrescriptionTemplates();
  const id = template?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [
    ...current.filter((item) => item.id !== id),
    { ...template, id, updatedAt: new Date().toISOString() },
  ];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return id;
};

export const removePrescriptionTemplate = (id) => {
  const current = getPrescriptionTemplates();
  const next = current.filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};
