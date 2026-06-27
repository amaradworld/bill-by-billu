import { useState } from 'react';
import UpgradeModal from './UpgradeModal';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';

export default function UpgradePrompt({ used = 10, limit = 10, onUpgrade }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Free plan limit reached</p>
            <p className="text-xs text-gray-500">{used} / {limit} invoices used this month. Upgrade for unlimited.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm whitespace-nowrap"
        >
          <ArrowUpRight size={16} /> Upgrade
        </button>
      </div>
      <UpgradeModal
        open={showModal}
        onClose={(upgraded) => { setShowModal(false); if (upgraded && onUpgrade) onUpgrade(); }}
        currentPlan="FREE"
      />
    </>
  );
}
