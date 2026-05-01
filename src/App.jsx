import { lazy, Suspense } from "react";
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
import { ValidationPreferencesProvider } from "./lib/ValidationPreferencesContext";
import AuthorizedRoute from "./components/AuthorizedRoute";
import { LoadingState } from "@/components/shared/PageState";
import { portalDefinitions } from "./lib/portal-config";
import ImpersonationBanner from "./components/grandmaster/ImpersonationBanner";

// ---- Lazy-loaded pages (code-split each route into its own chunk) ----
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Beds = lazy(() => import("./pages/Beds"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Doctors = lazy(() => import("./pages/Doctors"));
const Nurses = lazy(() => import("./pages/Nurses"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Facilities = lazy(() => import("./pages/Facilities"));
const Billing = lazy(() => import("./pages/Billing"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const NurseDashboard = lazy(() => import("./pages/NurseDashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const NursePatients = lazy(() => import("./pages/NursePatients"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const OpdDashboard = lazy(() => import("./pages/OpdDashboard"));
const LabDashboard = lazy(() => import("./pages/LabDashboard"));
const RadiologyDashboard = lazy(() => import("./pages/RadiologyDashboard"));
const PharmacyDashboard = lazy(() => import("./pages/PharmacyDashboard"));
const OTDashboard = lazy(() => import("./pages/OTDashboard"));
const ServiceCatalogPage = lazy(() => import("./pages/ServiceCatalogPage"));
const PrescriptionPreview = lazy(() => import("./pages/PrescriptionPreview"));
const LabReportPreview = lazy(() => import("./pages/LabReportPreview"));
const RadiologyReportPreview = lazy(() => import("./pages/RadiologyReportPreview"));
const Scheduler = lazy(() => import("./pages/Scheduler"));
const PublicLanding = lazy(() => import("./pages/public/PublicLanding"));

// Standalone Portals
const PortalLogin = lazy(() => import("./components/portal/PortalLogin"));
const PortalLayout = lazy(() => import("./components/portal/PortalLayout"));
const LabPortalDashboard = lazy(() => import("./pages/portal/LabPortalDashboard"));
const PharmacyPortalDashboard = lazy(() => import("./pages/portal/PharmacyPortalDashboard"));
const RadiologyPortalDashboard = lazy(() => import("./pages/portal/RadiologyPortalDashboard"));

// Grandmaster Module
const GrandmasterLogin = lazy(() => import("./pages/grandmaster/GrandmasterLogin"));
const GrandmasterLayout = lazy(() => import("./pages/grandmaster/GrandmasterLayout"));
const GrandmasterDashboard = lazy(() => import("./pages/grandmaster/GrandmasterDashboard"));
const Organizations = lazy(() => import("./pages/grandmaster/Organizations"));
const OrgControlPanel = lazy(() => import("./pages/grandmaster/OrgControlPanel"));
const Subscriptions = lazy(() => import("./pages/grandmaster/Subscriptions"));
const Monitoring = lazy(() => import("./pages/grandmaster/Monitoring"));
const Admins = lazy(() => import("./pages/grandmaster/Admins"));
const Notices = lazy(() => import("./pages/grandmaster/Notices"));
const PlatformSettings = lazy(() => import("./pages/grandmaster/PlatformSettings"));
const AuditLogs = lazy(() => import("./pages/grandmaster/AuditLogs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wrap a lazy page in Suspense + ErrorBoundary in one place.
const Page = ({ children, fallbackMessage }) => (
  <ErrorBoundary fallbackMessage={fallbackMessage}>
    <Suspense fallback={<LoadingState />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <ValidationPreferencesProvider>
        <LayoutModeProvider>
          <Toaster />
          <Sonner />
          <ImpersonationBanner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public marketing pages */}
              <Route path="/welcome" element={<Page><PublicLanding /></Page>} />
              <Route path="/about" element={<Page><PublicLanding /></Page>} />
              <Route path="/pricing" element={<Page><PublicLanding /></Page>} />
              <Route path="/contact" element={<Page><PublicLanding /></Page>} />

              {/* Hospital Login */}
              <Route path="/login" element={<Page><Login /></Page>} />

              {/* Grandmaster Portal */}
              <Route path="/grandmaster/login" element={<Page><GrandmasterLogin /></Page>} />
              <Route path="/grandmaster" element={<Page><GrandmasterLayout /></Page>}>
                <Route index element={<Page><GrandmasterDashboard /></Page>} />
                <Route path="organizations" element={<Page><Organizations /></Page>} />
                <Route path="organizations/:id" element={<Page><OrgControlPanel /></Page>} />
                <Route path="subscriptions" element={<Page><Subscriptions /></Page>} />
                <Route path="monitoring" element={<Page><Monitoring /></Page>} />
                <Route path="admins" element={<Page><Admins /></Page>} />
                <Route path="notices" element={<Page><Notices /></Page>} />
                <Route path="audit-logs" element={<Page><AuditLogs /></Page>} />
                <Route path="settings" element={<Page><PlatformSettings /></Page>} />
              </Route>

              {/* Hospital Dashboard */}
              <Route element={<DashboardLayout />}>
                <Route element={<AuthorizedRoute module="dashboard" />}>
                  <Route path="/" element={<Page fallbackMessage="Dashboard failed to load."><Dashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="beds" />}>
                  <Route path="/beds" element={<Page><Beds /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="admissions" />}>
                  <Route path="/admissions" element={<Page><Admissions /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/patients" element={<Page><Patients /></Page>} />
                  <Route path="/patients/:id" element={<Page><PatientDetails /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="doctors" />}>
                  <Route path="/doctors" element={<Page><Doctors /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurses" element={<Page><Nurses /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="appointments" />}>
                  <Route path="/appointments" element={<Page><Appointments /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="scheduler" />}>
                  <Route path="/scheduler" element={<Page><Scheduler /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="tasks" />}>
                  <Route path="/tasks" element={<Page><Tasks /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="facilities" />}>
                  <Route path="/facilities" element={<Page><Facilities /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="billing" />}>
                  <Route path="/billing" element={<Page><Billing /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="reports" />}>
                  <Route path="/reports" element={<Page><Reports /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="notifications" />}>
                  <Route path="/notifications" element={<Page><Notifications /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="nurses" />}>
                  <Route path="/nurse" element={<Page><NurseDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/nurse/patients" element={<Page><NursePatients /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="patients" />}>
                  <Route path="/opd" element={<Page><OpdDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab" element={<Page><LabDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology" element={<Page><RadiologyDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/pharmacy" element={<Page><PharmacyDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="ot" />}>
                  <Route path="/ot" element={<Page><OTDashboard /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="service_catalog" />}>
                  <Route path="/service-catalog" element={<Page><ServiceCatalogPage /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="pharmacy" />}>
                  <Route path="/prescriptions/:id/preview" element={<Page><PrescriptionPreview /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="lab" />}>
                  <Route path="/lab/:id/preview" element={<Page><LabReportPreview /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="radiology" />}>
                  <Route path="/radiology/:id/preview" element={<Page><RadiologyReportPreview /></Page>} />
                </Route>
                <Route element={<AuthorizedRoute module="settings" />}>
                  <Route path="/settings" element={<Page><Settings /></Page>} />
                </Route>
              </Route>

              {/* Standalone Portal: Lab */}
              <Route path="/lab-portal/login" element={<Page><PortalLogin portal={portalDefinitions.lab} /></Page>} />
              <Route path="/lab-portal" element={<Page><PortalLayout portal={portalDefinitions.lab} /></Page>}>
                <Route index element={<Page><LabPortalDashboard /></Page>} />
                <Route path="tests" element={<Page><LabDashboard /></Page>} />
                <Route path="patients" element={<Page><Patients /></Page>} />
                <Route path="billing" element={<Page><Billing /></Page>} />
                <Route path="reports" element={<Page><Reports /></Page>} />
                <Route path="notifications" element={<Page><Notifications /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
              </Route>

              {/* Standalone Portal: Pharmacy */}
              <Route path="/pharmacy-portal/login" element={<Page><PortalLogin portal={portalDefinitions.pharmacy} /></Page>} />
              <Route path="/pharmacy-portal" element={<Page><PortalLayout portal={portalDefinitions.pharmacy} /></Page>}>
                <Route index element={<Page><PharmacyPortalDashboard /></Page>} />
                <Route path="medicines" element={<Page><PharmacyDashboard /></Page>} />
                <Route path="prescriptions" element={<Page><PharmacyDashboard /></Page>} />
                <Route path="patients" element={<Page><Patients /></Page>} />
                <Route path="billing" element={<Page><Billing /></Page>} />
                <Route path="reports" element={<Page><Reports /></Page>} />
                <Route path="notifications" element={<Page><Notifications /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
              </Route>

              {/* Standalone Portal: Radiology */}
              <Route path="/radiology-portal/login" element={<Page><PortalLogin portal={portalDefinitions.radiology} /></Page>} />
              <Route path="/radiology-portal" element={<Page><PortalLayout portal={portalDefinitions.radiology} /></Page>}>
                <Route index element={<Page><RadiologyPortalDashboard /></Page>} />
                <Route path="orders" element={<Page><RadiologyDashboard /></Page>} />
                <Route path="patients" element={<Page><Patients /></Page>} />
                <Route path="billing" element={<Page><Billing /></Page>} />
                <Route path="reports" element={<Page><Reports /></Page>} />
                <Route path="notifications" element={<Page><Notifications /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
              </Route>

              <Route path="*" element={<Page><NotFound /></Page>} />
            </Routes>
          </BrowserRouter>
        </LayoutModeProvider>
        </ValidationPreferencesProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
