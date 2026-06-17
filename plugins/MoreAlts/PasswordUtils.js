// PBKDF2 password hashing with random salt
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const toHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${toHex(salt.buffer)}$${toHex(bits)}`;
}

// Returns true if password matches a stored PBKDF2 hash (saltHex$hashHex)
async function verifyPassword(password, stored) {
  if (!stored || !stored.includes("$")) return false;
  const [saltHex, expectedHash] = stored.split("$");
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const computed = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === expectedHash;
}

// Generates a random AES-256-GCM master key as base64
async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Generates a random per-account salt as base64
function generateAccountSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

// Derives a per-account AES key from master key + account-specific salt using HKDF
async function _deriveAccountKey(masterKeyB64, saltB64) {
  const masterBytes = Uint8Array.from(atob(masterKeyB64), c => c.charCodeAt(0));
  const saltBytes = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const baseKey = await crypto.subtle.importKey("raw", masterBytes, "HKDF", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: saltBytes, info: new Uint8Array(0) },
    baseKey, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(derived)));
}

// Encrypts a token with AES-GCM. Returns "enc:<base64(iv+ciphertext)>"
async function encryptToken(token, keyB64) {
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return "enc:" + btoa(String.fromCharCode(...combined));
}

// Decrypts a token produced by encryptToken
async function decryptToken(encryptedToken, keyB64) {
  if (!encryptedToken?.startsWith("enc:")) return encryptedToken; // legacy plaintext
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const combined = Uint8Array.from(atob(encryptedToken.slice(4)), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// Per-account-salt variants — each account uses its own HKDF-derived key
async function encryptTokenWithSalt(token, masterKeyB64, saltB64) {
  const accountKey = await _deriveAccountKey(masterKeyB64, saltB64);
  return encryptToken(token, accountKey);
}

async function decryptTokenWithSalt(encryptedToken, masterKeyB64, saltB64) {
  const accountKey = await _deriveAccountKey(masterKeyB64, saltB64);
  return decryptToken(encryptedToken, accountKey);
}

// Unified helper: picks correct decrypt method based on account data + settings
async function getDecryptedToken(account, settings) {
  const encKey = settings?.tokenEncryptionKey;
  if (!encKey) return account.token;
  if (account.tokenSalt && settings?.enablePerAccountSalt) {
    return decryptTokenWithSalt(account.token, encKey, account.tokenSalt);
  }
  return decryptToken(account.token, encKey);
}

// Unified helper: picks correct encrypt method based on settings
// Returns { token, tokenSalt? }
async function getEncryptedTokenData(plainToken, settings) {
  const encKey = settings?.tokenEncryptionKey;
  if (!encKey) return { token: plainToken };
  if (settings?.enablePerAccountSalt) {
    const salt = generateAccountSalt();
    const token = await encryptTokenWithSalt(plainToken, encKey, salt);
    return { token, tokenSalt: salt };
  }
  return { token: await encryptToken(plainToken, encKey) };
}

// Memory wipe: decrypts token, runs callback(plainToken), then zeros internal buffer
// Best-effort — JS strings are immutable but we clear the underlying ArrayBuffer
async function decryptTokenWithWipe(encryptedToken, keyB64, saltB64, callback) {
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const effectiveKey = saltB64 ? await _deriveAccountKey(keyB64, saltB64) : keyB64;
  const actualKeyBytes = Uint8Array.from(atob(effectiveKey), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", actualKeyBytes, "AES-GCM", false, ["decrypt"]);
  const token = encryptedToken.startsWith("enc:") ? encryptedToken : ("enc:" + encryptedToken);
  const combined = Uint8Array.from(atob(token.slice(4)), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decryptedBuf = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data));
  const plainToken = new TextDecoder().decode(decryptedBuf);
  try {
    await callback(plainToken);
  } finally {
    decryptedBuf.fill(0); // zero out buffer after use
  }
}

export {
  hashPassword,
  verifyPassword,
  generateEncryptionKey,
  generateAccountSalt,
  encryptToken,
  decryptToken,
  encryptTokenWithSalt,
  decryptTokenWithSalt,
  getDecryptedToken,
  getEncryptedTokenData,
  decryptTokenWithWipe,
};
