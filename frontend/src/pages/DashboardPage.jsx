import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import DashboardCharts from '../components/DashboardCharts';
import { TrendingUp, TrendingDown, FileText, Clock, AlertCircle, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/invoices/stats')
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <AlertCircle size={40} className="text-red-400 mb-3" />
      <p className="text-gray-600 mb-2">{t('common.error')}</p>
      <p className="text-sm text-gray-400">{error}</p>
    </div>
  );

  const cards = [
    { label: t('dashboard.totalRevenue'), value: fmt(stats?.thisMonth?.revenue || 0), sub: t('dashboard.thisMonth'), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: t('dashboard.lastMonth'), value: fmt(stats?.lastMonth?.revenue || 0), sub: `${stats?.lastMonth?.revenueChange >= 0 ? '+' : ''}${stats?.lastMonth?.revenueChange || 0}%`, icon: stats?.lastMonth?.revenueChange >= 0 ? TrendingUp : TrendingDown, color: stats?.lastMonth?.revenueChange >= 0 ? 'text-green-600' : 'text-red-600', bg: stats?.lastMonth?.revenueChange >= 0 ? 'bg-green-50' : 'bg-red-50' },
    { label: t('dashboard.unpaidInvoices'), value: fmt(stats?.unpaid?.amount || 0), sub: `${stats?.unpaid?.count || 0} ${t('nav.invoices').toLowerCase()}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('dashboard.totalInvoices'), value: stats?.thisMonth?.invoiceCount || 0, sub: t('dashboard.thisMonth'), icon: FileText, color: 'text-brand-600', bg: 'bg-brand-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <Link to="/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          <Plus size={16} /> {t('dashboard.createInvoice')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.bg}`}><c.icon size={18} className={c.color} /></div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-lg font-bold">{c.value}</p>
              </div>
            </div>
            <p className={`text-xs mt-2 ${c.color}`}>{c.sub}</p>
          </div>
        ))}
      </div>

      <DashboardCharts stats={stats} />

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">{t('dashboard.recentInvoices')}</h2>
          <Link to="/invoices" className="text-sm text-brand-600 hover:underline">{t('common.view')} {t('common.all')}</Link>
        </div>
        {stats?.recentInvoices?.length ? (
          <div className="divide-y">
            {stats.recentInvoices.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}/edit`} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <FileText size={16} className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{inv.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(inv.totalAmount)}</p>
                  <p className={`text-xs ${inv.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                    {t(`invoice.payment ${inv.paymentStatus.toLowerCase()}`)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p>{t('dashboard.noInvoices')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
