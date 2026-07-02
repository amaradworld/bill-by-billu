import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, BarChart3, MessageCircle, CreditCard, Receipt, Globe, ChevronDown, ChevronUp, ArrowRight, Check, Star, Play, Calendar, Mail, X, Shield, Zap, Users, Clock, TrendingUp } from 'lucide-react';
import SubscribeForm from '../components/SubscribeForm';
import SubscribeModal from '../components/SubscribeModal';
import Logo from '../components/Logo';

const trackEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

const features = [
  { icon: FileText, title: 'Invoice Creation', desc: 'Create professional GST-compliant invoices in seconds with auto-calculations and custom branding.' },
  { icon: BarChart3, title: 'GST Reports', desc: 'Generate GSTR-1, GSTR-3B reports ready to file. Auto-categorized by HSN/SAC codes.' },
  { icon: MessageCircle, title: 'WhatsApp Sharing', desc: 'Share invoices directly via WhatsApp Business API. Your clients get PDF invoices instantly.' },
  { icon: CreditCard, title: 'UPI Payments', desc: 'Accept UPI payments with QR codes embedded in invoices. Get paid faster.' },
  { icon: Receipt, title: 'Expense Tracking', desc: 'Track business expenses with GST input credit. AI auto-categorization for tax savings.' },
  { icon: Globe, title: 'Multi-Language', desc: 'Invoice in 9 Indian languages — Hindi, Tamil, Telugu, Bengali, Marathi, and more.' },
];

const steps = [
  { num: '1', title: 'Create', desc: 'Add your items, customer details, and GST. We handle the math.' },
  { num: '2', title: 'Share', desc: 'Send via WhatsApp, email, or download PDF. One tap sharing.' },
  { num: '3', title: 'Get Paid', desc: 'Accept UPI payments, track status, and file GST returns automatically.' },
];

const demoSteps = [
  {
    tab: 'Create Invoice',
    icon: FileText,
    title: 'Create invoices in seconds',
    desc: 'Just fill in the details — customer, items, quantities, and GST rates. Everything calculates automatically.',
    bullets: [
      'Auto-calculates CGST + SGST or IGST',
      'Supports HSN/SAC codes for all items',
      'Custom invoice prefix and numbering',
      'Multiple templates: Classic, Modern, Compact',
    ],
  },
  {
    tab: 'GST Reports',
    icon: BarChart3,
    title: 'GSTR-1 ready to file',
    desc: 'All your invoice data is automatically organized into GST return formats. Export and upload to the GST portal.',
    bullets: [
      'GSTR-1 auto-generated from invoices',
      'GSTR-3B summary with tax breakup',
      'Filter by period, customer, or HSN',
      'CSV and JSON export for portal upload',
    ],
  },
  {
    tab: 'Share & Get Paid',
    icon: MessageCircle,
    title: 'Share via WhatsApp instantly',
    desc: 'Send professional PDF invoices directly to your customers on WhatsApp. Include a UPI payment link for instant collection.',
    bullets: [
      'One-tap WhatsApp sharing',
      'PDF invoice with your branding',
      'UPI payment link embedded',
      'Payment status tracking',
    ],
  },
  {
    tab: 'AI Assistant',
    icon: Zap,
    title: 'AI-powered invoice creation',
    desc: 'Just speak or type naturally — our AI understands and creates the invoice for you. No manual data entry needed.',
    bullets: [
      'Voice-to-invoice: "Bill to Priya, 5 kurtas at 800"',
      'Photo OCR: snap a handwritten bill',
      'Smart customer creation',
      'Automatic GST rate detection',
    ],
  },
];

const plans = [
  { name: 'Free', price: '₹0', period: '/month', desc: 'Perfect for trying out', features: ['5 invoices/month', 'Basic GST calculation', 'WhatsApp sharing', '1 user'], cta: 'Start Free', highlight: false },
  { name: 'Starter', price: '₹199', period: '/month', yearly: '₹1,887/yr', desc: 'For growing freelancers', features: ['100 invoices/month', 'GST reports (GSTR-1)', 'Expense tracking', 'Credit/Debit notes', 'Custom branding'], cta: 'Get Starter', highlight: true },
  { name: 'Growth', price: '₹399', period: '/month', yearly: '₹3,783/yr', desc: 'For teams & agencies', features: ['500 invoices/month', 'AI invoice creation', 'Multi-user access', 'AI business insights', 'Priority support'], cta: 'Get Growth', highlight: false },
];

