import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ArrowLeft, Lock, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, userId, newPassword: password });
      setSuccess(true);
    } catch (err) {
      toast.error(err.message || t('auth.resetTokenInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (!token || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm mb-4">{t('auth.resetTokenInvalid')}</p>
          <Link to="/forgot-password" className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={16} /> {t('common.back')}
          </Link>

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">{t('common.success')}</h1>
              <p className="text-gray-500 text-sm">Your password has been reset successfully.</p>
              <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                {t('auth.login')}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} className="text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold">{t('auth.resetPassword')}</h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.newPassword')}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmNewPassword')}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Lock size={16} />}
                  {loading ? t('common.loading') : t('auth.resetPassword')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
