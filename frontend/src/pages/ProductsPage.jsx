import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', hsnCode: '', unitPrice: '', unit: 'NOS', gstRate: '18', category: '' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e) => {
    e.preventDefault();
    setProducts(prev => [...prev, { ...form, id: Date.now().toString() }]);
    setShowForm(false);
    setForm({ name: '', description: '', hsnCode: '', unitPrice: '', unit: 'NOS', gstRate: '18', category: '' });
    toast.success(t('common.success'));
  };

  const handleDelete = (id) => {
    if (confirm(t('common.confirm'))) setProducts(prev => prev.filter(p => p.id !== id));
  };

  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('product.title')}</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> {t('product.addProduct')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{t('product.addProduct')}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('product.name')} *</label><input className={input} required value={form.name} onChange={set('name')} /></div>
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('product.description')}</label><textarea className={input} rows={2} value={form.description} onChange={set('description')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.hsnCode')}</label><input className={input} value={form.hsnCode} onChange={set('hsnCode')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('product.unitPrice')} *</label><input type="number" min="0" step="0.01" className={input} required value={form.unitPrice} onChange={set('unitPrice')} /></div>
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

      {products.length === 0 ? (
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
                  <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs">{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
