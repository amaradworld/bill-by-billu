import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Receipt, Plus, X, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Rent', 'Utilities', 'Travel', 'Office Supplies', 'Professional Services', 'Marketing', 'Software', 'Miscellaneous'];

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Miscellaneous', gstRate: '18', isDeductible: true });

  const fetchExpenses = () => {
    setLoading(true);
    api.get('/api/expenses')
      .then(d => setExpenses(d.expenses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [token]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => {
    setEditId(null);
    setForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Miscellaneous', gstRate: '18', isDeductible: true });
    setShowForm(true);
  };

  const openEdit = (e) => {
    setEditId(e.id);
    setForm({
      date: e.date?.split('T')[0] || '', description: e.description, amount: String(e.amount),
      category: e.category || 'Miscellaneous', gstRate: String(e.gstRate), isDeductible: e.isDeductible,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: Number(form.amount), gstRate: Number(form.gstRate) };
      if (editId) {
        await api.put(`/api/expenses/${editId}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      toast.success(t('common.success'));
      setShowForm(false);
      fetchExpenses();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirm'))) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) { toast.error(err.message); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const input = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('expense.title')}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          <Plus size={16} /> {t('expense.addExpense')}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">{editId ? t('common.edit') : t('expense.addExpense')}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">{t('expense.date')} *</label><input type="date" className={input} required value={form.date} onChange={set('date')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('expense.amount')} *</label><input type="number" min="0.01" step="0.01" className={input} required value={form.amount} onChange={set('amount')} /></div>
                <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('expense.description')} *</label><input className={input} required value={form.description} onChange={set('description')} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('expense.category')}</label>
                  <select className={input} value={form.category} onChange={set('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">{t('expense.gstRate')} (%)</label>
                  <select className={input} value={form.gstRate} onChange={set('gstRate')}>
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="deductible" checked={form.isDeductible} onChange={set('isDeductible')} className="rounded" />
                  <label htmlFor="deductible" className="text-sm text-gray-600">{t('expense.isDeductible')}</label>
                </div>
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
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Receipt size={40} className="mx-auto mb-3" />
          <p>{t('expense.noExpenses')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('expense.date')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('expense.description')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('expense.category')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('expense.amount')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('expense.gstAmount')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('common.edit')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('common.delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 text-gray-500">{e.category || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(Number(e.amount))}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(Number(e.gstAmount))}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => openEdit(e)} className="text-brand-500 hover:text-brand-700"><Edit2 size={14} /></button></td>
                  <td className="px-4 py-3 text-center"><button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
