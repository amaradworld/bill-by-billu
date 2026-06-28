import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UpgradeModal from './UpgradeModal';
import { Clock, Zap, X } from 'lucide-react';

export default function TrialBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const trialEndsAt = user?.trialEndsAt;
  if (!trialEndsAt || dismissed) return null;

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  const isTrialOver = daysLeft <= 0;

  // Auto-show upgrade popup after day 10 (days 11-28 remaining = day 18+ of trial)
  useEffect(() => {
    if (daysLeft > 0 && daysLeft <= 18) {
      // Trial started 10+ days ago (28 - 18 = 10)
      const timer = setTimeout(() => setShowUpgrade(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [daysLeft]);

  if (isTrialOver) return null; // Backend handles downgrade

  const isUrgent = daysLeft <= 7;
  const isWarning = daysLeft <= 18; // 10 days into trial

  return (
    <>
      <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 transition-all ${
        isUrgent ? 'bg-red-50 border border-red-200' : isWarning ? 'bg-amber-50 border border-amber-200' : 'bg-brand-50 border border-brand-200'
      }`}>
        <div className={`p-2.5 rounded-xl ${
          isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-brand-100'
        }`}>
          {isWarning ? <Clock size={20} className={isUrgent ? 'text-red-600' : 'text-amber-600'} /> : <Zap size={20} className="text-brand-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${
            isUrgent ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-brand-800'
          }`}>
            {isWarning
              ? `Your PRO trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
              : `You're on a PRO trial — ${daysLeft} days left`
            }
          </p>
          <p className={`text-xs mt-0.5 ${
            isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-brand-600'
          }`}>
            {isWarning
              ? 'Upgrade now to keep PRO features after trial ends'
              : 'Enjoy all PRO features. No credit card required.'
            }
          </p>
        </div>
        {isWarning && (
          <button
            onClick={() => setShowUpgrade(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isUrgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            Upgrade Now
          </button>
        )}
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
          <X size={14} className={isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-brand-400'} />
        </button>
      </div>

      {showUpgrade && <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan="FREE" />}
    </>
  );
}
