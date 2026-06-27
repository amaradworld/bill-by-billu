import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { CheckCircle, XCircle, Clock, RefreshCw, CreditCard, User, Mail, Building } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/subscription/requests');
      setRequests(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/subscription/approve/${id}`);
      toast.success('Payment approved & user upgraded!');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/api/subscription/reject/${id}`);
      toast.success('Payment rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const icons = { pending: Clock, approved: CheckCircle, rejected: XCircle };
    const Icon = icons[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon size={12} /> {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatAmount = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')} — Payment Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage UPI payment requests and upgrade users</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                {requests.filter(r => r.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CreditCard size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No {filter === 'all' ? '' : filter + ' '}payment requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {statusBadge(req.status)}
                    <span className="text-sm font-semibold text-gray-900">{req.plan} Plan ({req.period})</span>
                    <span className="text-lg font-bold text-gray-900">{formatAmount(req.amount)}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} className="text-gray-400" />
                      <span>{req.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={14} className="text-gray-400" />
                      <span className="truncate">{req.user?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building size={14} className="text-gray-400" />
                      <span className="truncate">{req.user?.businessName || '-'}</span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(req.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {req.utrNumber && (
                    <div className="mt-2 text-xs text-gray-500">
                      UTR: <span className="font-mono text-gray-700">{req.utrNumber}</span>
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button onClick={() => handleReject(req.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
