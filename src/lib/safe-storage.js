// Shared safe accessors for localStorage / JSON parsing.
// Centralises the try/catch patterns scattered across the codebase so
// corrupt storage values can never crash the React tree.

export const safeJsonParse = (raw, fallback = null) => {
  if (raw == null || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
};

export const safeLocalGet = (key, fallback = null) => {
  try {
    return safeJsonParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
};

export const safeLocalSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const safeLocalRemove = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
