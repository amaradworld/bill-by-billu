import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { Mail, Users, UserX, Search, Download, Trash2, LogOut, Shield, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSubscribersPage() {
  const { admin, logout, getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchSubscribers = async (page = 1, status = filter, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (status !== 'all') params.set('status', status);
      if (q) params.set('search', q);
      const data = await api.get(`/api/admin/subscribers?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      setSubscribers(data.subscribers);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSubscribers(1, filter, search);
  };

  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    fetchSubscribers(1, newFilter, search);
  };

  const handlePage = (page) => fetchSubscribers(page, filter, search);

  const handleDelete = async (id, email) => {
    if (!confirm(`Remove ${email}?`)) return;
    try {
      await api.delete(`/api/admin/subscribers/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Removed');
      fetchSubscribers(pagination.page, filter, search);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Email', 'Name', 'Source', 'Status', 'Subscribed At'],
      ...subscribers.map(s => [s.email, s.name || '', s.source, s.active ? 'Active' : 'Unsubscribed', new Date(s.createdAt).toLocaleDateString('en-IN')])
    ].map(row => row.map(c => `"${c}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-500" />
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <span className="text-xs text-gray-500">/ Subscribers</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors">
              <CreditCard size={16} /> Payments
            </a>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Subscribers', value: stats.total, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Active', value: stats.active, icon: Mail, color: 'text-green-400 bg-green-500/10' },
            { label: 'Unsubscribed', value: stats.unsubscribed, icon: UserX, color: 'text-red-400 bg-red-500/10' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${color}`}><Icon size={16} /></div>
                <span className="text-sm text-gray-400">{label}</span>
              </div>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter + Export */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm hover:bg-gray-700 transition-colors">Search</button>
          </form>
          <div className="flex gap-2">
            {['all', 'active', 'unsubscribed'].map((f) => (
              <button key={f} onClick={() => handleFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button onClick={handleExport} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors">
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Subscriber List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Mail size={48} className="mx-auto mb-4 opacity-30" />
            <p>No subscribers found</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-white">{s.email}</td>
                    <td className="px-5 py-3 text-gray-400">{s.name || '-'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-gray-800 text-gray-400">{s.source}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {s.active ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(s.id, s.email)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
                  <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
                    className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
