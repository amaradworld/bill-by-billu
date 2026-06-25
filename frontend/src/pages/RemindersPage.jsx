import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ArrowLeft, Bell, Send, Copy, Check, Loader, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RemindersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    generateReminders();
  }, []);

  const generateReminders = async () => {
    setGenerating(true);
    try {
      const data = await api.post('/api/ai/reminders', {});
      setReminders(data.reminders || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const copyMessage = (idx, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      toast.success('Copied!');
      setTimeout(() => setCopiedIdx(null), 2000);
    }).catch(() => toast.error('Copy failed'));
  };

  const sendWhatsApp = (phone, message) => {
    if (!phone) {
      toast.error('No phone number available');
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/invoices')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-amber-500" />
          <h1 className="text-2xl font-bold">{t('reminders.title')}</h1>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('reminders.description')}</p>
        <button
          onClick={generateReminders}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {generating ? <Loader size={16} className="animate-spin" /> : <Bell size={16} />}
          {generating ? t('reminders.generating') : t('reminders.refresh')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Bell size={40} className="mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-600 mb-1">{t('reminders.noUnpaid')}</p>
          <p className="text-sm">{t('reminders.allPaid')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((r, idx) => (
            <div key={r.invoiceId} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{r.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{fmt(r.amount)}</p>
                  {r.customerPhone && (
                    <p className="text-xs text-gray-400">{r.customerPhone}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-line">{r.message}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyMessage(idx, r.message)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {copiedIdx === idx ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copiedIdx === idx ? t('reminders.copied') : t('reminders.copy')}
                </button>
                {r.customerPhone && (
                  <button
                    onClick={() => sendWhatsApp(r.customerPhone, r.message)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    <MessageCircle size={14} /> {t('common.whatsapp')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
