import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Bot, Send, Mic, MicOff, Image, X, Sparkles, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAssistant() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your AI billing assistant. I can:\n\n• Create invoices from text\n• Answer business questions\n• Suggest products\n• Generate payment reminders\n\nTry: "Create invoice for Rahul, 10 shirts at ₹450"' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const lower = text.toLowerCase();

      // Invoice creation
      if (lower.includes('create') && (lower.includes('invoice') || lower.includes('bill'))) {
        const parsed = await api.post('/api/ai/parse-invoice', { text: text.trim() });
        const items = parsed.items || [];
        const customer = parsed.customer;

        if (items.length === 0) {
          setMessages(prev => [...prev, { role: 'assistant', text: 'I couldn\'t parse any items from your message. Try: "Create invoice for Rahul Traders, 10 T-shirts at ₹450 each, 5 jeans at ₹1200"' }]);
        } else {
          const itemSummary = items.map(i => `• ${i.name}: ${i.quantity} × ₹${i.unitPrice || '?'} = ₹${(i.quantity * (i.unitPrice || 0)).toLocaleString('en-IN')}`).join('\n');
          const total = items.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0);

          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Got it! Here's what I parsed:\n\nCustomer: ${customer?.name || 'Walk-in'}\n\nItems:\n${itemSummary}\n\nTotal: ₹${total.toLocaleString('en-IN')}\n\nClick below to create this invoice.`,
            action: { type: 'create-invoice', data: parsed },
          }]);
        }
      }
      // Product suggestions
      else if (lower.includes('suggest') || lower.includes('what should') || lower.includes('need') || lower.includes('want')) {
        const data = await api.post('/api/ai/suggest-products', { description: text.trim() });
        const suggestions = data.suggestions || [];

        if (suggestions.length === 0) {
          setMessages(prev => [...prev, { role: 'assistant', text: 'I couldn\'t find product suggestions for that. Try describing the occasion or category (e.g., "men\'s formal outfit", "summer clothing").' }]);
        } else {
          const list = suggestions.map(s => {
            const price = s.existing ? ` — ₹${s.existing.price}` : '';
            const matched = s.existing ? ' ✓' : '';
            return `• ${s.name}${price}${matched}`;
          }).join('\n');
          setMessages(prev => [...prev, { role: 'assistant', text: `Here are my suggestions:\n\n${list}\n\n(✓ = already in your products)` }]);
        }
      }
      // Business queries
      else if (lower.includes('unpaid') || lower.includes('pending') || lower.includes('due') ||
               lower.includes('today') || lower.includes('month') || lower.includes('week') ||
               lower.includes('top') || lower.includes('best') || lower.includes('total') ||
               lower.includes('revenue') || lower.includes('sales') || lower.includes('profit') ||
               lower.includes('expense') || lower.includes('customer') || lower.includes('product') ||
               lower.includes('stock') || lower.includes('overview') || lower.includes('summary') ||
               lower.includes('status') || lower.includes('report')) {
        const data = await api.post('/api/ai/query', { query: text.trim() });
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      }
      // Payment reminders
      else if (lower.includes('remind') || lower.includes('reminder')) {
        const data = await api.post('/api/ai/reminders', {});
        const reminders = data.reminders || [];

        if (reminders.length === 0) {
          setMessages(prev => [...prev, { role: 'assistant', text: 'No unpaid invoices to remind about. All clear!' }]);
        } else {
          const list = reminders.map(r => `• ${r.invoiceNumber} — ${r.customerName} — ₹${r.amount.toLocaleString('en-IN')}`).join('\n');
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Found ${reminders.length} unpaid invoice(s):\n\n${list}\n\nReminders generated! You can copy and send them.`,
            action: { type: 'reminders', data: reminders },
          }]);
        }
      }
      // Help
      else if (lower.includes('help') || lower.includes('what can')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: 'I can help with:\n\n📝 **Create Invoice**\n"Create invoice for Rahul, 10 shirts at ₹450"\n\n📊 **Business Queries**\n"Unpaid invoices", "Today\'s sales", "Top products"\n\n🛒 **Product Suggestions**\n"Suggest products for men\'s formal outfit"\n\n💰 **Payment Reminders**\n"Generate payment reminders"\n\n🔍 **HSN/GST Lookup**\n"What\'s the HSN code for shirts?"',
        }]);
      }
      // Default
      else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: 'I\'m not sure what you mean. Try:\n\n• "Create invoice for [customer], [qty] [item] at ₹[price]"\n• "Unpaid invoices" or "Today\'s sales"\n• "Suggest products for men\'s formal outfit"\n• "Generate payment reminders"',
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (parsedData) => {
    try {
      setLoading(true);
      const invoice = await api.post('/api/ai/create-invoice', {
        customerId: parsedData.customer?.id,
        customerName: parsedData.customer?.name,
        items: parsedData.items,
      });
      setMessages(prev => [...prev, { role: 'assistant', text: `Invoice ${invoice.invoiceNumber} created! Total: ₹${Number(invoice.totalAmount).toLocaleString('en-IN')}. Go to Invoices to view and send it.` }]);
      toast.success('Invoice created!');
    } catch (err) {
      if (err.message?.includes('limit') || err.message?.includes('Free plan')) {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Free plan limit reached (10 invoices/month). Upgrade to Starter for unlimited invoices.', action: { type: 'upgrade' } }]);
      } else {
        toast.error(err.message || 'Failed to create invoice');
        setMessages(prev => [...prev, { role: 'assistant', text: 'Failed to create invoice. ' + (err.message || '') }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
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
      setListening(false);
      sendMessage(transcript);
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

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group hover:scale-105"
          title="AI Assistant"
        >
          <Bot size={24} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[550px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-white/80">Ask me anything about your business</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.text}
                  {msg.action?.type === 'create-invoice' && (
                    <button
                      onClick={() => handleCreateInvoice(msg.action.data)}
                      disabled={loading}
                      className="mt-2 w-full px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Invoice'}
                    </button>
                  )}
                  {msg.action?.type === 'upgrade' && (
                    <button
                      onClick={() => window.location.href = '/app/settings'}
                      className="mt-2 w-full px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-lg hover:from-amber-600 hover:to-orange-600"
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <Loader size={16} className="animate-spin text-amber-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={listening ? stopVoice : startVoice}
              className={`p-2.5 rounded-full transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              title={listening ? 'Stop listening' : 'Voice input'}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
