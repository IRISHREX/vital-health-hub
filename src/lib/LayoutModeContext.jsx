import { createContext, useContext, useState, useEffect } from "react";

const LayoutModeContext = createContext({ mode: "sidebar", setMode: () => {} });

const STORAGE_KEY = "layout_mode_v1";

export function LayoutModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "sidebar";
    } catch {
      return "sidebar";
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <LayoutModeContext.Provider value={{ mode, setMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export const useLayoutMode = () => useContext(LayoutModeContext);
