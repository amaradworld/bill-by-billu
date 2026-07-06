/**
 * Brevo (Sendinblue) Bulk Email Sender via API
 * 
 * Usage:
 *   node scripts/brevo-send.js --csv recipients.csv --subject "Check this out" --template templates/promotion.html
 *   node scripts/brevo-send.js --csv recipients.csv --subject "Hello" --body "<h1>Hi {name}!</h1>" --dry-run
 *
 * CSV format: email,name (first row = header)
 * Placeholders: {name}, {email} in subject/body/template
 *
 * Free tier: 300 emails/day. Script handles this automatically.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.BREVO_API_KEY || process.argv.find(a => a.startsWith('--key='))?.split('=')[1];
const DAILY_LIMIT = 280; // Stay under 300/day

// ─── Parse CLI args ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv') opts.csv = args[++i];
    else if (args[i] === '--subject') opts.subject = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--template') opts.template = args[++i];
    else if (args[i] === '--sender') opts.sender = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i]);
  }
  return opts;
}

// ─── Parse CSV ───
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const emailIdx = header.findIndex(h => h === 'email');
  const nameIdx = header.findIndex(h => h === 'name');
  if (emailIdx === -1) throw new Error('CSV must have an "email" column');

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    return {
      email: cols[emailIdx],
      name: nameIdx >= 0 ? cols[nameIdx] : 'there',
    };
  }).filter(r => r.email && r.email.includes('@'));
}

// ─── Personalize ───
function personalize(str, data) {
  return str.replace(/\{name\}/g, data.name || '').replace(/\{email\}/g, data.email || '');
}

// ─── Brevo API call ───
function brevoSend(to, subject, htmlContent, senderEmail) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { email: senderEmail, name: 'Bill By Billu' },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent,
    });

    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Sleep ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Main ───
async function main() {
  const opts = parseArgs();

  if (!opts.csv) {
    console.log('Usage: node brevo-send.js --csv recipients.csv --subject "Subject" [--template file.html | --body "<h1>Hi {name}!</h1>"] [--dry-run] [--limit N]');
    console.log('');
    console.log('Options:');
    console.log('  --csv        CSV file with email,name columns');
    console.log('  --subject    Email subject line');
    console.log('  --template   HTML template file');
    console.log('  --body       HTML body text (inline)');
    console.log('  --sender     Sender email (default: amaradworld@gmail.com)');
    console.log('  --dry-run    Preview without sending');
    console.log('  --limit      Max emails to send');
    console.log('');
    console.log('Set BREVO_API_KEY env var or pass --key=your-key');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('Error: Set BREVO_API_KEY env var or pass --key=your-key');
    process.exit(1);
  }

  // Load recipients
  const recipients = parseCSV(opts.csv);
  console.log(`Loaded ${recipients.length} recipients from ${opts.csv}`);

  // Apply limits
  const toSend = opts.limit ? recipients.slice(0, opts.limit) : recipients;
  const todaySend = toSend.slice(0, DAILY_LIMIT);

  if (toSend.length > DAILY_LIMIT) {
    console.log(`⚠️  Daily limit: ${DAILY_LIMIT}. Sending ${todaySend.length} today, ${toSend.length - DAILY_LIMIT} tomorrow.`);
  }

  // Load HTML content
  let htmlTemplate;
  if (opts.template) {
    htmlTemplate = fs.readFileSync(opts.template, 'utf-8');
  } else if (opts.body) {
    htmlTemplate = opts.body;
  } else {
    console.error('Error: Provide --template or --body');
    process.exit(1);
  }

  const subject = opts.subject || 'Message from Bill By Billu';
  const sender = opts.sender || 'amaradworld@gmail.com';

  // Dry run
  if (opts.dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`From: ${sender}`);
    console.log(`Subject: ${subject}`);
    console.log(`Recipients: ${todaySend.length}`);
    console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
    console.log('\nFirst 5:');
    todaySend.slice(0, 5).forEach(r => {
      const personalized = personalize(htmlTemplate, r);
      console.log(`  To: ${r.email} (${r.name}) | Subject: ${personalize(subject, r)} | HTML: ${personalized.substring(0, 80)}...`);
    });
    console.log('\nRun without --dry-run to send.');
    return;
  }

  // Send emails
  let sent = 0, failed = 0;

  for (let i = 0; i < todaySend.length; i++) {
    const recipient = todaySend[i];
    const personalizedSubject = personalize(subject, recipient);
    const personalizedHtml = personalize(htmlTemplate, recipient);

    try {
      await brevoSend(recipient, personalizedSubject, personalizedHtml, sender);
      sent++;
      console.log(`[${i + 1}/${todaySend.length}] ✅ ${recipient.email}`);
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${todaySend.length}] ❌ ${recipient.email}: ${err.message}`);
    }

    // Rate limit: ~3/sec for free tier
    if (i < todaySend.length - 1) await sleep(350);
  }

  console.log(`\n📊 Sent: ${sent} | Failed: ${failed} | Total: ${todaySend.length}`);

  if (toSend.length > DAILY_LIMIT) {
    const remaining = toSend.slice(DAILY_LIMIT);
    const csv = 'email,name\n' + remaining.map(r => `${r.email},${r.name}`).join('\n');
    const outPath = opts.csv.replace('.csv', '-remaining.csv');
    fs.writeFileSync(outPath, csv);
    console.log(`⏰ ${remaining.length} remaining saved to: ${outPath}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
