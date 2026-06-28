import { useState } from 'react';
import { api } from '../lib/api';
import { Check, Loader2 } from 'lucide-react';

export default function SubscribeForm({ source = 'landing_page', compact = false }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const data = await api.post('/api/subscribers', { email, name: name || undefined, source });
      setStatus('success');
      setMessage(data.message || 'Successfully subscribed!');
      setEmail('');
      setName('');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl text-sm font-medium">
        <Check size={16} />
        {message}
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Subscribe'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
      <input
        type="text"
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-500">{message}</p>
      )}
    </form>
  );
}
