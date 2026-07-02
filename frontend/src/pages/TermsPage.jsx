import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Logo from '../components/Logo';

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Bill By Billu | GST Invoicing Software</title>
        <meta name="description" content="Terms of Service for Bill By Billu — AI-powered GST invoicing software for Indian businesses. Read our terms and conditions." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.billbybillu.in/terms" />
        <meta property="og:title" content="Terms of Service — Bill By Billu" />
        <meta property="og:description" content="Terms of Service for Bill By Billu — AI-powered GST invoicing software for Indian businesses." />
        <meta property="og:url" content="https://www.billbybillu.in/terms" />
      </Helmet>
      <div className="min-h-screen bg-white">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-bold text-xl text-gray-900">Bill By Billu</span>
            </Link>
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">← Back to Home</Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Effective Date: June 27, 2026 | Last Updated: June 27, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Bill By Billu ("the Service"), operated by Amar ("we", "our", "us"),
                you agree to be bound by these Terms of Service. If you disagree with any part, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                Bill By Billu is an AI-powered invoicing and GST compliance platform for Indian freelancers and small businesses.
                The Service includes invoice creation, GST calculation, report generation, UPI payment collection, and related features
                accessible at <a href="https://www.billbybillu.in" className="text-brand-600 hover:underline">www.billbybillu.in</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be at least 18 years old to create an account</li>
                <li>You must provide accurate and complete registration information</li>
                <li>You are responsible for safeguarding your password</li>
                <li>One person/entity may not maintain more than one free account</li>
                <li>You must notify us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscriptions & Payments</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Free Plan:</strong> Limited to 5 invoices per month with basic features</li>
                <li><strong>Starter Plan:</strong> ₹199/month or ₹1,887/year — 100 invoices/month with GST reports</li>
                <li><strong>Growth Plan:</strong> ₹399/month or ₹3,783/year — 500 invoices/month with AI features</li>
                <li>Payments are processed securely through Razorpay</li>
                <li>UPI manual payments are verified by our team within 24 hours</li>
                <li>Subscriptions auto-renew unless cancelled before the billing cycle ends</li>
                <li>Refund requests must be made within 7 days of purchase</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Data & Content</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You retain full ownership of all data you create (invoices, customers, products)</li>
                <li>We do not access, sell, or share your business data with third parties</li>
                <li>You are responsible for the accuracy of invoice and GST data you generate</li>
                <li>You may export or delete your data at any time</li>
                <li>Upon account deletion, data is permanently removed within 30 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Use the Service for any unlawful purpose under Indian law</li>
                <li>Generate fake or fraudulent invoices for tax evasion</li>
                <li>Attempt to reverse-engineer, decompile, or extract source code</li>
                <li>Use automated scripts or bots to access the Service</li>
                <li>Resell or redistribute the Service without written permission</li>
                <li>Upload malware or attempt to compromise Service security</li>
                <li>Exceed rate limits or abuse API endpoints</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. GST Compliance Disclaimer</h2>
              <p>
                Bill By Billu provides tools for GST-compliant invoicing and report generation.
                However, we are NOT a chartered accountant or tax advisor. You are solely responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Verifying the accuracy of all generated invoices and GST reports</li>
                <li>Filing GST returns (GSTR-1, GSTR-3B) with the GST portal</li>
                <li>Ensuring compliance with current Indian tax laws and regulations</li>
                <li>Consulting a qualified CA for tax-related decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by Indian law, Bill By Billu shall not be liable for any indirect,
                incidental, special, or consequential damages. Our total liability shall not exceed the amount paid
                by you for the Service in the 12 months preceding the claim.
              </p>
              <p className="mt-2">
                We do not guarantee uninterrupted or error-free operation of the Service.
                We are not liable for any losses resulting from downtime, data loss, or service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Termination</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You may cancel your account at any time from the Settings page</li>
                <li>We may suspend or terminate accounts that violate these Terms</li>
                <li>Upon termination, your right to use the Service ceases immediately</li>
                <li>We will provide a 30-day data retention period after cancellation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Governing Law</h2>
              <p>
                These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
                jurisdiction of courts in Gurgaon, Haryana, India.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Continued use of the Service after changes
                constitutes acceptance of the modified Terms. Material changes will be communicated via email or in-app notification.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
              <p>For questions about these Terms:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Email: <a href="mailto:support@billbybillu.in" className="text-brand-600 hover:underline">support@billbybillu.in</a></li>
                <li>WhatsApp: <a href="https://wa.me/917906130862" className="text-brand-600 hover:underline">+91-7906130862</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
