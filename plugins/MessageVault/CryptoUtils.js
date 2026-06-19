// Generates a random AES-256-GCM key as base64
async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Encrypts a string with AES-GCM. Returns "enc:<base64(iv+ciphertext)>"
async function encryptText(text, keyB64) {
  if (text === undefined || text === null) return text;
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return "enc:" + btoa(String.fromCharCode(...combined));
}

// Decrypts a string produced by encryptText. Returns the input unchanged if it isn't encrypted.
async function decryptText(encText, keyB64) {
  if (typeof encText !== "string" || !encText.startsWith("enc:")) return encText;
  if (!keyB64) return encText;
  try {
    const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const combined = Uint8Array.from(atob(encText.slice(4)), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "*(failed to decrypt)*";
  }
}

export { generateEncryptionKey, encryptText, decryptText };
