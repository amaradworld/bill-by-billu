import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { Plus, Search, FileText, CheckCircle, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/api/invoices?${params}`)
      .then(d => setInvoices(d.invoices || []))
      .catch(err => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  const handleMarkPaid = async (e, invId) => {
    e.stopPropagation();
    setPaymentModal(invId);
  };

  const confirmPayment = async () => {
    if (!paymentModal) return;
    try {
      await api.put(`/api/invoices/${paymentModal}/payment`, { paymentMethod });
      toast.success('Marked as paid');
      setInvoices(prev => prev.map(inv => inv.id === paymentModal ? { ...inv, paymentStatus: 'PAID', status: 'PAID', paymentMethod } : inv));
      setPaymentModal(null);
      setPaymentMethod('Cash');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (e, invId) => {
    e.stopPropagation();
    if (!confirm('Cancel this invoice? This cannot be undone.')) return;
    try {
      await api.delete(`/api/invoices/${invId}`);
      toast.success('Invoice cancelled');
      setInvoices(prev => prev.filter(inv => inv.id !== invId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const filtered = invoices.filter(inv =>
    !debouncedSearch || inv.invoiceNumber?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const statuses = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE'];
  const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

  return (
    <div className="space-y-4">
      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Mark as Paid</h3>
              <button onClick={() => setPaymentModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        paymentMethod === m ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPaymentModal(null)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={confirmPayment}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('invoice.title')}</h1>
        <Link to="/app/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
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
          <Link to="/app/invoices/new" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus size={16} /> {t('invoice.createNew')}
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
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
                    <th className="text-center px-4 py-3 font-medium text-gray-600">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/app/invoices/${inv.id}/edit`)}>
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {inv.paymentStatus !== 'PAID' && (
                            <button onClick={(e) => handleMarkPaid(e, inv.id)} className="text-green-500 hover:text-green-700" title={t('invoice.markAsPaid')}>
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button onClick={(e) => handleDelete(e, inv.id)} className="text-red-400 hover:text-red-600" title="Cancel invoice">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl border p-4 cursor-pointer" onClick={() => navigate(`/app/invoices/${inv.id}/edit`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.customerName || inv.customer?.name || '-'}</p>
                  </div>
                  <p className="font-semibold ml-2 whitespace-nowrap">{fmt(inv.totalAmount)}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                    inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{t(`invoice.status ${inv.status?.toLowerCase()}`)}</span>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                    inv.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                    inv.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{t(`invoice.payment ${inv.paymentStatus?.toLowerCase()}`)}</span>
                  <span className="text-xs text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  {inv.paymentStatus !== 'PAID' && (
                    <button onClick={(e) => handleMarkPaid(e, inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"><CheckCircle size={12} /> {t('invoice.markAsPaid')}</button>
                  )}
                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                    <button onClick={(e) => handleDelete(e, inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={12} /> Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
