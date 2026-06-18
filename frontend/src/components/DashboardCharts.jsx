import { useTranslation } from 'react-i18next';

export default function DashboardCharts({ stats }) {
  const { t } = useTranslation();

  if (!stats) return null;

  const revenue = stats.thisMonth?.revenue || 0;
  const unpaid = stats.unpaid?.amount || 0;
  const total = revenue + unpaid || 1;

  const paidPct = Math.round((revenue / total) * 100);
  const unpaidPct = 100 - paidPct;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Revenue breakdown */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.totalRevenue')}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-600">{t('invoice.payment paid')}</span>
              <span className="font-medium">{paidPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-600">{t('invoice.payment unpaid')}</span>
              <span className="font-medium">{unpaidPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${unpaidPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.quickStats')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('dashboard.thisMonth')}</span>
            <span className="font-medium">{stats.thisMonth?.invoiceCount || 0} {t('nav.invoices').toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('dashboard.lastMonth')}</span>
            <span className="font-medium">{stats.lastMonth?.invoiceCount || 0} {t('nav.invoices').toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('invoice.totalTax')}</span>
            <span className="font-medium">₹{(stats.thisMonth?.tax || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-500">{t('dashboard.unpaidInvoices')}</span>
            <span className="font-medium text-amber-600">{stats.unpaid?.count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
