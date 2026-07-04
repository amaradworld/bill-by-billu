import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Upload, FileText, Users, Package, Download, CheckCircle, AlertCircle, X, ArrowUpCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'tally', label: 'Tally Import', icon: ArrowUpCircle },
  { key: 'zoho', label: 'Zoho Import', icon: ArrowUpCircle },
];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = false; }
        } else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

function FileDropZone({ onFile, accept }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
        dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-brand-500' : 'text-gray-300'}`} />
      <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
      <p className="text-xs text-gray-400 mt-1">CSV or JSON files up to 5MB</p>
    </div>
  );
}

function PreviewTable({ headers, rows, maxRows = 5 }) {
  if (!headers.length) return null;
  const preview = rows.slice(0, maxRows);
  return (
    <div className="overflow-x-auto mt-4 rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {headers.map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i} className="border-t border-gray-50">
              {headers.map(h => (
                <td key={h} className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{row[h] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50">...and {rows.length - maxRows} more rows</p>
      )}
    </div>
  );
}

function ImportResults({ result }) {
  if (!result) return null;
  return (
    <div className={`mt-4 p-4 rounded-xl border ${result.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {result.errors.length > 0 ? (
          <AlertCircle size={18} className="text-amber-600" />
        ) : (
          <CheckCircle size={18} className="text-green-600" />
        )}
        <span className="font-semibold text-sm">Import Complete</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-green-700">{result.imported} imported</span>
        <span className="text-gray-500">{result.skipped} skipped (duplicates)</span>
        {result.errors.length > 0 && <span className="text-amber-700">{result.errors.length} errors</span>}
      </div>
      {result.errors.length > 0 && (
        <div className="mt-3 space-y-1">
          {result.errors.slice(0, 5).map((err, i) => (
            <p key={i} className="text-xs text-amber-700">{err}</p>
          ))}
          {result.errors.length > 5 && <p className="text-xs text-amber-500">...and {result.errors.length - 5} more</p>}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const historyKey = `import_history_${user?.id || 'anon'}`;
  const [activeTab, setActiveTab] = useState('customers');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch { return []; }
  });

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (f.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          const rows = Array.isArray(data) ? data : data.customers || data.products || data.invoices || [];
          if (rows.length > 0) {
            const headers = Object.keys(rows[0]);
            setPreview({ headers, rows });
          }
        } catch { toast.error('Invalid JSON file'); setFile(null); }
      } else {
        const parsed = parseCSV(text);
        setPreview(parsed);
      }
    };
    reader.readAsText(f);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`/api/import/template/${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Failed to download template'); }
  };

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = activeTab === 'tally' ? '/api/import/tally'
        : activeTab === 'zoho' ? '/api/import/zoho'
        : `/api/import/${activeTab}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setResult(data);
      const entry = { type: activeTab, file: file.name, date: new Date().toLocaleString(), ...data };
      const newHistory = [entry, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      toast.success(`Imported ${data.imported} items`);
    } catch (err) { toast.error(err.message); }
    finally { setImporting(false); }
  };

  const clearFile = () => { setFile(null); setPreview({ headers: [], rows: [] }); setResult(null); };

  const TAB_DESCRIPTIONS = {
    customers: 'Import your customer list. Match columns: name, email, phone, GST number, address, city, state, pincode, type.',
    products: 'Import products/services. Match columns: name, SKU, HSN code, price, GST rate, unit.',
    invoices: 'Import past invoices. Match columns: invoice number, customer name/email, date, items (JSON), amounts.',
    tally: 'Export your data from Tally as XML (Gateway of Tally > Export > XML). Upload the XML file to import ledger accounts as customers and stock items as products.',
    zoho: 'Export from Zoho Books/Invoice (CSV format). Auto-maps common Zoho column names to our fields.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.import') || 'Data Import'}</h1>
        <p className="text-sm text-gray-500 mt-1">Import customers, products, and invoices from CSV files or other platforms.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); clearFile(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500">{TAB_DESCRIPTIONS[activeTab]}</p>

      {/* Actions row */}
      <div className="flex items-center gap-3">
        {['customers', 'products', 'invoices'].includes(activeTab) && (
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
            <Download size={16} />
            Download Template
          </button>
        )}
      </div>

      {/* File upload */}
      {!file ? (
        <FileDropZone onFile={handleFile} accept={activeTab === 'tally' ? '.xml' : '.csv,.json'} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <FileText size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · {preview.rows.length} rows</p>
              </div>
            </div>
            <button onClick={clearFile} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} className="text-gray-400" /></button>
          </div>

          <PreviewTable headers={preview.headers} rows={preview.rows} />

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={doImport}
              disabled={importing || preview.rows.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? 'Importing...' : `Import ${preview.rows.length} Rows`}
            </button>
            <button onClick={clearFile} className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <ImportResults result={result} />

      {/* Import History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Recent Imports</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 rounded-md capitalize">{h.type}</span>
                  <span className="text-gray-600">{h.file}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="text-green-600">{h.imported} imported</span>
                  <span>{h.skipped} skipped</span>
                  <span>{h.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
