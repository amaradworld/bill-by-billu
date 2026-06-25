import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Loader, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={16} /> {t('common.back')}
          </Link>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">{t('auth.resetPassword')}</h1>
              <p className="text-gray-500 text-sm">{t('auth.passwordResetSent')}</p>
              <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold">{t('auth.forgotPassword')}</h1>
                <p className="text-gray-500 text-sm mt-2">{t('auth.resetPasswordDesc')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Mail size={16} />}
                  {loading ? t('common.loading') : t('auth.sendResetLink')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
