import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import toast from 'react-hot-toast';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, token, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: '', businessName: '', phone: '', gstNumber: '', panNumber: '',
    address: '', city: '', state: '', pincode: '',
    invoicePrefix: 'INV', currency: 'INR', whatsappNumber: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '', businessName: user.businessName || '', phone: user.phone || '',
        gstNumber: user.gstNumber || '', panNumber: user.panNumber || '',
        address: user.address || '', city: user.city || '', state: user.state || '', pincode: user.pincode || '',
        invoicePrefix: user.invoicePrefix || 'INV', currency: user.currency || 'INR',
        whatsappNumber: user.whatsappNumber || '',
      });
    }
  }, [user]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success(t('common.success'));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const input = "w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">{t('settings.language')}</h2>
        <LanguageSelector />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">{t('settings.profile')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.name')}</label><input className={input} value={form.name} onChange={set('name')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.businessName')}</label><input className={input} value={form.businessName} onChange={set('businessName')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.email')}</label><input type="email" className={input} value={user?.email || ''} disabled /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.phone')}</label><input className={input} value={form.phone} onChange={set('phone')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.gstNumber')}</label><input className={input} value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.panNumber')}</label><input className={input} value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE1234F" /></div>
            <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('customer.address')}</label><input className={input} value={form.address} onChange={set('address')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.city')}</label><input className={input} value={form.city} onChange={set('city')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.state')}</label><input className={input} value={form.state} onChange={set('state')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.pincode')}</label><input className={input} value={form.pincode} onChange={set('pincode')} /></div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">{t('invoice.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('settings.invoicePrefix')}</label>
              <input className={input} value={form.invoicePrefix} onChange={set('invoicePrefix')} placeholder="INV" />
              <p className="text-xs text-gray-400 mt-1">{t('settings.invoicePrefixHint')}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('settings.currency')}</label>
              <select className={input} value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">WhatsApp Sharing</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('settings.whatsappNumber')}</label>
            <input className={input} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="919876543210" />
            <p className="text-xs text-gray-400 mt-1">{t('settings.whatsappHint')}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('settings.plan')}</h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${user?.plan === 'FREE' ? 'bg-gray-100 text-gray-700' : 'bg-brand-100 text-brand-700'}`}>{user?.plan || 'FREE'}</span>
          <span className="text-sm text-gray-500">10 {t('invoice.title').toLowerCase()}/{t('dashboard.thisMonth').toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}
