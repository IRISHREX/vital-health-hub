import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { checkHealth } from "@/lib/health";
import { useLayoutMode } from "@/lib/LayoutModeContext";
import { WidgetHome } from "@/components/dashboard/WidgetHome";
import { AnimatePresence, motion } from "framer-motion";

export function DashboardLayout() {
  const { mode, widgetOverlayOpen, setWidgetOverlayOpen } = useLayoutMode();
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Close overlay on route change
  useEffect(() => {
    setWidgetOverlayOpen(false);
  }, [location.pathname, setWidgetOverlayOpen]);

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
        <div className="flex min-w-0 flex-1 flex-col relative">
          <Header />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
            {showWidgetHome ? <WidgetHome /> : <Outlet />}
          </main>

          {/* Widget overlay – opens on any page when triggered */}
          <AnimatePresence>
            {widgetOverlayOpen && !showWidgetHome && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 top-16 z-40 overflow-y-auto bg-background/95 backdrop-blur-sm p-3 sm:p-4 lg:p-6"
              >
                <WidgetHome isOverlay />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SidebarProvider>
  );
}
