import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, ArrowLeft, ArrowRight, Tag, Loader2, BookOpen, FileText, TrendingUp, Lightbulb, ExternalLink } from 'lucide-react';
import Logo from '../components/Logo';
import { api } from '../lib/api';

const categoryColors = {
  'GST': 'bg-green-100 text-green-700',
  'Invoicing': 'bg-blue-100 text-blue-700',
  'Business Tips': 'bg-amber-100 text-amber-700',
  'Product Updates': 'bg-purple-100 text-purple-700',
};

const categoryIcons = {
  'GST': FileText,
  'Invoicing': Lightbulb,
  'Business Tips': TrendingUp,
  'Product Updates': BookOpen,
};

const categoryGradients = {
  'GST': 'from-green-500 to-emerald-600',
  'Invoicing': 'from-blue-500 to-indigo-600',
  'Business Tips': 'from-amber-500 to-orange-600',
  'Product Updates': 'from-purple-500 to-violet-600',
};

const staticPostsData = {
  'how-to-file-gstr-1': {
    title: 'How to File GSTR-1 in 2026: Complete Step-by-Step Guide',
    category: 'GST',
    publishedAt: '2026-07-01',
    readTime: '8 min read',
    content: `Filing GSTR-1 is mandatory for all registered businesses under GST. This guide walks you through the entire process step by step.

## What is GSTR-1?

GSTR-1 is a monthly/quarterly return that summarizes all outward supplies (sales) made by a registered taxpayer. It contains details of B2B invoices, B2C invoices, credit/debit notes, and export invoices.

## Who Must File?

- All GST-registered businesses
- Even if there are no sales in a period, you must file a Nil return
- Filing frequency depends on your annual turnover:
  - Above ₹5 crore: Monthly
  - Up to ₹5 crore: Quarterly (QRMP scheme)

## Step-by-Step Filing Process

### Step 1: Login to GST Portal
Visit gst.gov.in and login with your credentials.

### Step 2: Navigate to Returns
Go to Services → Returns → Returns Dashboard.

### Step 3: Select Period
Choose the financial year and month/quarter.

### Step 4: Fill Table-wise Details
- **Table 4**: B2B invoices (invoices to registered persons)
- **Table 5**: B2C large transactions (inter-state > ₹2.5 lakh)
- **Table 7**: B2C others
- **Table 9**: Credit/debit notes
- **Table 11**: Advances received

### Step 5: Upload JSON (Optional)
If you use billing software like Bill By Billu, you can upload a JSON file directly.

### Step 6: Review and Submit
Check all details, then click Submit.

### Step 7: File with DSC/EVC
Use your Digital Signature Certificate or Electronic Verification Code.

## Common Mistakes to Avoid

1. Wrong HSN codes — always use the correct HSN from your GST registration
2. Missing place of supply — required for IGST/CGST+SGST determination
3. Not matching GSTR-1 with GSTR-3B — reconcile monthly
4. Late filing — penalty of ₹50/day (₹25 CGST + ₹25 SGST)

## How Bill By Billu Helps

Bill By Billu auto-generates your GSTR-1 data. Every invoice you create is automatically categorized with the right HSN codes, tax rates, and place of supply. Export GSTR-1 in one click.`,
  },
  'best-gst-software-india': {
    title: 'Best GST Billing Software in India 2026 (Free & Paid)',
    category: 'Business Tips',
    publishedAt: '2026-06-28',
    readTime: '12 min read',
    content: `Choosing the right GST billing software can save you hours of manual work and prevent costly GST filing mistakes. Here's our comprehensive comparison.

## Top 10 GST Software in India

### 1. Tally Prime
- **Price**: ₹18,000+ (one-time)
- **Best for**: Large businesses, CA firms
- **Pros**: Comprehensive, reliable, offline
- **Cons**: Expensive, steep learning curve

### 2. Zoho Books
- **Price**: Free (₹5 lakh turnover) / ₹799+/month
- **Best for**: Small to medium businesses
- **Pros**: Cloud-based, integrates with Zoho suite
- **Cons**: Gets expensive at scale

### 3. Vyapar
- **Price**: Free / ₹599/year
- **Best for**: Retail shops, small traders
- **Pros**: Simple UI, barcode support
- **Cons**: Limited GST features

### 4. Bill By Billu
- **Price**: Free (5 invoices) / ₹199/month
- **Best for**: Freelancers, service businesses, small traders
- **Pros**: AI-powered invoicing, WhatsApp sharing, modern UI
- **Cons**: Newer player

### 5. ClearOne
- **Price**: ₹2,000/year
- **Best for**: Compliance-focused businesses
- **Pros**: Strong reconciliation
- **Cons**: Dated interface

### 6. QuickBooks
- **Price**: ₹999+/month
- **Best for**: Growing businesses
- **Pros**: International standard, good support
- **Cons**: Pricey for Indian SMBs

### 7. Marg ERP
- **Price**: ₹4,800/year
- **Best for**: Pharmaceutical, FMCG distribution
- **Pros**: Industry-specific features
- **Cons**: Complex for general use

### 8. Busy Accounting
- **Price**: ₹4,999/year
- **Best for**: Mid-size businesses
- **Pros**: Strong accounting + GST
- **Cons**: Desktop only

### 9. myBillBook
- **Price**: Free / ₹499/year
- **Best for**: Small retailers
- **Pros**: Simple, mobile-first
- **Cons**: Limited features

### 10. Khatabook
- **Price**: Free
- **Best for**: Khata management, small shops
- **Pros**: Free, easy credit tracking
- **Cons**: Not full accounting

## How to Choose

Consider: your business size, number of invoices, need for multi-user access, budget, and whether you need mobile access.

Bill By Billu is ideal if you want modern AI-powered invoicing with WhatsApp sharing at an affordable price.`,
  },
  '5-gst-mistakes-small-businesses': {
    title: '5 GST Mistakes That Cost Indian Businesses Lakhs Every Year',
    category: 'GST',
    publishedAt: '2026-06-25',
    readTime: '6 min read',
    content: `Every year, Indian businesses lose lakhs due to preventable GST mistakes. Here are the top 5 errors and how to avoid them.

## Mistake 1: Wrong HSN Codes

Using incorrect HSN (Harmonized System of Nomenclature) codes is the most common GST mistake. Wrong codes can lead to:
- Incorrect tax rate application
- Demand notices from the department
- Loss of Input Tax Credit (ITC)

**Fix**: Always verify HSN codes from the GST portal. Use billing software that auto-populates correct HSN codes.

## Mistake 2: Missing Place of Supply

Forgetting to mention the place of supply leads to wrong GST type (CGST+SGST vs IGST). This results in:
- Incorrect tax collection
- Mismatches in GSTR-1 and GSTR-2B
- ITC claims being rejected

**Fix**: Always capture the buyer's state in your invoicing system.

## Mistake 3: Not Reconciling GSTR-1 with Books

Many businesses file GSTR-1 without reconciling with their actual books. This causes:
- Filing incorrect figures
- Missing invoices
- Duplicate entries

**Fix**: Reconcile monthly before filing. Use software that auto-matches.

## Mistake 4: Delayed Filing

Late filing attracts ₹50/day penalty (₹25 CGST + ₹25 SGST). Over a year of missed filings:
- ₹22,500 penalty per return
- Interest at 18% on unpaid tax
- Blocked e-way bill generation

**Fix**: Set calendar reminders or use auto-filing features.

## Mistake 5: Claiming Wrong ITC

Claiming ITC on:
- Personal expenses
- Exempt supplies
- Invoices not in GSTR-2B

This leads to demand notices and penalties.

**Fix**: Only claim ITC on valid business purchases reflected in GSTR-2B.

## Prevention is Better Than Cure

The best way to avoid these mistakes is to use reliable GST billing software like Bill By Billu that handles HSN codes, place of supply, and GSTR-1 generation automatically.`,
  },
  'ai-invoicing-future': {
    title: 'Why AI-Powered Invoicing is the Future of Indian SMBs',
    category: 'Invoicing',
    publishedAt: '2026-06-22',
    readTime: '7 min read',
    content: `Artificial Intelligence is transforming how Indian businesses create, send, and manage invoices. Here's why AI-powered invoicing is the future.

## What is AI-Powered Invoicing?

AI invoicing uses machine learning and natural language processing to automate the invoice creation process. Instead of manually entering data, you can:

- **Speak your invoice**: "Create invoice for Rahul, 2 shirts at 500 each"
- **Snap a photo**: OCR reads handwritten or printed bills
- **Smart parsing**: AI understands context and fills in details

## Benefits for Indian SMBs

### 1. Speed
Create invoices in seconds instead of minutes. AI pre-fills customer details, applies correct GST rates, and generates professional PDFs.

### 2. Accuracy
AI reduces human errors in:
- HSN code selection
- GST rate calculation
- Customer detail entry

### 3. Cost Savings
- No need for dedicated billing staff
- Reduced paper and printing costs
- Fewer GST filing mistakes = fewer penalties

### 4. Better Cash Flow
- Instant invoice delivery via WhatsApp
- Automated payment reminders
- Real-time payment tracking

## Real-World Example

Rajesh runs a garment shop in Delhi. Before AI invoicing, he spent 30 minutes daily on billing. Now with Bill By Billu's AI assistant:
- He speaks the invoice: "Bill to Amit, 3 kurtas at 800"
- AI creates the invoice in 5 seconds
- PDF is sent via WhatsApp instantly
- Time saved: 25 minutes daily

## The Future is Now

AI invoicing is not a future concept — it's available today. Bill By Billu is leading this transformation for Indian businesses with:
- Voice-to-invoice
- Photo OCR invoice creation
- Smart GST compliance
- WhatsApp-native sharing

Start using AI invoicing today and save hours every week.`,
  },
  'whatsapp-billing-guide': {
    title: 'WhatsApp Billing: How to Send GST Invoices via WhatsApp',
    category: 'Invoicing',
    publishedAt: '2026-06-20',
    readTime: '5 min read',
    content: `WhatsApp is the most-used messaging app in India. Sending invoices via WhatsApp is fast, free, and what your customers prefer.

## Why WhatsApp Invoicing?

- **95% of Indian smartphones have WhatsApp**
- Customers prefer receiving invoices on WhatsApp
- Faster than email (open rate 98% vs 20%)
- Includes payment link for instant collection

## How to Send GST Invoices via WhatsApp

### Method 1: Using Bill By Billu
1. Create your invoice in Bill By Billu
2. Click the "WhatsApp" share button
3. Select the customer's WhatsApp number
4. PDF invoice + payment link sent automatically

### Method 2: Using WhatsApp Business API
For businesses wanting automation:
1. Set up WhatsApp Business API
2. Integrate with your billing software
3. Automate invoice delivery

## Best Practices

1. **Always send PDF** — not just text. Professional PDFs build trust.
2. **Include payment link** — UPI/Razorpay link for instant payment
3. **Add a thank you message** — personal touch matters
4. **Send within 1 hour** — of service delivery
5. **Follow up** — if payment is pending after 7 days

## Template Messages

Here are proven WhatsApp invoice message templates:

**Template 1 (Formal):**
"Dear [Name], your invoice #[INV-001] for ₹[Amount] is attached. Please make payment at your convenience. Thank you for your business!"

**Template 2 (Friendly):**
"Hi [Name]! Here's your bill for today: ₹[Amount]. Payment link: [UPI Link]. Thanks! 🙏"

**Template 3 (With Reminder):**
"Hi [Name], invoice #[INV-001] for ₹[Amount] is due on [Date]. Pay now: [Link]. Thanks!"

## Legal Compliance

WhatsApp invoices are legally valid in India if they contain:
- Supplier GSTIN
- Invoice number and date
- HSN codes and tax breakup
- Total amount with words

Bill By Billu generates fully compliant GST invoices that you can share directly on WhatsApp.`,
  },
  'freelancer-tax-guide-india': {
    title: 'Complete Tax Guide for Indian Freelancers (2026)',
    category: 'Business Tips',
    publishedAt: '2026-06-18',
    readTime: '10 min read',
    content: `Freelancing in India comes with tax obligations. This guide covers everything you need to know about taxes as a freelancer.

## Do Freelancers Need to Pay Tax?

Yes. If your annual income exceeds ₹2.5 lakh (basic exemption limit), you must pay income tax. Additionally, if your annual turnover exceeds ₹20 lakh, you must register for GST.

## Tax Regimes for Freelancers

### Old Regime
- Deductions available: Section 80C (₹1.5 lakh), 80D (health insurance), HRA
- Tax rates: 5% (₹2.5-5L), 20% (₹5-10L), 30% (above ₹10L)

### New Regime (Default)
- No major deductions (except 80CCH, 80CCD)
- Lower rates: 5% (₹3-6L), 10% (₹6-9L), 15% (₹9-12L), 20% (₹12-15L), 30% (above ₹15L)

## Presumptive Taxation (Section 44ADA)

For freelancers with gross receipts up to ₹50 lakh:
- Declare 50% of gross receipts as profit
- Pay tax on only 50% of income
- No need to maintain books of accounts

**Example**: If you earn ₹10 lakh annually, you declare ₹5 lakh as profit and pay tax on ₹5 lakh.

## GST for Freelancers

- **Registration required**: If turnover > ₹20 lakh (₹10 lakh for NE states)
- **Rate**: 18% GST on services
- **Filing**: GSTR-1 (monthly/quarterly) + GSTR-3B (monthly)
- **Composition scheme**: Not available for service providers > ₹50 lakh

## How to File ITR as a Freelancer

1. **Maintain records**: All invoices, expenses, bank statements
2. **Calculate income**: Gross receipts - allowed expenses
3. **Choose regime**: Old vs New (calculate both)
4. **File ITR-3 or ITR-4**: ITR-4 if using presumptive taxation
5. **Due date**: July 31 (for individuals)

## Expenses You Can Deduct

- Home office rent (if dedicated space)
- Internet and phone bills (business portion)
- Software subscriptions
- Travel for business meetings
- Professional development courses
- Health insurance premiums

## Tools for Freelancers

Use Bill By Billu to:
- Create GST-compliant invoices
- Track payments and expenses
- Generate GSTR-1 data automatically
- Share invoices via WhatsApp

## Key Deadlines

- **GST filing**: 11th (GSTR-1), 20th (GSTR-3B) monthly
- **Advance tax**: 15th June, Sep, Dec, March
- **ITR filing**: July 31
- **Tax audit**: September 30 (if applicable)`,
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderContent(content) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-6 space-y-2 mb-4">
          {listItems.map((item, i) => (
            <li key={i} className="text-gray-700 leading-relaxed">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushList(); continue; }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b">{line.slice(3)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      inList = true;
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      inList = true;
      listItems.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^!\[.*\]\(.*\)$/.test(line)) {
      flushList();
      const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        elements.push(
          <figure key={i} className="my-6">
            <img src={match[2]} alt={match[1]} className="w-full rounded-xl border shadow-sm" loading="lazy" />
          </figure>
        );
      }
    } else {
      flushList();
      elements.push(<p key={i} className="text-gray-700 leading-relaxed mb-4">{line}</p>);
    }
  }
  flushList();

  return elements;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    const staticPost = staticPostsData[slug];
    if (staticPost) {
      setPost({ ...staticPost, slug, isDynamic: false });
      setLoading(false);
      return;
    }

    api.get(`/api/blog/${slug}`)
      .then(data => { setPost({ ...data, isDynamic: true }); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={40} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <Link to="/blog" className="text-brand-600 hover:underline">← Back to Blog</Link>
        </div>
      </div>
    );
  }

  const Icon = categoryIcons[post.category] || FileText;
  const gradient = categoryGradients[post.category] || 'from-brand-500 to-indigo-600';

  return (
    <>
      <Helmet>
        <title>{post.title} — Bill By Billu Blog</title>
        <meta name="description" content={post.content?.slice(0, 160)} />
        <link rel="canonical" href={`https://www.billbybillu.in/blog/${slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.content?.slice(0, 160)} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": "${post.title}",
            "datePublished": "${post.publishedAt}",
            "author": { "@type": "Organization", "name": "Bill By Billu" },
            "publisher": { "@type": "Organization", "name": "Bill By Billu" }
          }
        `}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-bold text-xl text-gray-900">Bill By Billu</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">Blog</Link>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Login</Link>
              <Link to="/register" className="text-sm font-medium bg-brand-600 text-white px-5 py-2 rounded-xl hover:bg-brand-700">Start Free</Link>
            </div>
          </div>
        </nav>

        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mb-6">
            <ArrowLeft size={16} /> Back to Blog
          </Link>

          <div className={`h-64 sm:h-80 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-8`}>
            <Icon size={80} className="text-white/30" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[post.category]}`}>{post.category}</span>
            <span className="text-sm text-gray-400 flex items-center gap-1"><Calendar size={14} /> {formatDate(post.publishedAt)}</span>
            <span className="text-sm text-gray-400 flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-8 leading-tight">{post.title}</h1>

          <div className="prose prose-lg max-w-none">
            {renderContent(post.content)}
          </div>

          {post.sourceUrl && (
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <ExternalLink size={16} />
                Originally published at:
                <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                  {new URL(post.sourceUrl).hostname}
                </a>
              </p>
            </div>
          )}

          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Simplify your invoicing</h3>
            <p className="text-gray-600 mb-4">Bill By Billu makes GST invoicing effortless. Try it free today.</p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all">
              Start Free <ArrowRight size={18} />
            </Link>
          </div>
        </article>

        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            © {new Date().getFullYear()} Bill By Billu. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
