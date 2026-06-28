import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Mail, Check, Loader2, Sparkles } from 'lucide-react';

const DISMISS_KEY = 'bb_subscribe_popup_dismissed';
const DISMISS_DAYS = 7; // Don't show again for 7 days

function wasRecentlyDismissed() {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    return (Date.now() - parseInt(val)) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function markDismissed() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

export default function SubscribeModal({ delay = 30000 }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (wasRecentlyDismissed()) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleClose = () => {
    setShow(false);
    markDismissed();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const data = await api.post('/api/subscribers', { email, name: name || undefined, source: 'popup' });
      setStatus('success');
      setMessage(data.message || 'Successfully subscribed!');
      setTimeout(handleClose, 2000);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center">
          <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Stay ahead with Bill By Billu</h2>
          <p className="text-brand-100 text-sm">GST tips, product updates & exclusive offers</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          {status === 'success' ? (
            <div className="flex flex-col items-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Check size={24} className="text-green-600" />
              </div>
              <p className="font-medium text-gray-900">{message}</p>
              <p className="text-sm text-gray-500 mt-1">Welcome aboard!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {status === 'loading' ? 'Subscribing...' : 'Subscribe for Free'}
              </button>
              {status === 'error' && (
                <p className="text-xs text-red-500 text-center">{message}</p>
              )}
              <p className="text-[11px] text-gray-400 text-center">No spam. Unsubscribe anytime.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
