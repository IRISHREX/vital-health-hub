import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { checkHealth } from "@/lib/health";

export function DashboardLayout() {
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
