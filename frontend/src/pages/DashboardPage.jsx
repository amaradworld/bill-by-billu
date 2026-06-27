import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import DashboardCharts from '../components/DashboardCharts';
import AnimatedCounter from '../components/AnimatedCounter';
import { DashboardSkeleton } from '../components/Skeleton';
import { TrendingUp, TrendingDown, FileText, Clock, AlertCircle, Plus, Sparkles, ArrowRight, IndianRupee } from 'lucide-react';

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
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (loading) return <DashboardSkeleton />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <p className="font-medium text-gray-700 mb-1">{t('common.error')}</p>
      <p className="text-sm text-gray-400">{error}</p>
    </div>
  );

  const cards = [
    {
      label: t('dashboard.totalRevenue'),
      value: stats?.thisMonth?.revenue || 0,
      fmt: true,
      sub: t('dashboard.thisMonth'),
      icon: IndianRupee,
      color: 'from-emerald-500 to-green-600',
      lightColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: null,
    },
    {
      label: t('dashboard.lastMonth'),
      value: stats?.lastMonth?.revenue || 0,
      fmt: true,
      sub: `${stats?.lastMonth?.revenueChange >= 0 ? '+' : ''}${stats?.lastMonth?.revenueChange || 0}% vs last month`,
      icon: stats?.lastMonth?.revenueChange >= 0 ? TrendingUp : TrendingDown,
      color: stats?.lastMonth?.revenueChange >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600',
      lightColor: stats?.lastMonth?.revenueChange >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      iconColor: stats?.lastMonth?.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600',
      trend: stats?.lastMonth?.revenueChange,
    },
    {
      label: t('dashboard.unpaidInvoices'),
      value: stats?.unpaid?.amount || 0,
      fmt: true,
      sub: `${stats?.unpaid?.count || 0} ${t('nav.invoices').toLowerCase()} pending`,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      lightColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: null,
    },
    {
      label: t('dashboard.totalInvoices'),
      value: stats?.thisMonth?.invoiceCount || 0,
      fmt: false,
      sub: t('dashboard.thisMonth'),
      icon: FileText,
      color: 'from-brand-500 to-blue-600',
      lightColor: 'bg-brand-50',
      iconColor: 'text-brand-600',
      trend: null,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">Here's what's happening with your business</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/ai-invoice" className="btn-press flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-glow-amber">
            <Sparkles size={15} /> AI Invoice
          </Link>
          <Link to="/app/invoices/new" className="btn-press flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-all shadow-sm hover:shadow-glow">
            <Plus size={15} /> {t('dashboard.createInvoice')}
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {cards.map((c, i) => (
          <div key={i} className="stat-card group cursor-default" style={{ '--accent-from': c.color.split(' ')[0]?.replace('from-', ''), '--accent-to': c.color.split(' ')[1]?.replace('to-', '') }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-1.5 tabular-nums">
                  {c.fmt ? (
                    <AnimatedCounter value={c.value} prefix="₹" duration={1200} />
                  ) : (
                    <AnimatedCounter value={c.value} duration={800} />
                  )}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${c.lightColor} transition-transform duration-300 group-hover:scale-110`}>
                <c.icon size={18} className={c.iconColor} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {c.trend !== null && (
                <span className={`text-xs font-semibold ${c.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}%
                </span>
              )}
              <p className="text-xs text-gray-400">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="animate-slide-up animation-delay-200">
        <DashboardCharts stats={stats} />
      </div>

      {/* Recent Invoices */}
      <div className="card-premium animate-slide-up animation-delay-300">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('dashboard.recentInvoices')}</h2>
          <Link to="/app/invoices" className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
            {t('common.view')} {t('common.all')} <ArrowRight size={14} />
          </Link>
        </div>
        {stats?.recentInvoices?.length ? (
          <div className="divide-y divide-gray-50">
            {stats.recentInvoices.map((inv, i) => (
              <Link key={inv.id} to={`/app/invoices/${inv.id}/edit`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-all duration-200 group"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <FileText size={16} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400 truncate">{inv.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{fmt(inv.totalAmount)}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    inv.paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {t(`invoice.payment ${inv.paymentStatus.toLowerCase()}`)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('dashboard.noInvoices')}</p>
            <Link to="/app/invoices/new" className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Plus size={14} /> Create your first invoice
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
