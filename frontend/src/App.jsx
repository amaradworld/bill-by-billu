import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import ExpensesPage from './pages/ExpensesPage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';
import AIInvoicePage from './pages/AIInvoicePage';
import RemindersPage from './pages/RemindersPage';
import InsightsPage from './pages/InsightsPage';
import GSTReportsPage from './pages/GSTReportsPage';
import ImportPage from './pages/ImportPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminSubscribersPage from './pages/AdminSubscribersPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import WhatsAppBotPage from './pages/WhatsAppBotPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  return admin ? children : <Navigate to="/admin/login" />;
}

function RouteErrorBoundary({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function AndroidBackHandler() {
  const location = useLocation();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let App;
    const setup = async () => {
      try {
        App = (await import('@capacitor/app')).App;
      } catch { return; }
      App.addListener('backButton', ({ canGoBack }) => {
        if (location.pathname.startsWith('/app')) {
          window.history.back();
        } else if (canGoBack) {
          window.history.back();
        }
      });
    };
    setup();
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AndroidBackHandler />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          {/* Admin routes — completely separate */}
          <Route path="/admin/login" element={<AdminAuthProvider><AdminLoginPage /></AdminAuthProvider>} />
          <Route path="/admin" element={<AdminAuthProvider><AdminRoute><RouteErrorBoundary><AdminDashboardPage /></RouteErrorBoundary></AdminRoute></AdminAuthProvider>} />
          <Route path="/admin/subscribers" element={<AdminAuthProvider><AdminRoute><RouteErrorBoundary><AdminSubscribersPage /></RouteErrorBoundary></AdminRoute></AdminAuthProvider>} />
          <Route path="/admin/users" element={<AdminAuthProvider><AdminRoute><RouteErrorBoundary><AdminUsersPage /></RouteErrorBoundary></AdminRoute></AdminAuthProvider>} />

          {/* User app */}
          <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<RouteErrorBoundary><DashboardPage /></RouteErrorBoundary>} />
            <Route path="invoices" element={<RouteErrorBoundary><InvoicesPage /></RouteErrorBoundary>} />
            <Route path="invoices/new" element={<RouteErrorBoundary><InvoiceFormPage /></RouteErrorBoundary>} />
            <Route path="invoices/:id/edit" element={<RouteErrorBoundary><InvoiceFormPage /></RouteErrorBoundary>} />
            <Route path="customers" element={<RouteErrorBoundary><CustomersPage /></RouteErrorBoundary>} />
            <Route path="products" element={<RouteErrorBoundary><ProductsPage /></RouteErrorBoundary>} />
            <Route path="inventory" element={<RouteErrorBoundary><InventoryPage /></RouteErrorBoundary>} />
            <Route path="expenses" element={<RouteErrorBoundary><ExpensesPage /></RouteErrorBoundary>} />
            <Route path="settings" element={<RouteErrorBoundary><SettingsPage /></RouteErrorBoundary>} />
            <Route path="ai-invoice" element={<RouteErrorBoundary><AIInvoicePage /></RouteErrorBoundary>} />
            <Route path="reminders" element={<RouteErrorBoundary><RemindersPage /></RouteErrorBoundary>} />
            <Route path="gst-reports" element={<RouteErrorBoundary><GSTReportsPage /></RouteErrorBoundary>} />
            <Route path="insights" element={<RouteErrorBoundary><InsightsPage /></RouteErrorBoundary>} />
            <Route path="whatsapp-bot" element={<RouteErrorBoundary><WhatsAppBotPage /></RouteErrorBoundary>} />
            <Route path="import" element={<RouteErrorBoundary><ImportPage /></RouteErrorBoundary>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
