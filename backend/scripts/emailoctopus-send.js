/**
 * EmailOctopus Bulk Sender
 * 
 * Sign up free at https://emailoctopus.com (2,500 emails/month free)
 * 
 * Setup:
 *   1. Create account → API Keys → Get your API key
 *   2. Create a list → Note the list ID from the URL
 *   3. Set env: EMAILOCTOPUS_API_KEY=your-key
 *   4. Run: node scripts/emailoctopus-send.js --csv recipients.csv --list LIST_ID
 *
 * Or just use the web dashboard:
 *   1. Lists → Import → Upload CSV
 *   2. Campaigns → Create → HTML editor → Send
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.EMAILOCTOPUS_API_KEY;
const BASE_URL = 'https://api.emailoctopus.com';

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
      email_address: cols[emailIdx],
      name: nameIdx >= 0 ? cols[nameIdx] : undefined,
    };
  }).filter(r => r.email_address && r.email_address.includes('@'));
}

// ─── API helpers ───
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `MgAeAGI_5_1_aBcDeFgHiJkLmNoPqRsT.${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`API ${resp.status}: ${JSON.stringify(err)}`);
  }
  return resp.json();
}

// ─── Add contacts to list in batches ───
async function addContacts(listId, contacts) {
  const BATCH = 100; // EmailOctopus limit per batch
  let added = 0;

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    console.log(`Adding batch ${Math.floor(i / BATCH) + 1}: contacts ${i + 1}-${i + batch.length}...`);

    try {
      const result = await apiFetch(`/lists/${listId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({
          api_key: API_KEY,
          contacts: batch.map(c => ({
            email_address: c.email_address,
            name: c.name,
            status: 'SUBSCRIBED',
          })),
        }),
      });
      added += batch.length;
      console.log(`  ✅ Added ${batch.length} contacts`);
    } catch (err) {
      console.error(`  ❌ Batch failed: ${err.message}`);
    }

    // Rate limit: 1 req/sec
    if (i + BATCH < contacts.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return added;
}

// ─── Create and send campaign ───
async function createCampaign(listId, subject, htmlContent) {
  // Create campaign
  const campaign = await apiFetch('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      api_key: API_KEY,
      name: `Promo ${new Date().toISOString().slice(0, 10)}`,
      subject,
      content: { html: htmlContent },
      recipient_list: { id: listId },
    }),
  });

  console.log(`Campaign created: ${campaign.id}`);

  // Send immediately
  await apiFetch(`/campaigns/${campaign.id}/actions/send`, {
    method: 'POST',
    body: JSON.stringify({ api_key: API_KEY }),
  });

  console.log('Campaign sent!');
  return campaign;
}

// ─── Main ───
async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.includes('--csv') ? args[args.indexOf('--csv') + 1] : null;
  const listId = args.includes('--list') ? args[args.indexOf('--list') + 1] : null;
  const subject = args.includes('--subject') ? args[args.indexOf('--subject') + 1] : 'Check out Bill By Billu';
  const dryRun = args.includes('--dry-run');

  if (!csvPath || !listId) {
    console.log('Usage:');
    console.log('  node emailoctopus-send.js --csv recipients.csv --list LIST_ID [--subject "..."] [--dry-run]');
    console.log('');
    console.log('Steps:');
    console.log('  1. Sign up at https://emailoctopus.com');
    console.log('  2. API Keys → Copy your API key');
    console.log('  3. Set: EMAILOCTOPUS_API_KEY=your-key');
    console.log('  4. Lists → Create list → Copy list ID from URL');
    console.log('  5. Run the command above');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('Error: Set EMAILOCTOPUS_API_KEY environment variable');
    process.exit(1);
  }

  const contacts = parseCSV(csvPath);
  console.log(`Loaded ${contacts.length} contacts from ${csvPath}`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`List ID: ${listId}`);
    console.log(`Subject: ${subject}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log('\nFirst 5:');
    contacts.slice(0, 5).forEach(c => console.log(`  ${c.email_address} (${c.name || 'no name'})`));
    return;
  }

  // Add contacts
  console.log('\n--- Adding contacts ---');
  const added = await addContacts(listId, contacts);
  console.log(`\n✅ ${added} contacts added to list ${listId}`);

  // For campaign creation, read HTML template
  const templatePath = args.includes('--template') ? args[args.indexOf('--template') + 1] : null;
  if (templatePath) {
    const html = fs.readFileSync(templatePath, 'utf-8');
    console.log('\n--- Creating campaign ---');
    await createCampaign(listId, subject, html);
  } else {
    console.log('\n💡 Contacts added. Now create campaign from the web dashboard:');
    console.log('   https://app.emailoctopus.com/campaigns/create');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
