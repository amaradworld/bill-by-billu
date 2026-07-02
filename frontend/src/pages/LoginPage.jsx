import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleLogin = async () => {
    try {
      let credential;
      if (isNative) {
        await GoogleAuth.initialize({
          clientId: '349451682504-9d27bma42irec3chj4uimf1klir4oa9g.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
        const result = await GoogleAuth.signIn();
        credential = result.idToken || result.authentication?.idToken;
        if (!credential) {
          toast.error('Google sign-in failed: No ID token received. Try again.');
          return;
        }
      } else {
        return;
      }
      const data = await api.post('/api/auth/google', { credential });
      await Preferences.set({ key: 'bbToken', value: data.token });
      window.location.href = '/app';
    } catch (err) {
      if (err.message !== 'User canceled the Google sign-in flow') {
        toast.error(err.message || 'Google login failed');
      }
    }
  };

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

  // Web: initialize Google GIS button
  useEffect(() => {
    if (isNative) return; // Skip on native — use native plugin

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
        toast.error(err.code ? `${err.message} (code: ${err.code})` : err.message || 'Google login failed');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-end mb-4"><LanguageSelector /></div>
        <div className="glass-strong rounded-3xl shadow-soft-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4">
              <Logo size={56} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">{t('auth.welcomeSub')}</p>
          </div>

          <div className="mb-5">
            {isNative ? (
              <button onClick={handleGoogleLogin}
                className="btn-press w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </button>
            ) : (
              <div ref={googleBtnRef} className="w-full" />
            )}
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white/80 backdrop-blur px-3 text-gray-400">or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus-ring text-sm transition-all duration-200" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus-ring text-sm transition-all duration-200" placeholder="••••••••" />
              <div className="mt-1.5 text-right">
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">{t('auth.forgotPassword')}</Link>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-press w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-glow mt-2">
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.noAccount')} <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">{t('auth.createAccount')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
