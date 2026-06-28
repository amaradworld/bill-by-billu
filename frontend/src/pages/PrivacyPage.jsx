import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Logo from '../components/Logo';

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — Bill By Billu</title>
        <meta name="description" content="Privacy Policy for Bill By Billu — AI-Powered Invoice + GST for Indian Freelancers & SMBs." />
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Effective Date: June 27, 2026 | Last Updated: June 27, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                Bill By Billu ("we", "our", "us"), operated by Amar, is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
                use our invoicing platform at <a href="https://www.billbybillu.in" className="text-brand-600 hover:underline">www.billbybillu.in</a> and related services.
              </p>
              <p className="mt-2">
                By using our services, you agree to the collection and use of information in accordance with this policy.
                If you do not agree, please discontinue use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">2.1 Account Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, phone number</li>
                <li>Business name, GSTIN, PAN number</li>
                <li>Business address, city, state, pincode</li>
                <li>Password (stored securely using bcrypt encryption)</li>
              </ul>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">2.2 Business Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Invoice details (items, amounts, taxes, customer information)</li>
                <li>Customer records (names, GSTIN, addresses)</li>
                <li>Product catalog (names, HSN codes, prices, GST rates)</li>
                <li>Expense records</li>
              </ul>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">2.3 Payment Information</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Razorpay payment tokens (processed by Razorpay — we never store card/bank details)</li>
                <li>UPI transaction references</li>
                <li>Subscription plan and payment history</li>
              </ul>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">2.4 Usage Data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Browser type, device information</li>
                <li>Pages visited, features used</li>
                <li>IP address (for security and rate limiting)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Service delivery:</strong> Generate invoices, calculate GST, create reports</li>
                <li><strong>Account management:</strong> Authenticate users, manage subscriptions</li>
                <li><strong>Communication:</strong> Send transactional emails (password reset, invoice sharing)</li>
                <li><strong>Improvement:</strong> Analyze usage patterns to improve our product</li>
                <li><strong>Security:</strong> Detect fraud, prevent abuse, enforce rate limits</li>
                <li><strong>Legal compliance:</strong> Meet GST and Indian regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage & Security</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your data is stored on secure servers hosted in India</li>
                <li>Passwords are hashed using bcrypt with salt rounds</li>
                <li>API communications are encrypted via HTTPS/TLS</li>
                <li>Razorpay secrets are encrypted using AES-256-GCM</li>
                <li>We implement rate limiting and IP-based security measures</li>
                <li>Regular security audits and code reviews</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
              <p>We do NOT sell, trade, or rent your personal information. We may share data only with:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Razorpay:</strong> For payment processing (subject to their privacy policy)</li>
                <li><strong>Vercel:</strong> For frontend hosting (no user data stored)</li>
                <li><strong>Render:</strong> For backend hosting (encrypted data at rest)</li>
                <li><strong>Legal authorities:</strong> When required by Indian law or court order</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Access:</strong> View all your data from the dashboard</li>
                <li><strong>Export:</strong> Download your invoices, customers, and reports as CSV/JSON</li>
                <li><strong>Delete:</strong> Request account deletion by contacting support@billbybillu.in</li>
                <li><strong>Correction:</strong> Update your information anytime from Settings</li>
              </ul>
              <p className="mt-2">
                Upon account deletion, your data will be permanently removed within 30 days, except where retention is required by Indian tax law (GST records must be retained for 6 years).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies & Tracking</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>We use essential cookies for authentication and session management</li>
                <li>Google Analytics (GA4) for anonymous usage statistics</li>
                <li>No third-party advertising trackers</li>
                <li>No cross-site tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
              <p>
                Our services are not intended for users under 18 years of age. We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. Significant changes will be communicated via email or in-app notification.
                The "Last Updated" date at the top reflects the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
              <p>For privacy-related questions or data deletion requests:</p>
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
