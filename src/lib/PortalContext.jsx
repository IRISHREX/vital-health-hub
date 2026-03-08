import { createContext, useContext } from "react";

const PortalContext = createContext(null);

export const PortalProvider = ({ portal, children }) => (
  <PortalContext.Provider value={portal}>{children}</PortalContext.Provider>
);

export const usePortal = () => useContext(PortalContext);
