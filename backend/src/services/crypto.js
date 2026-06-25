const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Encryption key from env (must be 32+ chars)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'billbybillu-default-encryption-key-change-in-production!';

function deriveKey(salt) {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a string value
 * Returns: base64(salt + iv + tag + encrypted)
 */
function encrypt(text) {
  if (!text) return text;

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypt an encrypted string
 */
function decrypt(encryptedBase64) {
  if (!encryptedBase64) return encryptedBase64;

  // Check if it looks like already-encrypted data (base64 with specific length)
  // If it looks like a normal API key, return as-is (backward compatibility)
  if (encryptedBase64.startsWith('rzp_') || encryptedBase64.startsWith('sk_')) {
    return encryptedBase64;
  }

  try {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    if (buffer.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      return encryptedBase64; // Not encrypted, return as-is
    }

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (err) {
    // If decryption fails, it's probably not encrypted — return as-is
    return encryptedBase64;
  }
}

module.exports = { encrypt, decrypt };
