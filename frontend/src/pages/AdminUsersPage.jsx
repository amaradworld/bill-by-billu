import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../lib/api';
import { User, Mail, Building, Calendar, Crown, Zap, RefreshCw, LogOut, Shield, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { admin, logout, getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [upgrading, setUpgrading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/api/admin/users${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      setUsers(data.users);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleUpgrade = async (userId, plan) => {
    setUpgrading(userId);
    try {
      await api.post('/api/admin/upgrade', { userId, plan, period: 'monthly' }, { headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success(`User upgraded to ${plan}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to upgrade');
    } finally {
      setUpgrading(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const planBadge = (plan, planExpiry) => {
    if (plan === 'PRO') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Crown size={12} /> PRO</span>;
    if (plan === 'STARTER') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Zap size={12} /> STARTER</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">FREE</span>;
  };

  const paidUsers = users.filter(u => u.plan !== 'FREE');
  const freeUsers = users.filter(u => u.plan === 'FREE');

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Admin Panel</h1>
              <p className="text-gray-500 text-xs">All Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm hidden sm:block">{admin?.email}</span>
            <a href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors">
              <CreditCard size={16} /> Payments
            </a>
            <a href="/admin/subscribers" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors">
              <Mail size={16} /> Subscribers
            </a>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-gray-500 text-xs mt-1">Total Users</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{paidUsers.length}</p>
            <p className="text-gray-500 text-xs mt-1">Paid Users</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{freeUsers.length}</p>
            <p className="text-gray-500 text-xs mt-1">Free Users</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 w-full max-w-md">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-600"
            />
          </div>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 transition-colors shrink-0 ml-3">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <User size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className={`bg-gray-900 border rounded-xl p-5 transition-colors ${u.plan !== 'FREE' ? 'border-green-800/50 hover:border-green-700' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {planBadge(u.plan, u.planExpiry)}
                      <span className="font-semibold text-white">{u.name}</span>
                      {u.planExpiry && (
                        <span className="text-xs text-gray-500">
                          Expires: {new Date(u.planExpiry).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} className="text-gray-600" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building size={14} className="text-gray-600" />
                        <span className="truncate">{u.businessName || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={14} className="text-gray-600" />
                        <span>{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  {u.plan === 'FREE' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpgrade(u.id, 'STARTER')}
                        disabled={upgrading === u.id}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {upgrading === u.id ? '...' : '→ Starter'}
                      </button>
                      <button
                        onClick={() => handleUpgrade(u.id, 'PRO')}
                        disabled={upgrading === u.id}
                        className="px-3 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                      >
                        {upgrading === u.id ? '...' : '→ Pro'}
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
