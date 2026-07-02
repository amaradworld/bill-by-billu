import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, ArrowRight, Search, BookOpen, FileText, TrendingUp, Lightbulb, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';
import { api } from '../lib/api';

const categories = ['All', 'GST', 'Invoicing', 'Business Tips', 'Product Updates'];

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

const staticPosts = [
  {
    slug: 'how-to-file-gstr-1',
    title: 'How to File GSTR-1 in 2026: Complete Step-by-Step Guide',
    excerpt: 'Learn how to file GSTR-1 on the GST portal. We cover B2B invoices, HSN codes, and common mistakes to avoid. Plus: how Bill By Billu auto-generates your GSTR-1.',
    category: 'GST',
    publishedAt: '2026-07-01',
    readTime: '8 min read',
    featured: true,
  },
  {
    slug: 'best-gst-software-india',
    title: 'Best GST Billing Software in India 2026 (Free & Paid)',
    excerpt: 'Comparing the top 10 GST billing software in India — Tally, Zoho, Vyapar, Bill By Billu, and more. Features, pricing, and which one is right for your business.',
    category: 'Business Tips',
    publishedAt: '2026-06-28',
    readTime: '12 min read',
    featured: true,
  },
  {
    slug: '5-gst-mistakes-small-businesses',
    title: '5 GST Mistakes That Cost Indian Businesses Lakhs Every Year',
    excerpt: 'Wrong HSN codes, missing place of supply, manual GSTR compilation — these common GST errors can lead to penalties. Here\'s how to avoid them.',
    category: 'GST',
    publishedAt: '2026-06-25',
    readTime: '6 min read',
  },
  {
    slug: 'ai-invoicing-future',
    title: 'Why AI-Powered Invoicing is the Future of Indian SMBs',
    excerpt: 'Artificial Intelligence is transforming how Indian businesses create invoices. Voice input, photo OCR, and smart parsing — the future is here.',
    category: 'Invoicing',
    publishedAt: '2026-06-22',
    readTime: '7 min read',
  },
  {
    slug: 'whatsapp-billing-guide',
    title: 'WhatsApp Billing: How to Send GST Invoices via WhatsApp',
    excerpt: 'Step-by-step guide to sending professional GST invoices through WhatsApp. Includes payment links, PDF sharing, and automation tips.',
    category: 'Invoicing',
    publishedAt: '2026-06-20',
    readTime: '5 min read',
  },
  {
    slug: 'freelancer-tax-guide-india',
    title: 'Complete Tax Guide for Indian Freelancers (2026)',
    excerpt: 'Section 44ADA, presumptive taxation, GST registration thresholds, and how to file ITR as a freelancer. Everything you need to know.',
    category: 'Business Tips',
    publishedAt: '2026-06-18',
    readTime: '10 min read',
  },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function estimateReadTime(content) {
  if (!content) return '3 min read';
  const words = content.split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicPosts, setDynamicPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/blog?limit=50')
      .then(data => setDynamicPosts(data.posts || []))
      .catch(() => setDynamicPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const allPosts = [
    ...dynamicPosts.map(p => ({
      ...p,
      readTime: estimateReadTime(p.content),
      icon: categoryIcons[p.category] || FileText,
      isDynamic: true,
    })),
    ...staticPosts.map(p => ({
      ...p,
      icon: categoryIcons[p.category] || FileText,
      isDynamic: false,
    })),
  ];

  const filteredPosts = allPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = allPosts.filter(p => p.featured).slice(0, 2);

  return (
    <>
      <Helmet>
        <title>Blog — Bill By Billu | GST Tips, Invoicing Guides & Business Advice</title>
        <meta name="description" content="Learn about GST filing, invoicing best practices, tax tips for freelancers, and business advice for Indian SMBs. Expert guides from Bill By Billu." />
        <meta name="keywords" content="GST filing guide, GSTR-1 tutorial, billing software comparison, freelancer tax guide India, WhatsApp billing, AI invoicing, GST mistakes" />
        <link rel="canonical" href="https://www.billbybillu.in/blog" />
        <meta property="og:title" content="Blog — Bill By Billu | GST Tips & Invoicing Guides" />
        <meta property="og:description" content="Expert guides on GST filing, invoicing, and business management for Indian SMBs." />
        <meta property="og:url" content="https://www.billbybillu.in/blog" />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Bill By Billu Blog",
            "url": "https://www.billbybillu.in/blog",
            "description": "GST tips, invoicing guides, and business advice for Indian SMBs"
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
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">Home</Link>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Login</Link>
              <Link to="/register" className="text-sm font-medium bg-brand-600 text-white px-5 py-2 rounded-xl hover:bg-brand-700">Start Free</Link>
            </div>
          </div>
        </nav>

        <section className="bg-gradient-to-br from-brand-50 via-white to-indigo-50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-brand-100/80 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <BookOpen size={16} /> Blog
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              GST Tips, Invoicing Guides &<br />Business Advice
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Expert articles to help Indian businesses file GST correctly, invoice smarter, and grow faster.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search articles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedCategory === 'All' && !searchQuery && featuredPosts.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredPosts.map(post => {
                const Icon = post.icon;
                return (
                  <article key={post.slug} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-48 bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
                      <Icon size={48} className="text-white/30" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category]}`}>{post.category}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">{post.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} /> {formatDate(post.publishedAt)}</span>
                        <span className="text-sm font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all">Read more <ArrowRight size={14} /></span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pb-20">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {selectedCategory === 'All' ? 'All Articles' : selectedCategory}
            {dynamicPosts.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({filteredPosts.length} articles)</span>}
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <Loader2 size={40} className="text-brand-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading articles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => {
                const Icon = post.icon;
                return (
                  <article key={post.slug} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all group">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                      <Icon size={20} className="text-brand-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category]}`}>{post.category}</span>
                      <span className="text-xs text-gray-400">{post.readTime}</span>
                      {post.isDynamic && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Auto</span>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors leading-tight">{post.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(post.publishedAt)}</span>
                      {post.sourceUrl ? (
                        <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-brand-600 flex items-center gap-1">Source <ArrowRight size={14} /></a>
                      ) : (
                        <span className="text-sm font-semibold text-brand-600 flex items-center gap-1">Read <ArrowRight size={14} /></span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <Search size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No articles found matching your search.</p>
            </div>
          )}
        </section>

        <section className="bg-brand-600 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to simplify your invoicing?</h2>
            <p className="text-brand-100 mb-6">Start creating GST invoices in seconds. Free plan available.</p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 px-8 py-3 rounded-xl font-semibold hover:bg-brand-50 transition-all">
              Start Free <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            © {new Date().getFullYear()} Bill By Billu. All rights reserved. Made with ❤️ in India.
          </div>
        </footer>
      </div>
    </>
  );
}
