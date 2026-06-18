import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Users, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '';
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi',
];

export default function CustomersPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', gstNumber: '', address: '', city: '', state: '', pincode: '', type: 'B2C' });

  const fetchCustomers = () => {
    fetch(`${API}/api/customers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/customers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(t('common.success'));
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', gstNumber: '', address: '', city: '', state: '', pincode: '', type: 'B2C' });
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirm'))) return;
    try {
      await fetch(`${API}/api/customers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchCustomers();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.gstNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('customer.title')}</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> {t('customer.addCustomer')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{t('customer.addCustomer')}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('customer.name')} *</label><input className={input} required value={form.name} onChange={set('name')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.email')}</label><input type="email" className={input} value={form.email} onChange={set('email')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.phone')}</label><input className={input} value={form.phone} onChange={set('phone')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.gstNumber')}</label><input className={input} value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.type')}</label><select className={input} value={form.type} onChange={set('type')}><option value="B2C">{t('customer.typeB2C')}</option><option value="B2B">{t('customer.typeB2B')}</option></select></div>
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('customer.address')}</label><input className={input} value={form.address} onChange={set('address')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.city')}</label><input className={input} value={form.city} onChange={set('city')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.state')}</label><select className={input} value={form.state} onChange={set('state')}><option value="">Select</option>{INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('customer.pincode')}</label><input className={input} value={form.pincode} onChange={set('pincode')} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('customer.search')}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3" />
          <p>{t('customer.noCustomers')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.email || c.phone || '-'}</p>
                  {c.gstNumber && <p className="text-xs text-gray-400 mt-1">GSTIN: {c.gstNumber}</p>}
                  {c.state && <p className="text-xs text-gray-400">{c.state}</p>}
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className={`px-2 py-0.5 rounded-full ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>{c.type}</span>
                {c._count?.invoices > 0 && <span>{c._count.invoices} {t('nav.invoices').toLowerCase()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
