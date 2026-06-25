import { Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from './context/AuthContext';
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
import SettingsPage from './pages/SettingsPage';
import AIInvoicePage from './pages/AIInvoicePage';
import RemindersPage from './pages/RemindersPage';
import InsightsPage from './pages/InsightsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <HelmetProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<InvoiceFormPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="ai-invoice" element={<AIInvoicePage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="insights" element={<InsightsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HelmetProvider>
  );
}
