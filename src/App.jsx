import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuthProvider } from "./lib/AuthContext";
import { ThemeProvider } from "./lib/ThemeContext";
import { LayoutModeProvider } from "./lib/LayoutModeContext";
import AuthorizedRoute from "./components/AuthorizedRoute";
import Dashboard from "./pages/Dashboard";
import Beds from "./pages/Beds";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Admissions from "./pages/Admissions";
import Doctors from "./pages/Doctors";
import Nurses from "./pages/Nurses";
import Appointments from "./pages/Appointments";
import Facilities from "./pages/Facilities";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NurseDashboard from "./pages/NurseDashboard";
import Tasks from "./pages/Tasks";
import NursePatients from "./pages/NursePatients";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import OpdDashboard from './pages/OpdDashboard';
import LabDashboard from './pages/LabDashboard';
import RadiologyDashboard from './pages/RadiologyDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import OTDashboard from './pages/OTDashboard';
import PrescriptionPreview from "./pages/PrescriptionPreview";
import LabReportPreview from "./pages/LabReportPreview";
import RadiologyReportPreview from "./pages/RadiologyReportPreview";

// Standalone Portals
import PortalLogin from "./components/portal/PortalLogin";
import PortalLayout from "./components/portal/PortalLayout";
import LabPortalDashboard from "./pages/portal/LabPortalDashboard";
import PharmacyPortalDashboard from "./pages/portal/PharmacyPortalDashboard";
import RadiologyPortalDashboard from "./pages/portal/RadiologyPortalDashboard";
import { portalDefinitions } from "./lib/portal-config";

// Grandmaster Module
import GrandmasterLogin from "./pages/grandmaster/GrandmasterLogin";
import GrandmasterLayout from "./pages/grandmaster/GrandmasterLayout";
import GrandmasterDashboard from "./pages/grandmaster/GrandmasterDashboard";
import Organizations from "./pages/grandmaster/Organizations";
import Subscriptions from "./pages/grandmaster/Subscriptions";
import Monitoring from "./pages/grandmaster/Monitoring";
import Admins from "./pages/grandmaster/Admins";
import Notices from "./pages/grandmaster/Notices";
import PlatformSettings from "./pages/grandmaster/PlatformSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <LayoutModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Hospital Login */}
              <Route path="/login" element={<Login />} />

              {/* Grandmaster Portal */}
              <Route path="/grandmaster/login" element={<GrandmasterLogin />} />
              <Route path="/grandmaster" element={<GrandmasterLayout />}>
                <Route index element={<GrandmasterDashboard />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="subscriptions" element={<Subscriptions />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="admins" element={<Admins />} />
                <Route path="notices" element={<Notices />} />
                <Route path="settings" element={<PlatformSettings />} />
              </Route>

              {/* Hospital Dashboard */}
              <Route element={<DashboardLayout />}>
                <Route element={<AuthorizedRoute module="dashboard" />}>
                  <Route path="/" element={<ErrorBoundary fallbackMessage="Dashboard failed to load."><Dashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="beds" />}>
                  <Route path="/beds" element={<ErrorBoundary><Beds /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="admissions" />}>
                  <Route path="/admissions" element={<ErrorBoundary><Admissions /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/patients" element={<ErrorBoundary><Patients /></ErrorBoundary>} />
                  <Route path="/patients/:id" element={<ErrorBoundary><PatientDetails /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="doctors" />}>
                  <Route path="/doctors" element={<ErrorBoundary><Doctors /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurses" element={<ErrorBoundary><Nurses /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="appointments" />}>
                  <Route path="/appointments" element={<ErrorBoundary><Appointments /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="tasks" />}>
                  <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="facilities" />}>
                  <Route path="/facilities" element={<ErrorBoundary><Facilities /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="billing" />}>
                  <Route path="/billing" element={<ErrorBoundary><Billing /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="reports" />}>
                  <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="notifications" />}>
                  <Route path="/notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurse" element={<ErrorBoundary><NurseDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/nurse/patients" element={<ErrorBoundary><NursePatients /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/opd" element={<ErrorBoundary><OpdDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab" element={<ErrorBoundary><LabDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology" element={<ErrorBoundary><RadiologyDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/pharmacy" element={<ErrorBoundary><PharmacyDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="ot" />}>
                  <Route path="/ot" element={<ErrorBoundary><OTDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/prescriptions/:id/preview" element={<ErrorBoundary><PrescriptionPreview /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab/:id/preview" element={<ErrorBoundary><LabReportPreview /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology/:id/preview" element={<ErrorBoundary><RadiologyReportPreview /></ErrorBoundary>} />
                </Route>
                <Route element={<AuthorizedRoute module="settings" />}>
                  <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                </Route>
              </Route>

              {/* ===== Standalone Portal: Lab ===== */}
              <Route path="/lab-portal/login" element={<PortalLogin portal={portalDefinitions.lab} />} />
              <Route path="/lab-portal" element={<PortalLayout portal={portalDefinitions.lab} />}>
                <Route index element={<LabPortalDashboard />} />
                <Route path="tests" element={<LabDashboard />} />
                <Route path="patients" element={<Patients />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* ===== Standalone Portal: Pharmacy ===== */}
              <Route path="/pharmacy-portal/login" element={<PortalLogin portal={portalDefinitions.pharmacy} />} />
              <Route path="/pharmacy-portal" element={<PortalLayout portal={portalDefinitions.pharmacy} />}>
                <Route index element={<PharmacyPortalDashboard />} />
                <Route path="medicines" element={<PharmacyDashboard />} />
                <Route path="prescriptions" element={<PharmacyDashboard />} />
                <Route path="patients" element={<Patients />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* ===== Standalone Portal: Radiology ===== */}
              <Route path="/radiology-portal/login" element={<PortalLogin portal={portalDefinitions.radiology} />} />
              <Route path="/radiology-portal" element={<PortalLayout portal={portalDefinitions.radiology} />}>
                <Route index element={<RadiologyPortalDashboard />} />
                <Route path="orders" element={<RadiologyDashboard />} />
                <Route path="patients" element={<Patients />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LayoutModeProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
