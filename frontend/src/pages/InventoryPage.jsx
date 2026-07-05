import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { GST_RATES } from '../lib/constants';
import { Package, Plus, X, Trash2, Edit2, AlertTriangle, Download, Search, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStockCount: 0 });
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', sku: '', hsnCode: '', quantity: '', unit: 'NOS',
    costPrice: '', sellPrice: '', gstRate: '18', lowStockThreshold: '10',
  });

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');

  const fetchItems = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    if (lowStockOnly) params.set('lowStock', 'true');
    api.get(`/api/inventory?${params}`)
      .then(d => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    api.get('/api/inventory/stats')
      .then(d => setStats(d))
      .catch(() => {});
  };

  useEffect(() => { fetchItems(); fetchStats(); }, [page, lowStockOnly]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchItems(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', sku: '', hsnCode: '', quantity: '', unit: 'NOS', costPrice: '', sellPrice: '', gstRate: '18', lowStockThreshold: '10' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name, sku: item.sku || '', hsnCode: item.hsnCode || '',
      quantity: String(item.quantity), unit: item.unit,
      costPrice: String(item.costPrice), sellPrice: String(item.sellPrice),
      gstRate: String(item.gstRate), lowStockThreshold: String(item.lowStockThreshold),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku || null,
      hsnCode: form.hsnCode || null,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      costPrice: Number(form.costPrice) || 0,
      sellPrice: Number(form.sellPrice) || 0,
      gstRate: Number(form.gstRate) || 18,
      lowStockThreshold: Number(form.lowStockThreshold) || 10,
    };
    try {
      if (editId) {
        await api.put(`/api/inventory/${editId}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/api/inventory', payload);
        toast.success('Item created');
      }
      setShowForm(false);
      fetchItems();
      fetchStats();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/api/inventory/${id}`);
      toast.success('Item deleted');
      fetchItems();
      fetchStats();
    } catch (err) { toast.error(err.message); }
  };

  const openAdjust = (item) => {
    setAdjustItem(item);
    setAdjustment('');
    setReason('');
    setShowAdjust(true);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const num = Number(adjustment);
    if (!num || !reason.trim()) return toast.error('Enter adjustment and reason');
    try {
      await api.post(`/api/inventory/${adjustItem.id}/adjust`, { adjustment: num, reason: reason.trim() });
      toast.success('Stock adjusted');
      setShowAdjust(false);
      fetchItems();
      fetchStats();
    } catch (err) { toast.error(err.message); }
  };

  const exportCSV = () => {
    const headers = ['Name', 'SKU', 'HSN', 'Qty', 'Unit', 'Cost Price', 'Sell Price', 'GST%', 'Low Stock Threshold'];
    const rows = items.map(i => [i.name, i.sku || '', i.hsnCode || '', i.quantity, i.unit, i.costPrice, i.sellPrice, i.gstRate, i.lowStockThreshold]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold mt-1">₹{Number(stats.totalValue || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className={`text-2xl font-bold mt-1 ${stats.lowStockCount > 0 ? 'text-red-600' : ''}`}>{stats.lowStockCount}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or HSN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={() => setLowStockOnly(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${lowStockOnly ? 'bg-red-50 border-red-300 text-red-600' : 'hover:bg-gray-50'}`}
        >
          <AlertTriangle size={14} /> Low Stock Only
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3" />
            <p>No inventory items found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">HSN</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sell Price</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">GST%</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => {
                const isLow = item.quantity < item.lowStockThreshold;
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      {item.name}
                      {isLow && <span className="ml-2 text-xs text-red-500 font-normal">Low Stock</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.sku || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.hsnCode || '-'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-red-600' : ''}`}>{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-right">₹{Number(item.costPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">₹{Number(item.sellPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center">{item.gstRate}%</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openAdjust(item)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded" title="Adjust Stock"><ArrowUpDown size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 text-brand-500 hover:bg-brand-50 rounded" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3" />
            <p>No inventory items found</p>
          </div>
        ) : (
          items.map(item => {
            const isLow = item.quantity < item.lowStockThreshold;
            return (
              <div key={item.id} className={`bg-white rounded-xl border p-4 ${isLow ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.sku && `SKU: ${item.sku}`}{item.hsnCode && ` | HSN: ${item.hsnCode}`}</p>
                  </div>
                  {isLow && <span className="text-xs text-red-500 font-medium whitespace-nowrap ml-2">Low Stock</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <div><p className="text-xs text-gray-500">Qty</p><p className={`font-medium ${isLow ? 'text-red-600' : ''}`}>{item.quantity} {item.unit}</p></div>
                  <div><p className="text-xs text-gray-500">Cost</p><p className="font-medium">₹{Number(item.costPrice).toFixed(2)}</p></div>
                  <div><p className="text-xs text-gray-500">Sell</p><p className="font-medium">₹{Number(item.sellPrice).toFixed(2)}</p></div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <button onClick={() => openAdjust(item)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"><ArrowUpDown size={12} /> Adjust</button>
                  <button onClick={() => openEdit(item)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100"><Edit2 size={12} /> Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={12} /> Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{editId ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Name *</label>
                  <input className={input} required value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SKU</label>
                  <input className={input} value={form.sku} onChange={set('sku')} placeholder="e.g. PROD-001" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">HSN Code</label>
                  <input className={input} value={form.hsnCode} onChange={set('hsnCode')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                  <input type="number" min="0" className={input} value={form.quantity} onChange={set('quantity')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Unit</label>
                  <select className={input} value={form.unit} onChange={set('unit')}>
                    {['NOS', 'KG', 'MTR', 'LTR', 'BOX', 'PCS', 'SET'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cost Price (₹)</label>
                  <input type="number" min="0" step="0.01" className={input} value={form.costPrice} onChange={set('costPrice')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sell Price (₹)</label>
                  <input type="number" min="0" step="0.01" className={input} value={form.sellPrice} onChange={set('sellPrice')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">GST Rate (%)</label>
                  <select className={input} value={form.gstRate} onChange={set('gstRate')}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Low Stock Threshold</label>
                  <input type="number" min="0" className={input} value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjust && adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdjust(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Adjust Stock</h2>
              <button onClick={() => setShowAdjust(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Item</p>
                <p className="font-medium">{adjustItem.name}</p>
                <p className="text-sm text-gray-500 mt-2">Current Quantity</p>
                <p className="text-2xl font-bold">{adjustItem.quantity} <span className="text-sm font-normal text-gray-500">{adjustItem.unit}</span></p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adjustment (+/-)</label>
                <input
                  type="number"
                  className={input}
                  value={adjustment}
                  onChange={e => setAdjustment(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Use positive to add stock, negative to remove</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reason *</label>
                <input
                  type="text"
                  className={input}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. New shipment, Damaged goods"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjust(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
