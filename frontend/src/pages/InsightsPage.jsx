import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ArrowLeft, TrendingUp, Users, Package, Receipt, Loader, Sparkles, BarChart3, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const QUICK_QUERIES = [
  { icon: TrendingUp, label: 'Today\'s Sales', query: 'today\'s sales', color: 'bg-green-50 text-green-700' },
  { icon: BarChart3, label: 'This Month', query: 'this month', color: 'bg-blue-50 text-blue-700' },
  { icon: Receipt, label: 'Unpaid Invoices', query: 'unpaid invoices', color: 'bg-amber-50 text-amber-700' },
  { icon: Package, label: 'Top Products', query: 'top selling products', color: 'bg-purple-50 text-purple-700' },
  { icon: Users, label: 'Top Customers', query: 'top customers', color: 'bg-pink-50 text-pink-700' },
  { icon: TrendingUp, label: 'Total Revenue', query: 'total revenue', color: 'bg-green-50 text-green-700' },
  { icon: Receipt, label: 'Expenses', query: 'expenses this month', color: 'bg-red-50 text-red-700' },
  { icon: TrendingUp, label: 'Profit/Loss', query: 'profit this month', color: 'bg-emerald-50 text-emerald-700' },
  { icon: Package, label: 'Low Stock', query: 'products to reorder', color: 'bg-orange-50 text-orange-700' },
  { icon: BarChart3, label: 'Sales Comparison', query: 'sales comparison', color: 'bg-indigo-50 text-indigo-700' },
];

export default function InsightsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleQuery = async (q) => {
    const queryText = q || query;
    if (!queryText.trim()) return;

    setLoading(true);
    try {
      const data = await api.post('/api/ai/query', { query: queryText.trim() });
      setResult({ query: queryText.trim(), answer: data.answer, data: data.data });
      setHistory(prev => [{ query: queryText.trim(), answer: data.answer }, ...prev].slice(0, 20));
    } catch (err) {
      toast.error(err.message || 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-amber-500" />
          <h1 className="text-2xl font-bold">Business Insights</h1>
        </div>
      </div>

      {/* Query Input */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder="Ask anything about your business..."
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => handleQuery()}
            disabled={!query.trim() || loading}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Ask
          </button>
        </div>
      </div>

      {/* Quick Query Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_QUERIES.map((q, i) => (
          <button
            key={i}
            onClick={() => { setQuery(q.query); handleQuery(q.query); }}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors hover:opacity-80 disabled:opacity-50 ${q.color}`}
          >
            <q.icon size={16} />
            {q.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <p className="text-xs text-gray-400">Query: {result.query}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{result.answer}</p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">Recent Queries</h2>
          <div className="space-y-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setQuery(h.query); setResult(h); }}
                className="w-full text-left px-4 py-2.5 bg-gray-50 rounded-lg text-sm hover:bg-amber-50 transition-colors"
              >
                <span className="text-gray-400">Q:</span> <span className="text-gray-700">{h.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
