import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { CheckCircle, XCircle, Clock, RefreshCw, CreditCard, User, Mail, Building, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const { admin, logout, getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/payments', { headers: { Authorization: `Bearer ${getToken()}` } });
      setRequests(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/admin/payments/${id}/approve`, {}, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Approved & user upgraded');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/api/admin/payments/${id}/reject`, {}, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const counts = { pending: requests.filter(r => r.status === 'pending').length, approved: requests.filter(r => r.status === 'approved').length, rejected: requests.filter(r => r.status === 'rejected').length };

  const statusBadge = (status) => {
    const styles = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
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
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Admin Panel</h1>
              <p className="text-gray-500 text-xs">Bill By Billu — Payment Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm hidden sm:block">{admin?.email}</span>
            <Link to="/admin/subscribers" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors">
              <Mail size={16} /> Subscribers
            </Link>
            <Link to="/admin/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors">
              <User size={16} /> Users
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
            <p className="text-gray-500 text-xs mt-1">Pending</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{counts.approved}</p>
            <p className="text-gray-500 text-xs mt-1">Approved</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{counts.rejected}</p>
            <p className="text-gray-500 text-xs mt-1">Rejected</p>
          </div>
        </div>

        {/* Filter tabs + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">{counts[f]}</span>}
              </button>
            ))}
          </div>
          <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Requests */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <CreditCard size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No {filter === 'all' ? '' : filter + ' '}payment requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {statusBadge(req.status)}
                      <span className="text-sm font-semibold text-white">{req.plan} Plan ({req.period})</span>
                      <span className="text-lg font-bold text-amber-400">{formatAmount(req.amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User size={14} className="text-gray-600" />
                        <span>{req.user?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} className="text-gray-600" />
                        <span className="truncate">{req.user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building size={14} className="text-gray-600" />
                        <span className="truncate">{req.user?.businessName || '-'}</span>
                      </div>
                      <div className="text-gray-600 text-xs">
                        {new Date(req.createdAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {req.utrNumber && (
                      <div className="mt-2 text-xs text-gray-500">
                        UTR: <span className="font-mono text-gray-400">{req.utrNumber}</span>
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
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
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
    </div>
  );
}
