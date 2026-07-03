import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Preferences } from '@capacitor/preferences';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import PasswordStrength from '../components/PasswordStrength';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

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
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const googleBtnRef = useRef(null);

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    businessName: '', gstNumber: '', panNumber: '',
    phone: '', address: '', city: '', state: '', pincode: '',
    referralCode: refCode,
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (refCode) {
      setForm(f => ({ ...f, referralCode: refCode }));
    }
  }, [refCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = form;
      await register(submitData);
      navigate('/app');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      let credential;
      if (isNative) {
        const google = window.google;
        if (!google || !google.accounts) {
          toast.error('Google Sign-In not loaded. Check your connection.');
          return;
        }
        credential = await new Promise((resolve, reject) => {
          google.accounts.id.initialize({
            client_id: '349451682504-9d27bma42irec3chj4uimf1klir4oa9g.apps.googleusercontent.com',
            callback: (response) => resolve(response.credential),
            error_callback: (err) => reject(new Error(err.type || 'Google sign-in failed')),
          });
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              const container = document.createElement('div');
              container.style.position = 'fixed';
              container.style.top = '50%';
              container.style.left = '50%';
              container.style.transform = 'translate(-50%, -50%)';
              container.style.zIndex = '9999';
              container.style.background = 'white';
              container.style.padding = '20px';
              container.style.borderRadius = '12px';
              container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
              document.body.appendChild(container);
              google.accounts.id.renderButton(container, {
                theme: 'outline', size: 'large', text: 'signup_with',
              });
              setTimeout(() => container.remove(), 30000);
            }
          });
        });
      } else {
        return;
      }
      if (!credential) {
        toast.error('Google sign-up failed: No credential received.');
        return;
      }
      const data = await api.post('/api/auth/google', { credential });
      await Preferences.set({ key: 'bbToken', value: data.token });
      window.location.href = '/app';
    } catch (err) {
      const msg = err.message || '';
      console.error('Google signup error:', msg);
      if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('prompt_not_displayed')) {
        // silent
      } else {
        toast.error(`Google signup failed: ${msg}`);
      }
    }
  };

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
      attempts++;
      if (window.google && window.google.accounts) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '349451682504-9d27bma42irec3chj4uimf1klir4oa9g.apps.googleusercontent.com',
          callback: async (response) => {
            try {
              const data = await api.post('/api/auth/google', { credential: response.credential });
              await Preferences.set({ key: 'bbToken', value: data.token });
              window.location.href = '/app';
            } catch (err) {
        toast.error(err.code ? `${err.message} (code: ${err.code})` : err.message || 'Google sign-up failed');
            }
          },
        });
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signup_with',
          });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const input = "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm";

  return (
    <>
      <Helmet>
        <title>Create Free Account — Bill By Billu | AI-Powered GST Invoicing</title>
        <meta name="description" content="Sign up for free on Bill By Billu — AI-powered billing & GST software for Indian businesses. Start creating invoices in seconds. 28-day free trial." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://www.billbybillu.in/register" />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex justify-end mb-4"><LanguageSelector /></div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <Link to="/" className="flex items-center justify-center gap-2">
              <Logo size={36} />
              <span className="text-2xl font-bold text-brand-600">Bill By Billu</span>
            </Link>
            <p className="text-sm text-gray-500 mt-1">{t('auth.createAccount')}</p>
          </div>

          <div className="mb-4">
            {isNative ? (
              <button onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign up with Google
              </button>
            ) : (
              <div ref={googleBtnRef} className="w-full" />
            )}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or register with email</span></div>
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
                <PasswordStrength password={form.password} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.confirmPassword')} *</label>
                <input type="password" className={input} required value={form.confirmPassword} onChange={set('confirmPassword')} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Referral Code (optional)</label>
                <input className={input} value={form.referralCode} onChange={set('referralCode')} placeholder="e.g. ABC12345" />
                {form.referralCode && <p className="text-xs text-green-600 mt-1">Both you and your referrer earn rewards!</p>}
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
    </>
  );
}
