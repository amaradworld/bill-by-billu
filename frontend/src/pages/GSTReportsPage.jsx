import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Download, FileText, BarChart3, ChevronDown, RefreshCw, Building, Users, Receipt, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';

const GST_RATES = [0, 5, 12, 18, 28];

function PeriodSelector({ value, onChange }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    onChange(`${year}-${String(month).padStart(2, '0')}`);
  }, [year, month]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="flex items-center gap-3">
      <select value={month} onChange={e => setMonth(Number(e.target.value))}
        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select value={year} onChange={e => setYear(Number(e.target.value))}
        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
        {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, color }) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t border-gray-200 mt-2 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-medium ${color || 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

export default function GSTReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [tab, setTab] = useState('gstr1');
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r1, r3b] = await Promise.all([
        api.get(`/api/gstr1?period=${period}`),
        api.get(`/api/gstr1/gstr3b?period=${period}`),
      ]);
      setGstr1(r1);
      setGstr3b(r3b);
    } catch (err) {
      toast.error(err.message || 'Failed to load GST data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

  const downloadCSV = () => {
    window.open(`/api/gstr1/export?period=${period}&format=csv`, '_blank');
  };

  const downloadJSON = () => {
    window.open(`/api/gstr1/export?period=${period}&format=json`, '_blank');
  };

  const gstRateSummary = {};
  if (gstr1?.b2b && gstr1?.b2c) {
    [...gstr1.b2b, ...gstr1.b2c].forEach(inv => {
      inv.items.forEach(item => {
        const rate = item.rate || 0;
        if (!gstRateSummary[rate]) gstRateSummary[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
        gstRateSummary[rate].taxable += item.taxableValue;
        gstRateSummary[rate].cgst += item.cgst;
        gstRateSummary[rate].sgst += item.sgst;
        gstRateSummary[rate].igst += item.igst;
        gstRateSummary[rate].count++;
      });
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('gst.title', 'GST Reports')}</h1>
          <p className="text-sm text-gray-500 mt-1">GSTR-1 & GSTR-3B reports ready to file</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button onClick={fetchData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-px">
        {[
          { key: 'gstr1', label: 'GSTR-1', desc: 'Outward Supplies' },
          { key: 'gstr3b', label: 'GSTR-3B', desc: 'Summary Return' },
        ].map(tabItem => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
            className={`px-5 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              tab === tabItem.key
                ? 'bg-white border border-gray-200 border-b-white text-brand-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{tabItem.label}</span>
            <span className="block text-xs text-gray-400">{tabItem.desc}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* GSTR-1 */}
          {tab === 'gstr1' && gstr1 && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Invoices" value={gstr1.summary.totalInvoices} icon={FileText} color="bg-blue-50 text-blue-600" />
                <StatCard label="Taxable Value" value={fmt(gstr1.summary.totalTaxable)} icon={BarChart3} color="bg-green-50 text-green-600" />
                <StatCard label="Total Tax" value={fmt(gstr1.summary.totalTax)} icon={Receipt} color="bg-amber-50 text-amber-600" />
                <StatCard label="B2B / B2C" value={`${gstr1.b2b.length} / ${gstr1.b2c.length}`} icon={Building} color="bg-purple-50 text-purple-600" />
              </div>

              {/* GSTIN & Period */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">GSTIN:</span> <span className="font-medium ml-1">{gstr1.gstin || 'Not set'}</span></div>
                  <div><span className="text-gray-500">Period:</span> <span className="font-medium ml-1">{period}</span></div>
                  <div><span className="text-gray-500">Generated:</span> <span className="font-medium ml-1">{new Date().toLocaleDateString('en-IN')}</span></div>
                </div>
              </div>

              {/* Tax Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Tax Summary</h3>
                <div className="divide-y divide-gray-100">
                  <SummaryRow label="Total Taxable Value" value={fmt(gstr1.summary.totalTaxable)} />
                  <SummaryRow label="CGST" value={fmt(gstr1.summary.totalCgst)} color="text-blue-600" />
                  <SummaryRow label="SGST" value={fmt(gstr1.summary.totalSgst)} color="text-green-600" />
                  <SummaryRow label="IGST" value={fmt(gstr1.summary.totalIgst)} color="text-purple-600" />
                  <SummaryRow label="Total Tax" value={fmt(gstr1.summary.totalTax)} bold />
                </div>
              </div>

              {/* B2B */}
              {gstr1.b2b.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Building size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">B2B — Intra/Inter State (with GSTIN)</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{gstr1.b2b.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-2 font-medium">Invoice #</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Customer</th>
                          <th className="pb-2 font-medium">GSTIN</th>
                          <th className="pb-2 font-medium text-right">Taxable</th>
                          <th className="pb-2 font-medium text-right">CGST</th>
                          <th className="pb-2 font-medium text-right">SGST</th>
                          <th className="pb-2 font-medium text-right">IGST</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstr1.b2b.map((inv, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 font-medium">{inv.invoiceNumber}</td>
                            <td className="py-2 text-gray-600">{inv.invoiceDate}</td>
                            <td className="py-2">{inv.customerName}</td>
                            <td className="py-2 font-mono text-xs text-gray-600">{inv.gstin}</td>
                            <td className="py-2 text-right">{fmt(inv.totalTaxable)}</td>
                            <td className="py-2 text-right text-blue-600">{fmt(inv.cgst)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(inv.sgst)}</td>
                            <td className="py-2 text-right text-purple-600">{fmt(inv.igst)}</td>
                            <td className="py-2 text-right font-medium">{fmt(inv.invoiceValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* B2C */}
              {gstr1.b2c.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900">B2C — Unregistered Customers</h3>
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">{gstr1.b2c.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-2 font-medium">Invoice #</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Customer</th>
                          <th className="pb-2 font-medium text-right">Taxable</th>
                          <th className="pb-2 font-medium text-right">CGST</th>
                          <th className="pb-2 font-medium text-right">SGST</th>
                          <th className="pb-2 font-medium text-right">IGST</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gstr1.b2c.map((inv, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 font-medium">{inv.invoiceNumber}</td>
                            <td className="py-2 text-gray-600">{inv.invoiceDate}</td>
                            <td className="py-2">{inv.customerName || 'Walk-in'}</td>
                            <td className="py-2 text-right">{fmt(inv.totalTaxable)}</td>
                            <td className="py-2 text-right text-blue-600">{fmt(inv.cgst)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(inv.sgst)}</td>
                            <td className="py-2 text-right text-purple-600">{fmt(inv.igst)}</td>
                            <td className="py-2 text-right font-medium">{fmt(inv.invoiceValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* HSN/SAC Breakdown */}
              {Object.keys(gstRateSummary).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">HSN/SAC Summary by GST Rate</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-2 font-medium">GST Rate</th>
                          <th className="pb-2 font-medium text-right">Items</th>
                          <th className="pb-2 font-medium text-right">Taxable</th>
                          <th className="pb-2 font-medium text-right">CGST</th>
                          <th className="pb-2 font-medium text-right">SGST</th>
                          <th className="pb-2 font-medium text-right">IGST</th>
                          <th className="pb-2 font-medium text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(gstRateSummary).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rate, data]) => (
                          <tr key={rate} className="border-b border-gray-50">
                            <td className="py-2 font-medium">{rate}%</td>
                            <td className="py-2 text-right text-gray-600">{data.count}</td>
                            <td className="py-2 text-right">{fmt(data.taxable)}</td>
                            <td className="py-2 text-right text-blue-600">{fmt(data.cgst)}</td>
                            <td className="py-2 text-right text-green-600">{fmt(data.sgst)}</td>
                            <td className="py-2 text-right text-purple-600">{fmt(data.igst)}</td>
                            <td className="py-2 text-right font-medium">{fmt(data.cgst + data.sgst + data.igst)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Download */}
              <div className="flex gap-3">
                <button onClick={downloadCSV}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                  <Download size={16} /> Download CSV
                </button>
                <button onClick={downloadJSON}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Download size={16} /> Download JSON
                </button>
              </div>
            </div>
          )}

          {/* GSTR-3B */}
          {tab === 'gstr3b' && gstr3b && (
            <div className="space-y-6">
              {/* GSTIN & Period */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-500">GSTIN:</span> <span className="font-medium ml-1">{gstr3b.gstin || 'Not set'}</span></div>
                  <div><span className="text-gray-500">Period:</span> <span className="font-medium ml-1">{period}</span></div>
                  <div><span className="text-gray-500">Supplier:</span> <span className="font-medium ml-1">{gstr3b.supplierName}</span></div>
                  <div><span className="text-gray-500">Invoices:</span> <span className="font-medium ml-1">{gstr3b.totalInvoices}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 3.1 Outward Supplies */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowUp size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">3.1 Outward Supplies</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <SummaryRow label="Taxable Outward Supplies" value={fmt(gstr3b.outwardSupplies.taxableOutward)} />
                    <SummaryRow label="Zero-rated Supplies" value={fmt(gstr3b.outwardSupplies.zeroRated)} />
                    <SummaryRow label="Exempt Supplies" value={fmt(gstr3b.outwardSupplies.exempt)} />
                    <SummaryRow label="Nil-rated Supplies" value={fmt(gstr3b.outwardSupplies.nilRated)} />
                    <SummaryRow label="Non-GST Supplies" value={fmt(gstr3b.outwardSupplies.nonGst)} />
                    <SummaryRow label="Total Taxable" value={fmt(gstr3b.outwardSupplies.totalTaxable)} bold />
                  </div>
                </div>

                {/* 3.2 Tax Payable */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt size={18} className="text-amber-600" />
                    <h3 className="font-semibold text-gray-900">3.2 Tax Payable on Outward</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <SummaryRow label="CGST" value={fmt(gstr3b.taxPayable.cgst)} color="text-blue-600" />
                    <SummaryRow label="SGST / UTGST" value={fmt(gstr3b.taxPayable.sgst)} color="text-green-600" />
                    <SummaryRow label="IGST" value={fmt(gstr3b.taxPayable.igst)} color="text-purple-600" />
                    <SummaryRow label="Total Tax" value={fmt(gstr3b.taxPayable.total)} bold />
                  </div>
                </div>

                {/* 4 ITC */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowDown size={18} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900">4 Eligible ITC</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <SummaryRow label="Input CGST" value={fmt(gstr3b.itc.cgst)} color="text-blue-600" />
                    <SummaryRow label="Input SGST" value={fmt(gstr3b.itc.sgst)} color="text-green-600" />
                    <SummaryRow label="Input IGST" value={fmt(gstr3b.itc.igst)} color="text-purple-600" />
                    <SummaryRow label="Total ITC" value={fmt(gstr3b.itc.total)} bold />
                  </div>
                </div>

                {/* 5 Net Tax Payable */}
                <div className="bg-white border-2 border-brand-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-brand-600" />
                    <h3 className="font-semibold text-gray-900">5 Net Tax Payable</h3>
                  </div>
                  <div className="text-center py-6">
                    <p className="text-4xl font-extrabold text-gray-900">{fmt(gstr3b.netTaxPayable)}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {gstr3b.netTaxPayable > 0 ? 'Amount payable to government' : 'Excess ITC — carry forward to next month'}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 mt-4">
                    <SummaryRow label="Total Tax on Outward" value={fmt(gstr3b.taxPayable.total)} />
                    <SummaryRow label="Less: Eligible ITC" value={fmt(gstr3b.itc.total)} color="text-green-600" />
                    <SummaryRow label="Net Tax Payable" value={fmt(gstr3b.netTaxPayable)} bold color={gstr3b.netTaxPayable > 0 ? 'text-red-600' : 'text-green-600'} />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Note:</strong> GSTR-3B is a summary of your outward supplies and ITC. File your return at{' '}
                <a href="https://www.gst.gov.in" target="_blank" rel="noopener noreferrer" className="underline font-medium">gst.gov.in</a>.
                Verify all figures with your CA before filing.
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && tab === 'gstr1' && gstr1 && gstr1.summary.totalInvoices === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium text-gray-500">No invoices for {period}</p>
              <p className="text-sm mt-1">Create invoices to generate GST reports</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
