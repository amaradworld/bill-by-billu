import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, Users, Package, Receipt, Settings, LogOut, X, Sparkles, Bell, BarChart3 } from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, key: 'nav.dashboard', end: true },
  { to: '/app/invoices', icon: FileText, key: 'nav.invoices' },
  { to: '/app/ai-invoice', icon: Sparkles, key: 'nav.aiInvoice' },
  { to: '/app/customers', icon: Users, key: 'nav.customers' },
  { to: '/app/products', icon: Package, key: 'nav.products' },
  { to: '/app/expenses', icon: Receipt, key: 'nav.expenses' },
  { to: '/app/insights', icon: BarChart3, key: 'nav.insights' },
  { to: '/app/reminders', icon: Bell, key: 'nav.reminders' },
  { to: '/app/settings', icon: Settings, key: 'nav.settings' },
];

export default function Sidebar({ onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div>
          <h1 className="text-lg font-bold text-brand-600">Bill By Billu</h1>
          <p className="text-xs text-gray-500 truncate max-w-[180px]">{user?.businessName || user?.name}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded lg:hidden"><X size={18} /></button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}
