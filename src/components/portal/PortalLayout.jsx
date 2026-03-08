import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";
import { PortalProvider } from "@/lib/PortalContext";
import { useAuth } from "@/lib/AuthContext";
import { checkHealth } from "@/lib/health";

export default function PortalLayout({ portal }) {
  const { token, isLoading } = useAuth();

  useEffect(() => {
    checkHealth().catch(() => {});
  }, []);

  if (isLoading) return null;
  if (!token) return <Navigate to={portal.loginPath} replace />;

  return (
    <PortalProvider portal={portal}>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
          <PortalSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <PortalHeader />
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PortalProvider>
  );
}
