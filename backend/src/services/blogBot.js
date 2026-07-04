const RssParser = require('rss-parser');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const OpenAI = require('openai');
const prisma = require('../prisma');
const logger = require('../logger');

const parser = new RssParser();

// Direct RSS feeds that provide actual article URLs (not encoded redirects)
const RSS_FEEDS = [
  'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
  'https://www.livemint.com/rss/news',
  'https://feeds.feedburner.com/ndtvnews-top-stories',
  'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms',
];
const MAX_ARTICLES = 5;
const MAX_SUMMARY_WORDS = 250;
const GST_KEYWORDS = /gst|tax|revenue|compliance|filing|return|gstr|input tax credit|gstin|gst council|gst rate|duty|customs|excise/i;

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function fetchLatestArticles() {
  const allItems = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const source = feedUrl.split('/')[2];
      for (const item of (feed.items || [])) {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`;
        if (GST_KEYWORDS.test(text) && item.link && item.title) {
          allItems.push({
            title: item.title.trim(),
            link: item.link.split('?')[0],
            snippet: item.contentSnippet?.trim(),
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            source,
          });
        }
      }
    } catch (err) {
      logger.warn({ err: err.message, feed: feedUrl }, 'Failed to fetch RSS feed');
    }
  }

  // Deduplicate by URL and sort by date
  const seen = new Set();
  const unique = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
  unique.sort((a, b) => b.pubDate - a.pubDate);

  return unique.slice(0, MAX_ARTICLES);
}

async function extractArticleContent(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) return { text: null, images: [] };

  // Extract images from the parsed HTML
  const images = [];
  const imgElements = dom.window.document.querySelectorAll('img');
  for (const img of imgElements) {
    const src = img.getAttribute('src');
    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('1x1')) {
      const width = parseInt(img.getAttribute('width') || '0');
      const height = parseInt(img.getAttribute('height') || '0');
      if (width > 100 || height > 100 || (!width && !height)) {
        images.push(src);
      }
    }
  }

  return {
    text: article.textContent,
    images: images.slice(0, 3), // top 3 images
  };
}

async function summarize(text, title) {
  if (!openai) return fallbackSummary(text);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a GST compliance expert and concise blog writer. Summarize the given article in ${MAX_SUMMARY_WORDS} words or fewer. Focus on actionable GST updates relevant to India. Output only the summary — no preamble, no commentary.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nArticle:\n${text.slice(0, 8000)}`,
        },
      ],
      max_tokens: MAX_SUMMARY_WORDS * 2,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || fallbackSummary(text);
  } catch (err) {
    logger.warn({ err: err.message }, 'OpenAI summarization failed, using fallback');
    return fallbackSummary(text);
  }
}

function fallbackSummary(text) {
  const sentences = text.match(/[^.!?\n]+[.!?]+/g) || [];
  let result = [];
  let wordCount = 0;
  for (const s of sentences) {
    const words = s.split(/\s+/).length;
    if (wordCount + words > MAX_SUMMARY_WORDS) break;
    result.push(s.trim());
    wordCount += words;
  }
  return result.join(' ') || text.slice(0, 500);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

async function processArticles() {
  logger.info('GST Blog Bot: Checking for new articles...');

  try {
    const articles = await fetchLatestArticles();
    let posted = 0;

    for (const article of articles) {
      if (!article.title || !article.link) continue;

      const exists = await prisma.blogPost.findUnique({ where: { sourceUrl: article.link } });
      if (exists) {
        logger.info({ title: article.title }, 'Skipping (already posted)');
        continue;
      }

      logger.info({ title: article.title }, 'Processing article');

      let extracted;
      try {
        extracted = await extractArticleContent(article.link);
      } catch (err) {
        logger.warn({ err: err.message, url: article.link }, 'Failed to extract content');
        continue;
      }

      const body = extracted.text;
      const images = extracted.images || [];

      if (!body || body.length < 100) {
        logger.warn({ title: article.title }, 'Skipping (too short)');
        continue;
      }

      const summary = await summarize(body, article.title);
      const slug = slugify(article.title);

      // Build content with images embedded
      let content = summary;
      if (images.length > 0) {
        const imageSection = '\n\n' + images.map((img, i) => `![Image ${i + 1}](${img})`).join('\n\n');
        content = summary + imageSection;
      }

      try {
        await prisma.blogPost.create({
          data: {
            title: article.title,
            slug,
            content: content,
            excerpt: summary.slice(0, 200) + '...',
            sourceUrl: article.link,
            category: 'GST',
            status: 'published',
          },
        });
        posted++;
        logger.info({ title: article.title }, 'Article posted');
      } catch (err) {
        if (err.code === 'P2002') {
          logger.info({ title: article.title }, 'Skipping (duplicate slug)');
        } else {
          logger.error({ err: err.message, title: article.title }, 'Failed to insert article');
        }
      }
    }

    logger.info({ posted }, 'GST Blog Bot cycle complete');
    return posted;
  } catch (err) {
    logger.error({ err: err.message }, 'GST Blog Bot error');
    return 0;
  }
}

module.exports = { processArticles, fetchLatestArticles };
