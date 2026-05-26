import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthStore, applyTheme, useThemeStore } from "@/store";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/modules/auth/LoginPage";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";
import { ClientsPage } from "@/modules/clients/ClientsPage";
import { InvoicesPage } from "@/modules/invoices/InvoicesPage";
import { InvoiceDetailPage } from "@/modules/invoices/InvoiceDetailPage";
import { InvoiceFormPage } from "@/modules/invoices/InvoiceFormPage";
import { PaymentsPage } from "@/modules/payments/PaymentsPage";
import { BorewellJobsPage } from "@/modules/borewell/BorewellJobsPage";
import { VehiclesPage } from "@/modules/vehicles/VehiclesPage";
import { ExpensesPage } from "@/modules/expenses/ExpensesPage";
import { GstReportsPage } from "@/modules/gst/GstReportsPage";
import { AnalyticsPage } from "@/modules/analytics/AnalyticsPage";
import { LogsPage } from "@/modules/logs/LogsPage";
import { SettingsPage } from "@/modules/settings/SettingsPage";
import { UsersPage } from "@/modules/users/UsersPage";
import { BackupPage } from "@/modules/backup/BackupPage";
import { useEffect } from "react";

const Router =
  typeof window !== "undefined" && window.location.protocol === "file:"
    ? HashRouter
    : BrowserRouter;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
        <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
        <Route path="/borewell-jobs" element={<ProtectedRoute><BorewellJobsPage /></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
        <Route path="/gst" element={<ProtectedRoute><GstReportsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </Router>
  );
}
