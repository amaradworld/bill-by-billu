import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, MessageSquare, Send, Loader, Check, Copy, Phone, Webhook, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppBotPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, convData] = await Promise.all([
        api.get('/api/whatsapp-bot/config'),
        api.get('/api/whatsapp-bot/conversations').catch(() => ({ conversations: [] })),
      ]);
      setConfig(configData);
      setConversations(convData.conversations || []);
    } catch (err) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (phone) => {
    setSelectedPhone(phone);
    try {
      const data = await api.get(`/api/whatsapp-bot/logs?phoneNumber=${encodeURIComponent(phone)}`);
      setLogs(data.logs || []);
    } catch (err) {
      toast.error('Failed to load logs');
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone) {
      toast.error('Enter a phone number');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/whatsapp-bot/test', {
        phoneNumber: testPhone,
        message: testMessage || undefined,
      });
      toast.success('Test message sent!');
      setTestMessage('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to send test message');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copied!');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/settings')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-green-500" />
          <h1 className="text-2xl font-bold">WhatsApp Bot</h1>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-500" />
          <h2 className="text-lg font-semibold">Setup Instructions</h2>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>1. Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Meta for Business</a> and create a WhatsApp Business API app.</p>
          <p>2. Configure your webhook URL and verify token below.</p>
          <p>3. Subscribe to the <code className="bg-gray-100 px-1 rounded">messages</code> field.</p>
          <p>4. Send a message like <em>"Create invoice for Rahul for 2 shirts at 500 each"</em> to your WhatsApp Business number.</p>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold">Webhook Configuration</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate">
                {config?.webhookUrl || 'Not configured'}
              </code>
              <button
                onClick={() => copyToClipboard(config?.webhookUrl, 'webhook')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied === 'webhook' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Verify Token</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate">
                {config?.verifyToken || 'Not configured'}
              </code>
              <button
                onClick={() => copyToClipboard(config?.verifyToken, 'token')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied === 'token' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config?.apiConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">API Token: {config?.apiConfigured ? 'Configured' : 'Not configured'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config?.phoneNumberId !== 'Not configured' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">Phone Number ID: {config?.phoneNumberId !== 'Not configured' ? 'Set' : 'Not set'}</span>
            </div>
          </div>
        </div>

        {(!config?.apiConfigured || config?.phoneNumberId === 'Not configured') && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Add these environment variables to your backend: <code>WHATSAPP_API_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code>
            </p>
          </div>
        )}
      </div>

      {/* Test Message */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={18} className="text-green-500" />
          <h2 className="text-lg font-semibold">Send Test Message</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number (with country code)</label>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+919876543210"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message (optional)</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test message from Bill By Billu WhatsApp Bot"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <button
            onClick={sendTestMessage}
            disabled={sending || !testPhone}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>

      {/* Example Messages */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Example Messages</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-700">Create invoice with items:</p>
            <p className="text-gray-500 mt-1">"Create invoice for Rahul for 2 shirts at 500 each"</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-700">Simple bill:</p>
            <p className="text-gray-500 mt-1">"Bill to Priya 3 pens at 20"</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-700">With amount:</p>
            <p className="text-gray-500 mt-1">"Invoice for Amit consulting at 5000"</p>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
          </div>
          <button onClick={loadData} className="text-sm text-gray-500 hover:text-gray-700">
            Refresh
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No conversations yet. Send a message to get started.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <button
                key={conv.phoneNumber}
                onClick={() => loadLogs(conv.phoneNumber)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left ${selectedPhone === conv.phoneNumber ? 'bg-green-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Phone size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{conv.phoneNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(conv.lastAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation Logs */}
      {selectedPhone && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Logs — {selectedPhone}</h2>
            <button onClick={() => setSelectedPhone(null)} className="text-sm text-gray-500 hover:text-gray-700">
              Close
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No logs for this number.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex ${log.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      log.direction === 'outbound'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] ${log.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {log.invoiceId && (
                        <span className={`text-[10px] ${log.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                          • Invoice linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
