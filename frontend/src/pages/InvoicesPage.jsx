import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Plus, Search, FileText } from 'lucide-react';

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/api/invoices?${params}`)
      .then(d => setInvoices(d.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const filtered = invoices.filter(inv =>
    !search || inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('invoice.title')}</h1>
        <Link to="/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> {t('invoice.createNew')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') + '...'}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-xs rounded-lg border ${!statusFilter ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white text-gray-600'}`}>{t('common.all')}</button>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs rounded-lg border capitalize ${statusFilter === s ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white text-gray-600'}`}>
              {t(`invoice.status ${s.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <FileText size={40} className="mx-auto mb-3" />
          <p className="mb-3">{t('invoice.noInvoices')}</p>
          <Link to="/invoices/new" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus size={16} /> {t('invoice.createNew')}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('invoice.invoiceNumber')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('customer.title')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('invoice.invoiceDate')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">{t('invoice.amount')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('invoice.status')}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t('invoice.paymentStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}/edit`)}>
                    <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.customerName || inv.customer?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                        inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{t(`invoice.status ${inv.status?.toLowerCase()}`)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                        inv.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                        inv.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{t(`invoice.payment ${inv.paymentStatus?.toLowerCase()}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
