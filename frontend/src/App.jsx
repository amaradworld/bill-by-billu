import { Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
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

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
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
          <Route path="/admin" element={<AdminAuthProvider><AdminRoute><AdminDashboardPage /></AdminRoute></AdminAuthProvider>} />
          <Route path="/admin/subscribers" element={<AdminAuthProvider><AdminRoute><AdminSubscribersPage /></AdminRoute></AdminAuthProvider>} />
          <Route path="/admin/users" element={<AdminAuthProvider><AdminRoute><AdminUsersPage /></AdminRoute></AdminAuthProvider>} />

          {/* User app */}
          <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="ai-invoice" element={<AIInvoicePage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="gst-reports" element={<GSTReportsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="whatsapp-bot" element={<WhatsAppBotPage />} />
            <Route path="import" element={<ImportPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
