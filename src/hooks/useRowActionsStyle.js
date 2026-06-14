import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "row_actions_style_v1";
const EVENT = "row-actions-style-change";
const VALID = ["fan", "inline"];

export const ROW_ACTIONS_STYLES = VALID;

const read = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : "fan";
  } catch {
    return "fan";
  }
};

export function useRowActionsStyle() {
  const [style, setStyleState] = useState(read);

  useEffect(() => {
    const handler = () => setStyleState(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setStyle = useCallback((next) => {
    if (!VALID.includes(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setStyleState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [style, setStyle];
}
