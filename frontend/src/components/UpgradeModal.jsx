import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { X, Check, Zap, Crown, Loader, QrCode, CreditCard, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const UPI_ID = 'paytmqr2810050501014gxg7rktn6w2@paytm';
const UPI_NAME = 'Bill By Billu';

export default function UpgradeModal({ open, onClose, currentPlan = 'FREE' }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('monthly');
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payMethod, setPayMethod] = useState(null); // 'razorpay' or 'upi'
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const plans = [
    {
      key: 'STARTER', name: 'Starter', icon: Zap,
      color: 'text-blue-600', bg: 'bg-blue-50',
      monthly: 299, yearly: 2990,
      features: ['Unlimited invoices', 'GST reports (GSTR-1)', 'Credit/Debit notes', 'Recurring invoices', 'Customer management', 'Product catalog'],
    },
    {
      key: 'PRO', name: 'Pro', icon: Crown,
      color: 'text-amber-600', bg: 'bg-amber-50', popular: true,
      monthly: 799, yearly: 7990,
      features: ['Everything in Starter', 'AI invoice creation', 'AI business insights', 'Payment reminders', 'Multi-user access', 'API access', 'Priority support'],
    },
  ];

  const handleRazorpay = async (plan) => {
    setProcessing(true);
    try {
      const order = await api.post('/api/subscription/create-order', { plan: plan.key, period });
      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Bill By Billu',
        description: `${plan.name} Plan — ${period}`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await api.post('/api/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.key, period,
            });
            toast.success(`Upgraded to ${plan.name}!`);
            onClose(true);
          } catch (err) {
            toast.error('Payment verified but activation failed. Contact support.');
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: plan.key === 'PRO' ? '#F59E0B' : '#3B82F6' },
        modal: { ondismiss: () => setProcessing(false) },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', () => { toast.error('Payment failed.'); setProcessing(false); });
      razorpay.open();
    } catch (err) {
      toast.error(err.message || 'Failed to create payment order');
      setProcessing(false);
    }
  };

  const handleUpiSubmit = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await api.post('/api/subscription/upi-request', {
        plan: selectedPlan.key, period, utrNumber: utr || undefined,
      });
      toast.success('Payment request submitted! We will verify and upgrade you within 24 hours.');
      onClose(true);
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getUpiLink = (plan) => {
    const amount = period === 'yearly' ? plan.yearly : plan.monthly;
    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(plan.name + ' Plan - ' + period)}`;
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => toast.success('UPI ID copied!'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-sm text-gray-500 mt-1">Get unlimited invoices and premium features</p>
            </div>
            <button onClick={() => { setSelectedPlan(null); setPayMethod(null); onClose(); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Payment method selection or Plan selection */}
          {selectedPlan ? (
            <div>
              <button onClick={() => { setPayMethod(null); setUtr(''); }} className="text-sm text-brand-600 hover:underline mb-4">&larr; Back to plans</button>

              {/* Period toggle */}
              <div className="flex items-center gap-2 mb-4 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setPeriod('monthly')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Monthly</button>
                <button onClick={() => setPeriod('yearly')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${period === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Yearly <span className="text-green-600 text-xs">Save 17%</span></button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{selectedPlan.name} Plan ({period})</span>
                  <span className="text-xl font-bold">₹{(period === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {!payMethod ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Choose payment method:</p>
                  <button onClick={() => { setPayMethod('razorpay'); handleRazorpay(selectedPlan); }}
                    className="w-full flex items-center gap-3 p-4 border-2 rounded-xl hover:border-brand-300 transition-colors">
                    <CreditCard size={24} className="text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Pay via Razorpay</div>
                      <div className="text-xs text-gray-500">Cards, UPI, Netbanking — instant activation</div>
                    </div>
                  </button>
                  <button onClick={() => setPayMethod('upi')}
                    className="w-full flex items-center gap-3 p-4 border-2 rounded-xl hover:border-brand-300 transition-colors">
                    <QrCode size={24} className="text-green-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Pay via UPI (Paytm)</div>
                      <div className="text-xs text-gray-500">Scan QR or pay directly — verified within 24 hrs</div>
                    </div>
                  </button>
                </div>
              ) : payMethod === 'upi' ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">Scan this QR code with any UPI app</p>
                    <div className="inline-block bg-white border-2 rounded-xl p-4 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getUpiLink(selectedPlan))}`}
                        alt="UPI QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-lg font-bold mt-3">₹{(period === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Or pay directly to UPI ID:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono bg-white px-3 py-2 border rounded">{UPI_ID}</code>
                      <button onClick={copyUpiId} className="p-2 border rounded-lg hover:bg-white transition-colors">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">UTR / Transaction ID (optional)</label>
                    <input value={utr} onChange={(e) => setUtr(e.target.value)}
                      placeholder="Enter UTR for faster verification"
                      className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>

                  <button onClick={handleUpiSubmit} disabled={submitting}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {submitting ? <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Submitting...</span> : "I've Paid — Submit for Verification"}
                  </button>
                  <p className="text-xs text-center text-gray-400">After payment, submit here. We'll verify and activate within 24 hours.</p>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Period toggle */}
              <div className="flex items-center gap-2 mb-6 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setPeriod('monthly')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Monthly</button>
                <button onClick={() => setPeriod('yearly')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${period === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Yearly <span className="text-green-600 text-xs">Save 17%</span></button>
              </div>

              <div className="space-y-4">
                {plans.map((plan) => {
                  const price = period === 'yearly' ? plan.yearly : plan.monthly;
                  const monthlyEquiv = period === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly;
                  const isCurrent = currentPlan === plan.key;

                  return (
                    <div key={plan.key}
                      className={`relative border-2 rounded-xl p-5 transition-all ${plan.popular ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'} ${isCurrent ? 'opacity-50' : 'hover:shadow-md'}`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${plan.bg}`}><plan.icon size={20} className={plan.color} /></div>
                          <div>
                            <h3 className="font-bold text-gray-900">{plan.name}</h3>
                            <p className="text-sm text-gray-500">{period === 'yearly' ? `₹${monthlyEquiv}/mo billed yearly` : `₹${plan.monthly}/month`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">₹{price.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-gray-400">/{period === 'yearly' ? 'year' : 'month'}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Check size={14} className="text-green-500 shrink-0" />{f}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => { setSelectedPlan(plan); setPayMethod(null); }}
                        disabled={isCurrent}
                        className={`w-full mt-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${plan.popular ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                        {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
