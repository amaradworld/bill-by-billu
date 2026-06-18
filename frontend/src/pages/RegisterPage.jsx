import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh',
  'Chandigarh','Dadra and Nagar Haveli','Lakshadweep','Puducherry','Andaman and Nicobar Islands',
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    businessName: '', gstNumber: '', panNumber: '',
    phone: '', address: '', city: '', state: '', pincode: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex justify-end mb-4"><LanguageSelector /></div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-brand-600">Bill By Billu</h1>
            <p className="text-sm text-gray-500 mt-1">{t('auth.createAccount')}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.name')} *</label>
                <input className={input} required value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.email')} *</label>
                <input type="email" className={input} required value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.password')} *</label>
                <input type="password" className={input} required minLength={8} value={form.password} onChange={set('password')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.confirmPassword')} *</label>
                <input type="password" className={input} required value={form.confirmPassword} onChange={set('confirmPassword')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.businessName')}</label>
                <input className={input} value={form.businessName} onChange={set('businessName')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.phone')}</label>
                <input className={input} value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.gstNumber')}</label>
                <input className={input} value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.panNumber')}</label>
                <input className={input} value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE1234F" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('customer.address')}</label>
                <input className={input} value={form.address} onChange={set('address')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('customer.city')}</label>
                <input className={input} value={form.city} onChange={set('city')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('customer.state')}</label>
                <select className={input} value={form.state} onChange={set('state')}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('customer.pincode')}</label>
                <input className={input} value={form.pincode} onChange={set('pincode')} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors mt-2">
              {loading ? t('common.loading') : t('auth.createAccount')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.hasAccount')} <Link to="/login" className="text-brand-600 font-medium hover:underline">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
