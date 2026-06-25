const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_KEY = path.join('C:\\Users\\alokg\\Downloads\\plenary-atrium-454417-i8-21f9fa5c2bef.json');
const AAB_FILE = path.join('C:\\Users\\alokg\\Downloads\\BillByBillu-v1.0.6.aab');
const PACKAGE_NAME = 'com.BillbBillu';
const TRACK = 'alpha';

async function uploadAAB() {
  console.log('Authenticating with Google Play...');

  const key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidpublisher = google.androidpublisher({ version: 'v3', auth });

  // Step 1: Create edit
  console.log('Creating edit...');
  const edit = await androidpublisher.edits.insert({
    packageName: PACKAGE_NAME,
    resource: { id: undefined, expiresAt: undefined },
  });
  const editId = edit.data.id;
  console.log(`Edit ID: ${editId}`);

  try {
    // Step 2: Upload AAB
    console.log('Uploading AAB...');
    const aabFile = fs.createReadStream(AAB_FILE);
    const upload = await androidpublisher.edits.bundles.upload({
      packageName: PACKAGE_NAME,
      editId: editId,
      media: {
        mimeType: 'application/octet-stream',
        body: aabFile,
      },
    });
    console.log(`Upload complete. Version Code: ${upload.data.versionCode}`);

    // Step 3: Update track
    console.log(`Setting track to ${TRACK}...`);
    await androidpublisher.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId: editId,
      track: TRACK,
      resource: {
        releases: [{
          versionCodes: [String(upload.data.versionCode)],
          status: 'completed',
        }],
      },
    });

    // Step 4: Commit
    console.log('Committing changes...');
    await androidpublisher.edits.commit({
      packageName: PACKAGE_NAME,
      editId: editId,
    });

    console.log('SUCCESS! AAB uploaded to Play Store (alpha track)');
    console.log(`Version: 1.0.6 (code ${upload.data.versionCode})`);
  } catch (err) {
    console.error('Upload failed:', err.message);
    // Delete the edit on failure
    try {
      await androidpublisher.edits.delete({ packageName: PACKAGE_NAME, editId: editId });
    } catch {}
    process.exit(1);
  }
}

uploadAAB().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
