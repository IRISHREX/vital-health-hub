import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { checkHealth } from "@/lib/health";
import { useLayoutMode } from "@/lib/LayoutModeContext";
import { WidgetHome } from "@/components/dashboard/WidgetHome";

export function DashboardLayout() {
  const { mode } = useLayoutMode();
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const performHealthCheck = async () => {
      try {
        const healthStatus = await checkHealth();
        console.log("API Health Status:", healthStatus);
      } catch (error) {
        console.error("API is not available or there was an error during health check:", error);
      }
    };

    performHealthCheck();
  }, []);

  const showWidgetHome = mode === "widget" && isHome;

  return (
    <SidebarProvider defaultOpen={mode === "sidebar"}>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        {mode === "sidebar" && <AppSidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
            {showWidgetHome ? <WidgetHome /> : <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
