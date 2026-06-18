import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Plus, Trash2, ArrowLeft, Save, Package, Download, MessageCircle, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['NOS', 'KG', 'MTR', 'LTR', 'BOX', 'PCS', 'SET', 'HRS', 'DAY', 'MON'];

const emptyItem = { productId: '', name: '', description: '', hsnCode: '', unit: 'NOS', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18 };

export default function InvoiceFormPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    customerId: '', customerName: '', customerGst: '', customerAddress: '', customerState: '',
    invoiceDate: new Date().toISOString().split('T')[0], dueDate: '',
    items: [{ ...emptyItem }], discount: 0, notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days', placeOfSupply: '', reverseCharge: false, paymentMethod: '',
    currency: 'INR', exchangeRate: 1, isRecurring: false, recurringInterval: '',
    noteType: '', originalInvoiceId: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers').catch(() => ({ customers: [] })),
      api.get('/api/products').catch(() => ({ products: [] })),
    ]).then(([custData, prodData]) => {
      setCustomers(custData.customers || []);
      setProducts(prodData.products || []);
    });

    if (isEdit) {
      api.get(`/api/invoices/${id}`)
        .then(inv => {
          setForm({
            customerId: inv.customerId || '', customerName: inv.customerName || '',
            customerGst: inv.customerGst || '', customerAddress: inv.customerAddress || '',
            customerState: inv.customerState || '',
            invoiceDate: inv.invoiceDate?.split('T')[0] || '',
            dueDate: inv.dueDate?.split('T')[0] || '',
            items: inv.items?.length ? inv.items.map(i => ({
              productId: i.productId || '', name: i.name, description: i.description || '',
              hsnCode: i.hsnCode || '', unit: i.unit,
              quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
              discount: Number(i.discount), gstRate: Number(i.gstRate),
            })) : [{ ...emptyItem }],
            discount: Number(inv.discountAmount) || 0,
            notes: inv.notes || '', terms: inv.terms || '',
            placeOfSupply: inv.placeOfSupply || '',
            reverseCharge: inv.reverseCharge || false,
            paymentMethod: inv.paymentMethod || '',
          });
        })
        .catch(() => toast.error('Failed to load invoice'));
    }
  }, [id, isEdit, token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setItem = (idx, k) => (e) => setForm(f => {
    const items = [...f.items];
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    items[idx] = { ...items[idx], [k]: val };
    return { ...f, items };
  });
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const onCustomerSelect = (e) => {
    const c = customers.find(c => c.id === e.target.value);
    setForm(f => ({
      ...f,
      customerId: c?.id || '', customerName: c?.name || '',
      customerGst: c?.gstNumber || '', customerAddress: c?.address || '',
      customerState: c?.state || '', placeOfSupply: c?.state || f.placeOfSupply,
    }));
  };

  const onProductSelect = (idx, e) => {
    const p = products.find(p => p.id === e.target.value);
    if (!p) return;
    setForm(f => {
      const items = [...f.items];
      items[idx] = {
        ...items[idx],
        productId: p.id, name: p.name, description: p.description || '',
        hsnCode: p.hsnCode || '', unit: p.unit, unitPrice: Number(p.unitPrice), gstRate: Number(p.gstRate),
      };
      return { ...f, items };
    });
  };

  // GST calculation — matches backend exactly: discount is per-item percentage
  const calcTotals = () => {
    let subtotal = 0, totalTax = 0;
    form.items.forEach(item => {
      const lineAmount = item.quantity * item.unitPrice;
      const lineDiscount = lineAmount * (item.discount || 0) / 100;
      const taxableAmount = lineAmount - lineDiscount;
      subtotal += taxableAmount;
      totalTax += taxableAmount * item.gstRate / 100;
    });
    const grandTotal = subtotal - Number(form.discount) + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const { subtotal, totalTax, grandTotal } = calcTotals();
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

  const handleDownloadPDF = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('bbToken');
      const res = await fetch(`${API || ''}/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Invoice ${form.customerName || 'Customer'}\n` +
      `Amount: ₹${grandTotal.toFixed(2)}\n` +
      `Date: ${form.invoiceDate}\n` +
      `Due: ${form.dueDate || 'N/A'}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleSendPaymentLink = async () => {
    if (!id) return;
    try {
      const data = await api.post('/api/payments/razorpay/link', {
        invoiceId: id,
        amount: grandTotal,
        currency: form.currency || 'INR',
        customerName: form.customerName,
      });
      toast.success('Payment link created!');
      if (data.short_url) window.open(data.short_url, '_blank');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0 || !form.items[0].name) return toast.error('Add at least one item');
    setLoading(true);
    try {
      const url = isEdit ? `/api/invoices/${id}` : '/api/invoices';
      const method = isEdit ? api.put : api.post;
      await method(url, {
        customerId: form.customerId || undefined,
        customerName: form.customerName || undefined,
        customerGst: form.customerGst || undefined,
        customerAddress: form.customerAddress || undefined,
        customerState: form.customerState || undefined,
        invoiceDate: form.invoiceDate, dueDate: form.dueDate || undefined,
        items: form.items.map(i => ({
          productId: i.productId || undefined, name: i.name, description: i.description || undefined,
          hsnCode: i.hsnCode || undefined, unit: i.unit,
          quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
          discount: Number(i.discount), gstRate: Number(i.gstRate),
        })),
        discount: Number(form.discount), notes: form.notes, terms: form.terms,
        placeOfSupply: form.placeOfSupply, reverseCharge: form.reverseCharge,
        paymentMethod: form.paymentMethod,
      });
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      navigate('/invoices');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const select = "w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold">{isEdit ? t('invoice.editInvoice') : t('invoice.createNew')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">{t('customer.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('customer.title')}</label>
              <select className={select} value={form.customerId} onChange={onCustomerSelect}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('invoice.invoiceNumber')}</label>
              <input className={input} value={isEdit ? id : 'Auto-generated'} disabled />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('invoice.invoiceDate')}</label>
              <input type="date" className={input} value={form.invoiceDate} onChange={set('invoiceDate')} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('invoice.dueDate')}</label>
              <input type="date" className={input} value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">{t('invoice.item')}s</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-brand-600 hover:underline"><Plus size={14} /> {t('invoice.addItem')}</button>
          </div>
          {form.items.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">#{idx + 1}</span>
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                )}
              </div>
              {products.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Package size={12} /> Quick select product</label>
                  <select className={select} value={item.productId || ''} onChange={(e) => onProductSelect(idx, e)}>
                    <option value="">Custom item</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.unitPrice).toLocaleString('en-IN')}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.itemName')} *</label>
                  <input className={input} required value={item.name} onChange={setItem(idx, 'name')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.hsnCode')}</label>
                  <input className={input} value={item.hsnCode} onChange={setItem(idx, 'hsnCode')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.unit')}</label>
                  <select className={select} value={item.unit} onChange={setItem(idx, 'unit')}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.quantity')} *</label>
                  <input type="number" min="0.01" step="0.01" className={input} required value={item.quantity} onChange={setItem(idx, 'quantity')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.unitPrice')} *</label>
                  <input type="number" min="0.01" step="0.01" className={input} required value={item.unitPrice} onChange={setItem(idx, 'unitPrice')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.discount')} (%)</label>
                  <input type="number" min="0" max="100" step="0.01" className={input} value={item.discount} onChange={setItem(idx, 'discount')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.gstRate')} (%)</label>
                  <select className={select} value={item.gstRate} onChange={setItem(idx, 'gstRate')}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                {t('invoice.lineTotal')}: <span className="font-semibold text-gray-900">{fmt(item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100))}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-4 md:p-6 space-y-3">
            <h2 className="font-semibold text-gray-700">{t('invoice.notes')}</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('invoice.notes')}</label>
              <textarea className={input} rows={2} value={form.notes} onChange={set('notes')} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('invoice.terms')}</label>
              <textarea className={input} rows={2} value={form.terms} onChange={set('terms')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('invoice.currency')}</label>
                <select className={select} value={form.currency} onChange={set('currency')}>
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('invoice.recurringInterval')}</label>
                <select className={select} value={form.recurringInterval} onChange={set('recurringInterval')}>
                  <option value="">{t('invoice.recurringNone')}</option>
                  <option value="MONTHLY">{t('invoice.recurringMonthly')}</option>
                  <option value="QUARTERLY">{t('invoice.recurringQuarterly')}</option>
                  <option value="YEARLY">{t('invoice.recurringYearly')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('invoice.noteType')}</label>
                <select className={select} value={form.noteType} onChange={set('noteType')}>
                  <option value="">None</option>
                  <option value="CREDIT_NOTE">{t('invoice.creditNote')}</option>
                  <option value="DEBIT_NOTE">{t('invoice.debitNote')}</option>
                </select>
              </div>
              {form.currency !== 'INR' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('invoice.exchangeRate')}</label>
                  <input type="number" step="0.0001" className={input} value={form.exchangeRate} onChange={set('exchangeRate')} />
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 md:p-6 space-y-3">
            <h2 className="font-semibold text-gray-700">{t('invoice.total')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">{t('invoice.subtotal')}</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('invoice.totalTax')}</span><span>{fmt(totalTax)}</span></div>
              {Number(form.discount) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('invoice.discount')}</span><span className="text-red-600">-{fmt(form.discount)}</span></div>}
              <div className="flex justify-between border-t pt-2 font-bold text-lg"><span>{t('invoice.grandTotal')}</span><span className="text-brand-600">{fmt(grandTotal)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/invoices')} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('common.cancel')}</button>
          {isEdit && (
            <>
              <button type="button" onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Download size={16} /> PDF
              </button>
              <button type="button" onClick={handleShareWhatsApp} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-green-50 text-green-700">
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button type="button" onClick={handleSendPaymentLink} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-purple-50 text-purple-700">
                <CreditCard size={16} /> Pay Link
              </button>
            </>
          )}
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            <Save size={16} /> {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