const testimonials = [
  { name: 'Priya Sharma', role: 'Freelance Designer, Mumbai', text: 'Bill By Billu saved me 5 hours every week on invoicing. The WhatsApp sharing feature is a game-changer — my clients love getting invoices instantly.', avatar: 'PS' },
  { name: 'Rajesh Kumar', role: 'Owner, TechSolutions Pvt Ltd, Bangalore', text: 'Switched from Zoho Invoice. The GST report generation is flawless and the UPI payment QR codes mean I get paid 2x faster.', avatar: 'RK' },
  { name: 'Anita Patel', role: 'CA, Ahmedabad', text: 'I recommend Bill By Billu to all my clients. The GSTR-1 export saves me hours during filing season. Best invoicing tool for Indian businesses.', avatar: 'AP' },
];

const faqs = [
  { q: 'Is Bill By Billu compliant with Indian GST rules?', a: 'Yes, fully compliant. We auto-calculate CGST, SGST, IGST based on place of supply. GSTR-1 reports are formatted for direct upload to the GST portal.' },
  { q: 'Can I use it for my existing business?', a: 'Absolutely. You can import your existing customer list, set custom invoice prefixes, and start generating invoices immediately. No data migration needed.' },
  { q: 'What payment methods do you support?', a: 'We support UPI (with QR codes), bank transfer, cash, and card payments. Razorpay integration is built-in for online payment links.' },
  { q: 'Is my data safe?', a: 'Yes. We use bank-grade encryption, your data is stored on secure Indian servers, and we never share it with third parties. You can export or delete your data anytime.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes, no questions asked. You can cancel from your settings page. Your data remains accessible for 30 days after cancellation.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  // Exit intent popup
  const handleMouseLeave = useCallback((e) => {
    if (e.clientY <= 0 && !showExitPopup && !localStorage.getItem('bb_exit_dismissed')) {
      setShowExitPopup(true);
    }
  }, [showExitPopup]);

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  const dismissExitPopup = () => {
    setShowExitPopup(false);
    localStorage.setItem('bb_exit_dismissed', '1');
  };

  return (
    <>
      <Helmet>
        <title>Bill By Billu — AI-Powered GST Invoicing Software for Indian Businesses</title>
        <meta name="description" content="Free AI-powered billing & GST software for Indian freelancers, retailers & SMBs. Create invoices, generate GSTR-1/GSTR-3B reports, share via WhatsApp, accept UPI payments. Start free trial." />
        <meta name="keywords" content="billing software India, invoice generator, GST invoice software, WhatsApp billing, UPI payment QR, GSTR-1 report, GSTR-3B, inventory management, restaurant billing, retail POS, Indian SMB tools, free billing app, AI invoice creator, tally alternative, vyapar alternative" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.billbybillu.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.billbybillu.in/" />
        <meta property="og:title" content="Bill By Billu — AI-Powered GST Invoicing for Indian Businesses" />
        <meta property="og:description" content="Free AI-powered billing & GST software. Create invoices, generate GSTR-1/GSTR-3B, share via WhatsApp, accept UPI payments." />
        <meta property="og:image" content="https://www.billbybillu.in/feature-graphic-1024x500.png" />
        <meta property="og:site_name" content="Bill By Billu" />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bill By Billu — AI-Powered GST Invoicing for Indian Businesses" />
        <meta name="twitter:description" content="Free AI-powered billing & GST software. Create invoices, generate GSTR-1/GSTR-3B, share via WhatsApp, accept UPI payments." />
        <meta name="twitter:image" content="https://www.billbybillu.in/feature-graphic-1024x500.png" />

        {/* Product JSON-LD */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Bill By Billu",
            "description": "AI-powered billing and GST software for Indian freelancers, retailers and SMBs",
            "brand": { "@type": "Brand", "name": "Bill By Billu" },
            "url": "https://www.billbybillu.in",
            "image": "https://www.billbybillu.in/feature-graphic-1024x500.png",
            "offers": {
              "@type": "AggregateOffer",
              "lowPrice": "0",
              "highPrice": "399",
              "priceCurrency": "INR",
              "offerCount": "4",
              "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150",
              "bestRating": "5"
            }
          }
        `}</script>

        {/* BreadcrumbList JSON-LD */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.billbybillu.in" }
            ]
          }
        `}</script>
      </Helmet>

      <div className="min-h-screen bg-white">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-bold text-xl text-gray-900">Bill By Billu</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2">Login</Link>
              <Link to="/register" onClick={() => trackEvent('cta_click', { location: 'nav' })}
                className="btn-press text-sm font-medium bg-brand-600 text-white px-5 py-2 rounded-xl hover:bg-brand-700 transition-all shadow-sm">
                Start Free Trial
              </Link>
            </div>
          </div>
        </nav>

        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-indigo-50 pt-20 pb-24">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-brand-100/80 backdrop-blur text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              Trusted by 500+ Indian businesses
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] animate-slide-up">
              AI-Powered Billing Software<br />
              <span className="text-gradient">for Retailers, Restaurants & Small Businesses</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-slide-up animation-delay-100">
              Generate invoices, manage inventory, send WhatsApp bills, and get AI-powered business insights — all from one dashboard.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animation-delay-200">
              <Link to="/register" onClick={() => trackEvent('cta_click', { location: 'hero' })}
                className="btn-press inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:bg-brand-700 shadow-lg shadow-brand-200/50 transition-all hover:shadow-glow">
                Start Free Trial <ArrowRight size={20} />
              </Link>
              <button onClick={() => trackEvent('cta_click', { location: 'hero', action: 'demo' })}
                className="btn-press inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3.5 rounded-xl text-lg font-semibold hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                <Play size={18} className="text-brand-600" /> Watch Demo
              </button>
              <a href="https://wa.me/917906130862" target="_blank" rel="noopener noreferrer"
                className="btn-press inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3.5 rounded-xl text-lg font-semibold hover:bg-emerald-100 hover:border-emerald-300 shadow-sm transition-all">
                <Calendar size={18} /> Book Demo
              </a>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 animate-slide-up animation-delay-300">
              <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> 5 free invoices/month</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> Cancel anytime</span>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-white">10,000+</div>
                <div className="text-gray-400 text-sm mt-1">Invoices Created</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-gray-400 text-sm mt-1">Active Businesses</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">9</div>
                <div className="text-gray-400 text-sm mt-1">Languages Supported</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4.8★</div>
                <div className="text-gray-400 text-sm mt-1">User Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-6 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <span className="flex items-center gap-2"><Shield size={18} className="text-green-500" /> Bank-Grade Security</span>
              <span className="flex items-center gap-2"><Zap size={18} className="text-amber-500" /> GST Compliant</span>
              <span className="flex items-center gap-2"><Users size={18} className="text-blue-500" /> 500+ Businesses</span>
              <span className="flex items-center gap-2"><Clock size={18} className="text-purple-500" /> 24/7 Access</span>
              <span className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> 99.9% Uptime</span>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need to invoice smarter</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Built specifically for Indian freelancers and businesses. GST-compliant from day one.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
                    <f.icon size={24} className="text-brand-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-brand-100/80 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                <Play size={14} /> Live Demo
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">See Bill By Billu in action</h2>
              <p className="mt-4 text-lg text-gray-600">Explore how easy invoicing can be</p>
            </div>

            {/* Demo Tabs */}
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {demoSteps.map((step, i) => (
                <button key={i} onClick={() => setActiveDemo(i)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeDemo === i ? 'bg-brand-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
                  {step.tab}
                </button>
              ))}
            </div>

            {/* Demo Content */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left: Description */}
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-6">
                    {(() => { const Icon = demoSteps[activeDemo].icon; return <Icon size={24} className="text-brand-600" />; })()}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{demoSteps[activeDemo].title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{demoSteps[activeDemo].desc}</p>
                  <ul className="space-y-3">
                    {demoSteps[activeDemo].bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Mock UI */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 lg:p-12 flex items-center justify-center min-h-[400px]">
                  <div className="w-full max-w-sm">
                    {/* Phone Frame */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-700">
                      {/* Status Bar */}
                      <div className="bg-brand-600 px-4 py-2 flex items-center justify-between">
                        <span className="text-white text-xs font-medium">Bill By Billu</span>
                        <span className="text-white/70 text-xs">9:41</span>
                      </div>

                      {/* Content based on active step */}
                      {activeDemo === 0 && (
                        <div className="p-4 space-y-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase">New Invoice</div>
                          <div className="border rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Customer</span><span className="font-medium">Rahul Sharma</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Item</span><span className="font-medium">Website Design</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-medium">₹15,000</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">GST (18%)</span><span className="font-medium">₹2,700</span></div>
                            <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total</span><span className="text-brand-600">₹17,700</span></div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-brand-600 text-white text-center py-2 rounded-lg text-sm font-medium">Save Invoice</div>
                            <div className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm">WhatsApp</div>
                          </div>
                        </div>
                      )}
                      {activeDemo === 1 && (
                        <div className="p-4 space-y-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase">GSTR-1 Summary</div>
                          <div className="space-y-2">
                            {[
                              { label: 'B2B Invoices', count: 24, amount: '₹3,45,000' },
                              { label: 'B2C Invoices', count: 156, amount: '₹1,89,500' },
                              { label: 'Credit Notes', count: 3, amount: '₹12,000' },
                            ].map((r, i) => (
                              <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                                <div><div className="text-sm font-medium">{r.label}</div><div className="text-xs text-gray-500">{r.count} invoices</div></div>
                                <div className="text-sm font-bold">{r.amount}</div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-xs text-green-600 font-medium">Total Taxable</div>
                            <div className="text-xl font-bold text-green-700">₹5,46,500</div>
                          </div>
                        </div>
                      )}
                      {activeDemo === 2 && (
                        <div className="p-4 space-y-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase">Share Invoice</div>
                          <div className="bg-green-50 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"><MessageCircle size={20} className="text-white" /></div>
                              <div><div className="text-sm font-bold">WhatsApp</div><div className="text-xs text-gray-500">Send instantly</div></div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-sm text-gray-700 border">
                              Dear Rahul, your invoice #INV-024 for ₹17,700 is attached. Pay now: upi://pay?pa=...
                            </div>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"><Mail size={20} className="text-white" /></div>
                              <div><div className="text-sm font-bold">Email</div><div className="text-xs text-gray-500">PDF attached</div></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeDemo === 3 && (
                        <div className="p-4 space-y-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase">AI Invoice</div>
                          <div className="bg-brand-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center"><Zap size={16} className="text-white" /></div>
                              <span className="text-sm font-bold text-brand-700">AI Assistant</span>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-sm border space-y-1">
                              <div className="text-gray-500">User: "Create invoice for Priya for 5 kurtas at 800 each"</div>
                              <div className="text-brand-600 font-medium mt-2">AI: Creating invoice...</div>
                            </div>
                          </div>
                          <div className="border rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium">Priya (auto-created)</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Items</span><span className="font-medium">5 × Kurtas @ ₹800</span></div>
                            <div className="flex justify-between font-bold"><span>Total</span><span className="text-brand-600">₹4,720</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Navigation Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {demoSteps.map((_, i) => (
                <button key={i} onClick={() => setActiveDemo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${activeDemo === i ? 'bg-brand-600 w-8' : 'bg-gray-300 hover:bg-gray-400'}`} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How it works</h2>
              <p className="mt-4 text-lg text-gray-600">Three simple steps to get paid faster</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">{s.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                  <p className="text-gray-600">{s.desc}</p>
                  {i < 2 && <div className="hidden md:block absolute" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-gray-600">Start free, upgrade when you need more</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((p, i) => (
                <div key={i} className={`rounded-2xl p-8 border-2 transition-all ${p.highlight ? 'border-brand-600 shadow-xl shadow-brand-100 scale-105' : 'border-gray-200 hover:border-gray-300'}`}>
                  {p.highlight && <div className="text-xs font-semibold text-brand-600 bg-brand-100 px-3 py-1 rounded-full inline-block mb-4">Most Popular</div>}
                  <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                    <span className="text-gray-500">{p.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 mb-6">{p.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check size={16} className="text-green-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" onClick={() => trackEvent('cta_click', { location: 'pricing', plan: p.name })}
                    className={`block w-full text-center py-3 rounded-xl font-semibold transition-colors ${p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Loved by Indian businesses</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} size={16} className="text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">{t.avatar}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                    <span className="font-medium text-gray-900">{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-brand-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to invoice smarter?</h2>
            <p className="text-brand-100 text-lg mb-8">Join 500+ Indian businesses already using Bill By Billu</p>
            <Link to="/register" onClick={() => trackEvent('cta_click', { location: 'bottom' })}
              className="inline-flex items-center gap-2 bg-white text-brand-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-brand-50 shadow-lg transition-all hover:scale-105">
              Start Free <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        {/* Newsletter Subscribe */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Stay in the loop</h2>
            <p className="text-gray-500 text-sm mb-6">Get product updates, GST tips, and exclusive offers. No spam, ever.</p>
            <SubscribeForm />
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Logo size={32} />
                  <span className="font-bold text-white">Bill By Billu</span>
                </div>
                <p className="text-sm">AI-Powered Invoice + GST for Indian Freelancers & SMBs</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Contact</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="mailto:support@billbybillu.in" className="hover:text-white transition-colors">support@billbybillu.in</a></li>
                  <li><a href="https://wa.me/917906130862" className="hover:text-white transition-colors">WhatsApp Support</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-6 text-center text-sm">
              © {new Date().getFullYear()} Bill By Billu. All rights reserved. Made with ❤️ in India.
            </div>
          </div>
        </footer>
      </div>
      <SubscribeModal delay={10000} />

      {/* Exit Intent Popup */}
      {showExitPopup && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={dismissExitPopup}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-slide-up" onClick={e => e.stopPropagation()}>
            <button onClick={dismissExitPopup} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Wait! Here's a special offer</h3>
              <p className="text-gray-600 mb-6">Get <strong>3 months of Starter plan FREE</strong> when you sign up today. No credit card required.</p>
              <Link to="/register" onClick={() => { dismissExitPopup(); trackEvent('cta_click', { location: 'exit_popup' }); }}
                className="block w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors mb-3">
                Claim Free 3 Months
              </Link>
              <button onClick={dismissExitPopup} className="text-sm text-gray-500 hover:text-gray-700">No thanks, I'll pay later</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
