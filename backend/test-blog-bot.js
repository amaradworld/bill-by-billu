const { processArticles, fetchLatestArticles } = require('./src/services/blogBot');

async function test() {
  console.log('=== Testing Blog Bot (fixed) ===\n');
  
  console.log('1. Fetching articles from RSS feeds...');
  const articles = await fetchLatestArticles();
  console.log(`   Found ${articles.length} GST-related articles\n`);
  
  for (const a of articles) {
    console.log(`   - ${a.title.substring(0, 70)}`);
    console.log(`     Source: ${a.source} | URL: ${a.link.substring(0, 60)}...`);
  }
  
  if (articles.length > 0) {
    console.log('\n2. Running full pipeline (would insert to DB on Render)...');
    // Don't actually run processArticles locally (no DB), just test fetch + extract
    const { JSDOM } = require('jsdom');
    const { Readability } = require('@mozilla/readability');
    
    const first = articles[0];
    console.log(`   Testing extraction: ${first.title.substring(0, 50)}...`);
    try {
      const resp = await fetch(first.link, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      console.log(`   Fetch status: ${resp.status}`);
      if (resp.ok) {
        const html = await resp.text();
        const dom = new JSDOM(html, { url: first.link });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article) {
          console.log(`   Content: ${article.textContent?.length} chars`);
          console.log(`   Preview: ${article.textContent?.substring(0, 120)}...`);
        } else {
          console.log('   Readability: FAILED');
        }
      }
    } catch(e) {
      console.log(`   Error: ${e.message}`);
    }
  }
  
  console.log('\n=== Test complete ===');
}

test().catch(e => { console.error('Fatal:', e); process.exit(1); });
