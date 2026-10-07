import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { RoleGuard } from './components/guards/RoleGuard';
import { AppShell } from './components/shell/AppShell';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { TermsPage } from './pages/public/TermsPage';
import { AuthPage } from './pages/public/AuthPage';
import { OfflinePage } from './pages/public/OfflinePage';
import { DocsPage } from './pages/public/DocsPage';
import { ApiExplorerPage } from './pages/public/ApiExplorerPage';
import { GlossaryPage } from './pages/public/GlossaryPage';
import { ChangelogPage } from './pages/public/ChangelogPage';
import { StatusPage } from './pages/public/StatusPage';
import { SecurityPolicyPage } from './pages/public/SecurityPolicyPage';
import { AccessibilityPage } from './pages/public/AccessibilityPage';
import { StorageInspectorPage } from './pages/public/StorageInspectorPage';
import { ContactPage } from './pages/public/ContactPage';
import { BrandPage } from './pages/public/BrandPage';
import { FontComparisonPage } from './pages/dev/FontComparisonPage';

import { ResultsPage } from './pages/app/ResultsPage';

// System pages
import { NotFoundPage } from './pages/system/NotFoundPage';
import { ForbiddenPage } from './pages/system/ForbiddenPage';
import { ServerErrorPage } from './pages/system/ServerErrorPage';
import { SessionExpiredPage } from './pages/system/SessionExpiredPage';

// App pages
import { DashboardPage } from './pages/app/DashboardPage';
import { AlertsPage } from './pages/app/AlertsPage';
import { AlertDetailPage } from './pages/app/AlertDetailPage';
import { IncidentsPage } from './pages/app/IncidentsPage';
import { IncidentDetailPage } from './pages/app/IncidentDetailPage';
import { ThreatMapPage } from './pages/app/ThreatMapPage';
import { QueryPage } from './pages/app/QueryPage';
import { IngestPage } from './pages/app/IngestPage';
import { FeedbackLoopPage } from './pages/app/FeedbackLoopPage';
import { KioskPage } from './pages/app/KioskPage';
import { ModelHealthPage } from './pages/app/ModelHealthPage';
import { ModelRegistryPage } from './pages/app/ModelRegistryPage';
import { DriftMonitorPage } from './pages/app/DriftMonitorPage';
import { AuditLogPage } from './pages/app/AuditLogPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { ConnectionPage } from './pages/app/ConnectionPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/api" element={<ApiExplorerPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/security" element={<SecurityPolicyPage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              <Route path="/storage" element={<StorageInspectorPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/brand" element={<BrandPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="/dev/fonts" element={<FontComparisonPage />} />

              {/* Full-screen Kiosk Booth Route */}
              <Route path="/kiosk" element={<KioskPage />} />

              {/* System Error & Session Pages */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/500" element={<ServerErrorPage />} />
              <Route path="/session-expired" element={<SessionExpiredPage />} />

              {/* App Shell Routes (Analyst & Admin) */}
              <Route
                path="/app"
                element={
                  <RoleGuard allowedRoles={['analyst', 'admin']}>
                    <AppShell />
                  </RoleGuard>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="alerts/:id" element={<AlertDetailPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailPage />} />
                <Route path="map" element={<ThreatMapPage />} />
                <Route path="query" element={<QueryPage />} />
                <Route path="ingest" element={<IngestPage />} />
                <Route path="results" element={<ResultsPage />} />
                <Route path="feedback" element={<FeedbackLoopPage />} />
                <Route path="kiosk" element={<KioskPage />} />
                <Route path="model" element={<ModelHealthPage />} />
                <Route path="drift" element={<DriftMonitorPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="connection" element={<ConnectionPage />} />

                {/* Admin Only Routes */}
                <Route
                  path="registry"
                  element={
                    <RoleGuard allowedRoles={['admin']}>
                      <ModelRegistryPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RoleGuard allowedRoles={['admin']}>
                      <AuditLogPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RoleGuard allowedRoles={['admin']}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />
              </Route>

              {/* 404 Catch-All */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
