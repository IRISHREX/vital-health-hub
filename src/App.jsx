import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
                  <Route path="/" element={<Dashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="beds" />}>
                  <Route path="/beds" element={<Beds />} />
                </Route>
                <Route element={<AuthorizedRoute module="admissions" />}>
                  <Route path="/admissions" element={<Admissions />} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/:id" element={<PatientDetails />} />
                </Route>
                <Route element={<AuthorizedRoute module="doctors" />}>
                  <Route path="/doctors" element={<Doctors />} />
                </Route>
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurses" element={<Nurses />} />
                </Route>
                <Route element={<AuthorizedRoute module="appointments" />}>
                  <Route path="/appointments" element={<Appointments />} />
                </Route>
                <Route element={<AuthorizedRoute module="tasks" />}>
                  <Route path="/tasks" element={<Tasks />} />
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
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurse" element={<NurseDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/nurse/patients" element={<NursePatients />} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/opd" element={<OpdDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab" element={<LabDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology" element={<RadiologyDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/pharmacy" element={<PharmacyDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="ot" />}>
                  <Route path="/ot" element={<OTDashboard />} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/prescriptions/:id/preview" element={<PrescriptionPreview />} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab/:id/preview" element={<LabReportPreview />} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology/:id/preview" element={<RadiologyReportPreview />} />
                </Route>
                <Route element={<AuthorizedRoute module="settings" />}>
                  <Route path="/settings" element={<Settings />} />
                </Route>
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
