import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/app');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1055595839739-7c99jeuht3ga4vdbv3c6mvjs067googp.apps.googleusercontent.com',
          callback: async (response) => {
            try {
              const data = await api.post('/api/auth/google', { credential: response.credential });
              await Preferences.set({ key: 'bbToken', value: data.token });
              window.location.href = '/app';
            } catch (err) {
              toast.error(err.message || 'Google login failed');
            }
          },
        });
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
          });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4"><LanguageSelector /></div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <Link to="/" className="text-2xl font-bold text-brand-600">Bill By Billu</Link>
            <p className="text-sm text-gray-500 mt-1">{t('auth.welcomeSub')}</p>
          </div>

          <div className="mb-4">
            <div ref={googleBtnRef} className="w-full" />
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div className="mt-1 text-right">
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">{t('auth.forgotPassword')}</Link>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.noAccount')} <Link to="/register" className="text-brand-600 font-medium hover:underline">{t('auth.createAccount')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
