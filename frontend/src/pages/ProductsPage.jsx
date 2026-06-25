import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Package, Plus, X, Trash2, Edit2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];

export default function ProductsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', hsnCode: '', unitPrice: '', unit: 'NOS', gstRate: '18', category: '' });

  const fetchProducts = () => {
    setLoading(true);
    api.get('/api/products')
      .then(d => setProducts(d.products || []))
      .catch(err => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const classifyTimeout = useRef(null);
  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(f => ({ ...f, name }));

    // Auto-classify HSN/GST after user stops typing
    clearTimeout(classifyTimeout.current);
    if (name.length >= 3) {
      classifyTimeout.current = setTimeout(async () => {
        try {
          const data = await api.post('/api/ai/classify-product', { name });
          setForm(f => ({
            ...f,
            hsnCode: f.hsnCode || data.hsnCode || '',
            gstRate: f.gstRate === '18' ? String(data.gstRate || 18) : f.gstRate,
            category: f.category || data.category || '',
            unit: f.unit === 'NOS' ? (data.unit || 'NOS') : f.unit,
          }));
        } catch {}
      }, 500);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', hsnCode: '', unitPrice: '', unit: 'NOS', gstRate: '18', category: '' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description || '', hsnCode: p.hsnCode || '', unitPrice: String(p.unitPrice), unit: p.unit, gstRate: String(p.gstRate), category: p.category || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, unitPrice: Number(form.unitPrice), gstRate: Number(form.gstRate) };
      if (editId) {
        await api.put(`/api/products/${editId}`, payload);
        toast.success(t('common.success'));
      } else {
        await api.post('/api/products', payload);
        toast.success(t('common.success'));
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirm'))) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) { toast.error(err.message); }
  };

  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('product.title')}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> {t('product.addProduct')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{editId ? t('product.editProduct') : t('product.addProduct')}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('product.name')} *</label>
                  <div className="relative">
                    <input className={input} required value={form.name} onChange={handleNameChange} placeholder="Type product name (AI auto-fills HSN & GST)" />
                    <Sparkles size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400" title="AI auto-classifies HSN & GST rate" />
                  </div>
                </div>
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('product.description')}</label><textarea className={input} rows={2} value={form.description} onChange={set('description')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.hsnCode')}</label><input className={input} value={form.hsnCode} onChange={set('hsnCode')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.unitPrice')} *</label><input type="number" min="0.01" step="0.01" className={input} required value={form.unitPrice} onChange={set('unitPrice')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.unit')}</label>
                  <select className={input} value={form.unit} onChange={set('unit')}>
                    {['NOS','KG','MTR','LTR','BOX','PCS','SET'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.gstRate')} (%)</label>
                  <select className={input} value={form.gstRate} onChange={set('gstRate')}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.category')}</label><input className={input} value={form.category} onChange={set('category')} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3" />
          <p>{t('product.noProducts')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('product.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('product.hsnCode')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('product.unitPrice')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('product.gstRate')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('common.edit')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium">{p.name}</p>{p.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.description}</p>}</td>
                  <td className="px-4 py-3 text-gray-500">{p.hsnCode || '-'}</td>
                  <td className="px-4 py-3 text-right">₹{Number(p.unitPrice).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">{p.gstRate}%</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => openEdit(p)} className="text-brand-500 hover:text-brand-700"><Edit2 size={14} /></button></td>
                  <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
