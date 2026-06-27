import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, Users, Package, Receipt, Settings, LogOut, X, Sparkles, Bell, BarChart3, FileBarChart } from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, key: 'nav.dashboard', end: true },
  { to: '/app/invoices', icon: FileText, key: 'nav.invoices' },
  { to: '/app/ai-invoice', icon: Sparkles, key: 'nav.aiInvoice' },
  { to: '/app/customers', icon: Users, key: 'nav.customers' },
  { to: '/app/products', icon: Package, key: 'nav.products' },
  { to: '/app/expenses', icon: Receipt, key: 'nav.expenses' },
  { to: '/app/gst-reports', icon: FileBarChart, key: 'nav.gstReports' },
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
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-gray-100">
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">BB</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Bill By Billu</h1>
            <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{user?.businessName || user?.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"><X size={16} /></button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-item-premium ${isActive ? 'active' : 'text-gray-500 hover:text-gray-900'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-brand-100' : 'bg-transparent group-hover:bg-gray-100'}`}>
                  <Icon size={16} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                </div>
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-100/80 px-4 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn-press flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all duration-200"
        >
          <LogOut size={16} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}
