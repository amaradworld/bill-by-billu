import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, BarChart3, MessageCircle, CreditCard, Receipt, Globe, ChevronDown, ChevronUp, ArrowRight, Check, Star, Play, Calendar, Mail } from 'lucide-react';
import SubscribeForm from '../components/SubscribeForm';

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

const plans = [
  { name: 'Free', price: '₹0', period: '/month', desc: 'Perfect for trying out', features: ['10 invoices/month', 'Basic GST reports', 'WhatsApp sharing', '1 user'], cta: 'Start Free', highlight: false },
  { name: 'Starter', price: '₹299', period: '/month', desc: 'For growing freelancers', features: ['Unlimited invoices', 'Full GST reports', 'Expense tracking', 'Priority support', 'Custom branding'], cta: 'Get Starter', highlight: true },
  { name: 'Pro', price: '₹799', period: '/month', desc: 'For teams & agencies', features: ['Everything in Starter', 'Multi-user access', 'API access', 'AI categorization', 'Dedicated support', 'White-label option'], cta: 'Get Pro', highlight: false },
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

  return (
    <>
      <Helmet>
        <title>Bill By Billu — AI-Powered Billing Software for Indian Businesses</title>
        <meta name="description" content="AI-powered billing software for retailers, restaurants & small businesses. Generate invoices, manage inventory, send WhatsApp bills, and get AI-powered insights." />
        <meta name="keywords" content="billing software India, invoice generator, GST invoice, WhatsApp billing, UPI payment, inventory management, restaurant billing, retail POS, Indian SMB tools" />
        <meta property="og:title" content="Bill By Billu — AI-Powered Billing Software" />
        <meta property="og:description" content="Generate invoices, manage inventory, send WhatsApp bills, and get AI-powered business insights." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.billbybillu.in" />
        <link rel="canonical" href="https://www.billbybillu.in" />
      </Helmet>

      <div className="min-h-screen bg-white">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BB</span>
              </div>
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
              <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> 10 free invoices/month</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-green-500" /> Cancel anytime</span>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">BB</span>
                  </div>
                  <span className="font-bold text-white">Bill By Billu</span>
                </div>
                <p className="text-sm">AI-Powered Invoice + GST for Indian Freelancers & SMBs</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
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
    </>
  );
}
