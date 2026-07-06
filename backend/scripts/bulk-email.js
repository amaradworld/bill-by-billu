/**
 * Bulk Email Sender for Bill By Billu
 * 
 * Usage:
 *   node scripts/bulk-email.js --csv recipients.csv --template promotion.html
 *   node scripts/bulk-email.js --csv recipients.csv --subject "Check this out" --body "Hello {name}!"
 *
 * CSV format: email,name (first row = header)
 * 
 * Environment variables (set in .env or shell):
 *   SMTP_HOST     - SMTP server (e.g. smtp.brevo.com)
 *   SMTP_PORT     - Port (default: 587)
 *   SMTP_USER     - Your SMTP login/email
 *   SMTP_PASS     - Your SMTP password/API key
 *   SMTP_FROM     - From address (e.g. hello@billbybillu.in)
 *
 * Free service: Brevo (Sendinblue) — 300 emails/day free
 *   1. Sign up at https://www.brevo.com
 *   2. Go to SMTP & API → SMTP tab
 *   3. Use: host=smtp.brevo.com, port=587, user=your-email, pass=your-smtp-key
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ─── Config ───
const DAILY_LIMIT = 280; // Stay under Brevo's 300/day limit
const DELAY_MS = 1000;   // 1 second between emails to avoid rate limits
const BATCH_SIZE = 50;   // Pause after this many emails

// ─── Parse CLI args ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv') opts.csv = args[++i];
    else if (args[i] === '--subject') opts.subject = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--template') opts.template = args[++i];
    else if (args[i] === '--from') opts.from = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--limit') opts.limit = parseInt(args[++i]);
    else if (args[i] === '--delay') opts.delay = parseInt(args[++i]);
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

// ─── Load HTML template ───
function loadTemplate(templatePath) {
  return fs.readFileSync(templatePath, 'utf-8');
}

// ─── Personalize ───
function personalize(html, replacements) {
  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// ─── Sleep ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Main ───
async function main() {
  const opts = parseArgs();
  
  if (!opts.csv) {
    console.error('Usage: node bulk-email.js --csv recipients.csv [--template file.html] [--subject "..."] [--body "..."]');
    console.error('  --csv        Path to CSV file (email,name columns)');
    console.error('  --template   HTML template file (use {name}, {email} placeholders)');
    console.error('  --subject    Email subject line');
    console.error('  --body       Plain text body (or use --template for HTML)');
    console.error('  --from       Sender email (default: SMTP_FROM env)');
    console.error('  --dry-run    Preview without sending');
    console.error('  --limit      Max emails to send');
    console.error('  --delay      Delay between emails in ms (default: 1000)');
    process.exit(1);
  }

  // Load recipients
  const recipients = parseCSV(opts.csv);
  console.log(`Loaded ${recipients.length} recipients from ${opts.csv}`);

  // Apply limit
  const toSend = opts.limit ? recipients.slice(0, opts.limit) : recipients;
  const todaySend = toSend.slice(0, DAILY_LIMIT);
  
  if (toSend.length > DAILY_LIMIT) {
    console.log(`⚠️  Daily limit: ${DAILY_LIMIT}. Sending ${todaySend.length} today, ${toSend.length - DAILY_LIMIT} remaining.`);
  }

  // Load template or body
  let htmlBody;
  if (opts.template) {
    htmlBody = loadTemplate(opts.template);
    console.log(`Template: ${opts.template}`);
  } else if (opts.body) {
    htmlBody = opts.body;
  } else {
    console.error('Error: Provide --template or --body');
    process.exit(1);
  }

  const subject = opts.subject || 'Message from Bill By Billu';
  const from = opts.from || process.env.SMTP_FROM || process.env.SMTP_USER;

  // SMTP config
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (!smtpConfig.host || !smtpConfig.auth.user) {
    console.error('Error: Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables');
    process.exit(1);
  }

  // Dry run
  if (opts.dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`Recipients: ${todaySend.length}`);
    console.log('\nFirst 5:');
    todaySend.slice(0, 5).forEach(r => {
      const personalized = personalize(htmlBody, r);
      console.log(`  To: ${r.email} | Name: ${r.name} | Body preview: ${personalized.substring(0, 100)}...`);
    });
    console.log('\nRun without --dry-run to send.');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport(smtpConfig);
  
  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (err) {
    console.error('❌ SMTP connection failed:', err.message);
    process.exit(1);
  }

  // Send emails
  let sent = 0, failed = 0;
  const delay = opts.delay || DELAY_MS;

  for (let i = 0; i < todaySend.length; i++) {
    const recipient = todaySend[i];
    const personalizedBody = personalize(htmlBody, recipient);

    try {
      await transporter.sendMail({
        from,
        to: recipient.email,
        subject: personalize(subject, recipient),
        html: personalizedBody,
        text: personalizedBody.replace(/<[^>]+>/g, ''), // Strip HTML for text version
      });
      sent++;
      console.log(`[${i + 1}/${todaySend.length}] ✅ Sent to ${recipient.email}`);
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${todaySend.length}] ❌ Failed: ${recipient.email} — ${err.message}`);
    }

    // Delay between emails
    if (i < todaySend.length - 1) {
      // Longer pause after every BATCH_SIZE emails
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(`   ⏸️  Pausing 10s after ${i + 1} emails...`);
        await sleep(10000);
      } else {
        await sleep(delay);
      }
    }
  }

  console.log(`\n📊 Results: ${sent} sent, ${failed} failed out of ${todaySend.length}`);
  
  if (toSend.length > DAILY_LIMIT) {
    console.log(`\n⏰ ${toSend.length - DAILY_LIMIT} emails remaining. Run again tomorrow.`);
    // Save remaining to a file
    const remaining = toSend.slice(DAILY_LIMIT);
    const remainingCsv = 'email,name\n' + remaining.map(r => `${r.email},${r.name}`).join('\n');
    const remainingPath = opts.csv.replace('.csv', '-remaining.csv');
    fs.writeFileSync(remainingPath, remainingCsv);
    console.log(`📄 Remaining list saved to: ${remainingPath}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
