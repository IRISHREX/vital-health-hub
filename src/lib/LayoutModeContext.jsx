import { createContext, useContext, useState, useEffect } from "react";

const LayoutModeContext = createContext({
  mode: "sidebar",
  setMode: () => {},
  widgetOverlayOpen: false,
  setWidgetOverlayOpen: () => {},
});

const STORAGE_KEY = "layout_mode_v1";

export function LayoutModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "sidebar";
    } catch {
      return "sidebar";
    }
  });
  const [widgetOverlayOpen, setWidgetOverlayOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <LayoutModeContext.Provider value={{ mode, setMode, widgetOverlayOpen, setWidgetOverlayOpen }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export const useLayoutMode = () => useContext(LayoutModeContext);
