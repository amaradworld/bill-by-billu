import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';
import UpgradeModal from '../components/UpgradeModal';
import { api } from '../lib/api';
import { Copy, Check, Users, ArrowUpRight, Clock, Upload, X, Image, Lock, FileText, Building2, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isSubscribed, sendTestNotification, getNotificationPrefs, updateNotificationPrefs } from '../lib/notifications';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, token, updateProfile, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '', businessName: '', phone: '', gstNumber: '', panNumber: '',
    address: '', city: '', state: '', pincode: '',
    invoicePrefix: 'INV', currency: 'INR', whatsappNumber: '',
    upiId: '',
    invoiceTemplate: 'classic',
    bankName: '', bankAccount: '', bankIfsc: '', bankBranch: '',
  });
  const [loading, setLoading] = useState(false);
  const [referralStats, setReferralStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [planStatus, setPlanStatus] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const fileInputRef = useRef(null);
  const qrInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '', businessName: user.businessName || '', phone: user.phone || '',
        gstNumber: user.gstNumber || '', panNumber: user.panNumber || '',
        address: user.address || '', city: user.city || '', state: user.state || '', pincode: user.pincode || '',
        invoicePrefix: user.invoicePrefix || 'INV', currency: user.currency || 'INR',
        whatsappNumber: user.whatsappNumber || '',
        upiId: user.upiId || '',
        invoiceTemplate: user.invoiceTemplate || 'classic',
        bankName: user.bankName || '', bankAccount: user.bankAccount || '',
        bankIfsc: user.bankIfsc || '', bankBranch: user.bankBranch || '',
      });
      setLogoPreview(user.logoUrl || null);
      setQrPreview(user.qrUrl || null);
    }
  }, [user]);

  useEffect(() => {
    api.get('/api/auth/referral/stats')
      .then(setReferralStats)
      .catch(() => setReferralStats(null));
    api.get('/api/subscription/status')
      .then(setPlanStatus)
      .catch(() => setPlanStatus(null));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success(t('common.success'));
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be under 2MB');

    setLogoLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        setLogoPreview(base64);
        await api.put('/api/auth/logo', { logoUrl: base64 });
        await refreshUser();
        toast.success('Logo saved');
        setLogoLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err.message || 'Failed to upload logo');
      setLogoLoading(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      await api.delete('/api/auth/logo');
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshUser();
      toast.success('Logo removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove logo');
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 2 * 1024 * 1024) return toast.error('QR image must be under 2MB');

    setQrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        setQrPreview(base64);
        await api.put('/api/auth/qr', { qrUrl: base64 });
        await refreshUser();
        toast.success('QR code saved');
        setQrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err.message || 'Failed to upload QR');
      setQrLoading(false);
    }
  };

  const handleQrDelete = async () => {
    try {
      await api.delete('/api/auth/qr');
      setQrPreview(null);
      if (qrInputRef.current) qrInputRef.current.value = '';
      await refreshUser();
      toast.success('QR code removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove QR');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  };

  const input = "w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  const isPaid = user?.plan !== 'FREE' || (user?.trialEndsAt && new Date(user.trialEndsAt) > new Date());

  return (
    <div className="max-w-3xl space-y-6 pb-24">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">{t('settings.language')}</h2>
        <LanguageSelector />
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4 relative">
        <div className="flex items-center gap-2">
          <Image size={20} className="text-brand-600" />
          <h2 className="font-semibold text-gray-700">Business Logo</h2>
          {!isPaid && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Lock size={12} /> Starter feature
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Upload your business logo to appear on invoices.</p>
        {!isPaid ? (
          <div className="flex items-center gap-4 opacity-60">
            <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
              <Lock size={24} className="text-gray-300" />
            </div>
            <div>
              <button onClick={() => setShowUpgrade(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                <ArrowUpRight size={16} />
                Upgrade to add logo
              </button>
              <p className="text-xs text-gray-400 mt-1">Available on Starter & Growth plans</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain border rounded-lg p-1" />
                <button onClick={handleLogoDelete}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                {logoLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
                ) : (
                  <Image size={24} className="text-gray-300" />
                )}
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
                <Upload size={16} />
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG. Max 2MB.</p>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">{t('settings.profile')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.name')}</label><input className={input} value={form.name} onChange={set('name')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.businessName')}</label><input className={input} value={form.businessName} onChange={set('businessName')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.email')}</label><input type="email" className={input} value={user?.email || ''} disabled /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.phone')}</label><input className={input} value={form.phone} onChange={set('phone')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.gstNumber')}</label><input className={input} value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('auth.panNumber')}</label><input className={input} value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE1234F" /></div>
            <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">{t('customer.address')}</label><input className={input} value={form.address} onChange={set('address')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.city')}</label><input className={input} value={form.city} onChange={set('city')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.state')}</label><input className={input} value={form.state} onChange={set('state')} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">{t('customer.pincode')}</label><input className={input} value={form.pincode} onChange={set('pincode')} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">{t('invoice.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('settings.invoicePrefix')}</label>
              <input className={input} value={form.invoicePrefix} onChange={set('invoicePrefix')} placeholder="INV" />
              <p className="text-xs text-gray-400 mt-1">{t('settings.invoicePrefixHint')}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('settings.currency')}</label>
              <select className={input} value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-brand-600" />
            <h2 className="font-semibold text-gray-700">Invoice Template</h2>
          </div>
          <p className="text-xs text-gray-500">Choose a template style for your invoices.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'classic', name: 'Classic', desc: 'Clean & minimal blue theme', color: 'border-blue-500', preview: 'bg-gradient-to-br from-blue-50 to-white' },
              { key: 'modern', name: 'Modern', desc: 'Purple premium design', color: 'border-purple-500', preview: 'bg-gradient-to-br from-purple-50 to-white' },
              { key: 'compact', name: 'Compact', desc: 'Space-efficient layout', color: 'border-teal-500', preview: 'bg-gradient-to-br from-teal-50 to-white' },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, invoiceTemplate: t.key }))}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  form.invoiceTemplate === t.key
                    ? `${t.color} bg-brand-50 shadow-md`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {form.invoiceTemplate === t.key && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <div className={`w-full h-16 rounded-lg mb-3 ${t.preview} border border-gray-100 flex items-center justify-center`}>
                  <FileText size={24} className={form.invoiceTemplate === t.key ? 'text-brand-600' : 'text-gray-300'} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-brand-600" />
            <h2 className="font-semibold text-gray-700">Bank Details</h2>
          </div>
          <p className="text-xs text-gray-500">Add your bank details to appear on invoices for payment transfers.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
              <input className={input} value={form.bankName} onChange={set('bankName')} placeholder="HDFC Bank" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Account Number</label>
              <input className={input} value={form.bankAccount} onChange={set('bankAccount')} placeholder="50100123456789" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IFSC Code</label>
              <input className={input} value={form.bankIfsc} onChange={set('bankIfsc')} placeholder="HDFC0001234" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Branch</label>
              <input className={input} value={form.bankBranch} onChange={set('bankBranch')} placeholder="Sector 14, Gurgaon" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">WhatsApp Sharing</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('settings.whatsappNumber')}</label>
            <input className={input} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="919876543210" />
            <p className="text-xs text-gray-400 mt-1">{t('settings.whatsappHint')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">UPI Payment</h2>
          <p className="text-xs text-gray-500">Enter your UPI ID to accept payments from buyers. A payment link with exact amount will be generated on invoices.</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">UPI ID</label>
            <input className={input} value={form.upiId || ''} onChange={set('upiId')} placeholder="yourname@upi" />
            <p className="text-xs text-gray-400 mt-1">e.g. 9876543210@paytm, yourname@oksbi, merchant@upi</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4 relative">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-700">Paytm / UPI QR Code</h2>
            {!isPaid && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Lock size={12} /> Starter feature
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Upload your Paytm merchant QR image. This will appear on invoices as a backup payment option.
            For dynamic QR with exact amounts, enter your UPI ID above.
          </p>
          {!isPaid ? (
            <div className="flex items-center gap-4 opacity-60">
              <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                <Lock size={24} className="text-gray-300" />
              </div>
              <div>
                <button onClick={() => setShowUpgrade(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
                  <ArrowUpRight size={16} />
                  Upgrade to add QR code
                </button>
                <p className="text-xs text-gray-400 mt-1">Available on Starter & Growth plans</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {qrPreview ? (
                <div className="relative">
                  <img src={qrPreview} alt="QR Code" className="w-24 h-24 object-contain border rounded-lg p-1" />
                  <button onClick={handleQrDelete}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                  {qrLoading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
                  ) : (
                    <Image size={24} className="text-gray-300" />
                  )}
                </div>
              )}
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
                  <Upload size={16} />
                  {qrPreview ? 'Change QR' : 'Upload QR'}
                  <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG. Max 2MB.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-700 mb-2">{t('settings.plan')}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${(user?.plan || 'FREE') === 'FREE' ? 'bg-gray-100 text-gray-700' : 'bg-brand-100 text-brand-700'}`}>
              {user?.plan || 'FREE'}
            </span>
            {planStatus?.planExpiry && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} /> Expires {new Date(planStatus.planExpiry).toLocaleDateString()}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {planStatus ? `${planStatus.invoicesUsed} / ${planStatus.invoicesLimit === -1 ? '∞' : planStatus.invoicesLimit} invoices this month` : '5 invoices/month'}
            </span>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
          >
            <ArrowUpRight size={16} /> Upgrade
          </button>
        </div>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={(upgraded) => { setShowUpgrade(false); if (upgraded) window.location.reload(); }}
        currentPlan={user?.plan || 'FREE'}
      />

      {referralStats && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-brand-600" />
            <h2 className="font-semibold text-gray-700">Referral Program</h2>
          </div>
          <p className="text-sm text-gray-500">Share your referral code and earn rewards when friends sign up!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your Referral Code</label>
              <div className="flex items-center gap-2">
                <input className={input} value={referralStats.referralCode || ''} readOnly />
                <button onClick={() => copyToClipboard(referralStats.referralCode)}
                  className="p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Referrals Made</label>
              <div className="px-4 py-2.5 border rounded-lg bg-gray-50 text-sm font-semibold">{referralStats.referralCount} friends referred</div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Share Referral Link</label>
            <div className="flex items-center gap-2">
              <input className={input} value={referralStats.referralLink || ''} readOnly />
              <button onClick={() => copyToClipboard(referralStats.referralLink)}
                className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
