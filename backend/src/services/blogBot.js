const RssParser = require('rss-parser');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const OpenAI = require('openai');
const prisma = require('../prisma');
const logger = require('../logger');

const parser = new RssParser();

const RSS_URL = 'https://news.google.com/rss/search?q=GST+India+update&hl=en-IN&gl=IN';
const MAX_ARTICLES = 5;
const MAX_SUMMARY_WORDS = 250;

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function fetchLatestArticles() {
  const feed = await parser.parseURL(RSS_URL);
  const items = (feed.items || []).slice(0, MAX_ARTICLES);

  return items.map(item => ({
    title: item.title?.trim(),
    link: item.link?.split('?')[0],
    snippet: item.contentSnippet?.trim(),
    pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    source: item.source?.name || item.link,
  }));
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
  return article ? article.textContent : null;
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

      let body;
      try {
        body = await extractArticleContent(article.link);
      } catch (err) {
        logger.warn({ err: err.message, url: article.link }, 'Failed to extract content');
        continue;
      }

      if (!body || body.length < 100) {
        logger.warn({ title: article.title }, 'Skipping (too short)');
        continue;
      }

      const summary = await summarize(body, article.title);
      const slug = slugify(article.title);

      try {
        await prisma.blogPost.create({
          data: {
            title: article.title,
            slug,
            content: summary,
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
