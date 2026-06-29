import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { X, Check, Zap, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpgradeModal({ open, onClose, currentPlan = 'FREE' }) {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const plans = [
    {
      key: 'STARTER', name: 'Starter', icon: Zap,
      color: 'text-blue-600', bg: 'bg-blue-50',
      monthly: 199, yearly: 1990,
      features: ['100 invoices/month', 'GST reports (GSTR-1)', 'Credit/Debit notes', 'Recurring invoices', 'Customer management', 'Product catalog'],
    },
    {
      key: 'GROWTH', name: 'Growth', icon: Crown,
      color: 'text-amber-600', bg: 'bg-amber-50', popular: true,
      monthly: 399, yearly: 3990,
      features: ['1,000 invoices/month', 'AI invoice creation', 'AI business insights', 'Payment reminders', 'Multi-user access', 'Priority support'],
    },
  ];

  const handleRazorpay = async (plan) => {
    if (processing) return;
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
            await refreshUser();
            toast.success(`Upgraded to ${plan.name}!`);
            onClose(true);
          } catch (err) {
            toast.error('Payment verified but activation failed. Contact support.');
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: plan.key === 'GROWTH' ? '#F59E0B' : '#3B82F6' },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-sm text-gray-500 mt-1">Get unlimited invoices and premium features</p>
            </div>
            <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

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
                    onClick={() => handleRazorpay(plan)}
                    disabled={isCurrent || processing}
                    className={`w-full mt-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${plan.popular ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {isCurrent ? 'Current Plan' : processing ? 'Processing...' : `Pay ₹${price.toLocaleString('en-IN')} — Upgrade to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
