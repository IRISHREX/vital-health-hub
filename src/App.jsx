import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuthProvider } from "./lib/AuthContext";
import AuthorizedRoute from "./components/AuthorizedRoute";
import Dashboard from "./pages/Dashboard";
import Beds from "./pages/Beds";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import Appointments from "./pages/Appointments";
import Facilities from "./pages/Facilities";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<DashboardLayout />}>
              <Route element={<AuthorizedRoute module="dashboard" />}>
                <Route path="/" element={<Dashboard />} />
              </Route>
              <Route element={<AuthorizedRoute module="beds" />}>
                <Route path="/beds" element={<Beds />} />
              </Route>
              <Route element={<AuthorizedRoute module="patients" />}>
                <Route path="/patients" element={<Patients />} />
              </Route>
              <Route element={<AuthorizedRoute module="doctors" />}>
                <Route path="/doctors" element={<Doctors />} />
              </Route>
              <Route element={<AuthorizedRoute module="appointments" />}>
                <Route path="/appointments" element={<Appointments />} />
              </Route>
              <Route element={<AuthorizedRoute module="facilities" />}>
                <Route path="/facilities" element={<Facilities />} />
              </Route>
              <Route element={<AuthorizedRoute module="billing" />}>
                <Route path="/billing" element={<Billing />} />
              </Route>
              <Route element={<AuthorizedRoute module="reports" />}>
                <Route path="/reports" element={<Reports />} />
              </Route>
              <Route element={<AuthorizedRoute module="notifications" />}>
                <Route path="/notifications" element={<Notifications />} />
              </Route>
              <Route element={<AuthorizedRoute module="settings" />}>
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
