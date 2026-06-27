import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createWorker } from 'tesseract.js';
import { api } from '../lib/api';
import UpgradePrompt from '../components/UpgradePrompt';
import { Bot, Mic, MicOff, Camera, ArrowLeft, Save, Trash2, Loader, Sparkles, Package, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIInvoicePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [source, setSource] = useState('text');
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [planLimit, setPlanLimit] = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleParse = async () => {
    if (!input.trim() && source === 'text') return;
    setLoading(true);
    try {
      const data = await api.post('/api/ai/parse-invoice', {
        text: input.trim(),
        source,
      });
      setParsed(data);
    } catch (err) {
      toast.error(t('ai.failedToParse'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed) return;
    setCreating(true);
    setPlanLimit(null);
    try {
      const invoice = await api.post('/api/ai/create-invoice', {
        customerId: parsed.customer?.id,
        customerName: parsed.customer?.name,
        items: parsed.items,
      });
      toast.success(t('ai.invoiceCreated'));
      navigate('/app/invoices');
    } catch (err) {
      if (err.message?.includes('limit') || err.message?.includes('Free plan')) {
        setPlanLimit({ used: 10, limit: 10 });
      } else {
        toast.error(t('ai.failedToCreate'));
      }
    } finally {
      setCreating(false);
    }
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error(t('common.voiceNotSupported'));
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setSource('text');
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setSource('ocr');
    setOcrRunning(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      if (text && text.trim().length > 5) {
        setInput(text.trim());
        toast.success('OCR complete! Review the parsed text below.');
      } else {
        setInput('');
        toast.error('Could not read text from image. Try a clearer photo.');
      }
    } catch (err) {
      toast.error('OCR failed. Please type the text manually.');
    } finally {
      setOcrRunning(false);
      setOcrProgress(0);
    }
  };

  const updateItem = (idx, key, value) => {
    setParsed(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (idx) => {
    setParsed(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/invoices')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-amber-500" />
          <h1 className="text-2xl font-bold">{t('ai.title')}</h1>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={20} className="text-amber-600" />
          <span className="font-semibold text-amber-800">{t('ai.describeInvoice')}</span>
        </div>

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Examples:\n• Create invoice for Rahul Traders, 10 T-shirts at ₹450 each and 5 jeans at ₹1,200\n• Bill Sharma Enterprises 20 black shirts and 10 blue jeans\n• Need 5 laptops for Gupta & Sons`}
            className="flex-1 px-4 py-3 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            rows={4}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={startVoice}
            disabled={listening}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listening ? 'bg-red-500 text-white' : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {listening ? <MicOff size={16} className="animate-pulse" /> : <Mic size={16} />}
            {listening ? t('common.listening') : t('common.voiceInput')}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100"
          >
            <Camera size={16} /> {t('ai.uploadImage')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          <button
            onClick={handleParse}
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? t('ai.parsing') : t('ai.parseInvoice')}
          </button>
        </div>

        {imagePreview && (
          <div className="mt-3 space-y-2">
            <img src={imagePreview} alt="Uploaded order" className="max-h-40 rounded-lg border" />
            {ocrRunning && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2">
                <Loader size={14} className="animate-spin text-blue-500" />
                <div className="flex-1">
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium">{ocrProgress}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parsed Result */}
      {parsed && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Package size={18} /> {t('ai.parsedInvoice')}
              {parsed.source === 'whatsapp' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('ai.sourceWhatsApp')}</span>}
              {parsed.source === 'ocr' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('ai.sourceOCR')}</span>}
            </h2>

            {parsed.customer && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-medium">{parsed.customer.name}</p>
                {parsed.customer.id && <span className="text-xs text-green-600">✓ {t('ai.matchedFromCustomers')}</span>}
              </div>
            )}

            <div className="space-y-3">
              {parsed.items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      {item.matched && <span className="text-xs text-green-600">✓ {t('ai.productMatched')}</span>}
                      {parsed.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Name</label>
                      <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Qty</label>
                      <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Price (₹)</label>
                      <input type="number" value={item.unitPrice || ''} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded text-sm" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">GST %</label>
                      <select value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border rounded text-sm">
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                  </div>
                  {item.hsnCode && <p className="text-xs text-gray-400">HSN: {item.hsnCode}</p>}
                  <div className="text-right text-sm text-gray-500">
                    Line Total: <span className="font-semibold text-gray-900">
                      {fmt(item.quantity * (item.unitPrice || 0) * (1 + item.gstRate / 100))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>{t('ai.grandTotal')}</span>
                <span className="text-amber-600">
                  {fmt(parsed.items.reduce((s, i) => s + i.quantity * (i.unitPrice || 0) * (1 + i.gstRate / 100), 0))}
                </span>
              </div>
            </div>
          </div>

          {planLimit && <div className="mb-4"><UpgradePrompt used={planLimit.used} limit={planLimit.limit} /></div>}

          <div className="flex justify-end gap-3">
            <button onClick={() => setParsed(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              {t('ai.startOver')}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || parsed.items.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              {creating ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {creating ? t('ai.creating') : t('ai.createInvoice')}
            </button>
          </div>
        </div>
      )}

      {/* Example Queries */}
      {!parsed && !loading && (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">{t('ai.tryExamples')}</h2>
          <div className="space-y-2">
            {[
              'Create invoice for Rahul Traders, 10 T-shirts at ₹450 each and 5 jeans at ₹1,200',
              'Bill Sharma Enterprises 20 black shirts and 10 blue jeans',
              'Generate invoice for Gupta & Sons 5 laptops at ₹45,000 and 10 mouse at ₹500',
              'Need 20 formal shirts and 15 trousers for Mehta Trading',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setInput(example)}
                className="w-full text-left px-4 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
