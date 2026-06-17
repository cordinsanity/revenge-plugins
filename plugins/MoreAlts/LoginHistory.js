import { storage } from "@vendetta/plugin";
import { encryptToken, decryptToken } from "./PasswordUtils.js";

const MAX_ENTRIES = 100;

// Adds a login history entry (encrypted at rest)
// entry: { action: 'switch'|'add'|'remove'|'login_failed', username, accountId?, detail? }
async function addHistoryEntry(entry) {
  if (!storage.settings?.enableLoginHistory) return;
  try {
    if (!storage.loginHistory) storage.loginHistory = [];
    const encKey = storage.settings?.tokenEncryptionKey;
    const data = JSON.stringify({ ...entry, timestamp: Date.now() });
    const stored = encKey ? await encryptToken(data, encKey) : data;
    storage.loginHistory.unshift(stored);
    if (storage.loginHistory.length > MAX_ENTRIES) {
      storage.loginHistory = storage.loginHistory.slice(0, MAX_ENTRIES);
    }
  } catch (e) {
    console.error("LoginHistory write error:", e);
  }
}

async function getHistory() {
  if (!storage.loginHistory?.length) return [];
  const encKey = storage.settings?.tokenEncryptionKey;
  const result = [];
  for (const raw of storage.loginHistory) {
    try {
      const str = (encKey && raw.startsWith("enc:")) ? await decryptToken(raw, encKey) : raw;
      result.push(JSON.parse(str));
    } catch (_) {
      // skip corrupted entries
    }
  }
  return result;
}

function clearHistory() {
  storage.loginHistory = [];
}

export { addHistoryEntry, getHistory, clearHistory };
