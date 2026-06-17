import { findByProps } from "@vendetta/metro";
import { addLog } from "./Logger.js";

// Biometric authentication via Discord's bundled React Native modules
async function authenticateWithBiometric(reason = "Verify to access Account Switcher") {
  try {
    const TouchID = findByProps("isSupported", "authenticate")
                 || findByProps("isSensorAvailable", "authenticate");
    if (!TouchID) {
      addLog('warn', 'Biometric: no module found');
      return { success: false, error: "Biometric not available" };
    }

    const supported = await (TouchID.isSupported?.() ?? TouchID.isSensorAvailable?.());
    if (!supported) return { success: false, error: "Biometric not supported on this device" };

    await TouchID.authenticate(reason, { passcodeFallback: false, unifiedErrors: false });
    addLog('info', 'Biometric auth successful');
    return { success: true };
  } catch (e) {
    addLog('warn', 'Biometric auth failed', { error: e.message });
    return { success: false, error: e.message };
  }
}

// Screenshot protection — best effort, depends on what Discord bundles
function enableScreenshotProtection() {
  try {
    const { NativeModules } = require("react-native");
    const mod = NativeModules.RNPreventScreenshot
             || NativeModules.ScreenshotPrevent
             || NativeModules.RNScreenshotPrevent
             || NativeModules.PreventScreenshot;
    if (mod?.forbid) { mod.forbid(); addLog('info', 'Screenshot protection enabled'); return true; }
    if (mod?.enable) { mod.enable(); addLog('info', 'Screenshot protection enabled'); return true; }
    if (NativeModules.UIManager?.setFlagSecure) {
      NativeModules.UIManager.setFlagSecure(true);
      return true;
    }
    addLog('warn', 'Screenshot protection: no native module found');
    return false;
  } catch (e) {
    addLog('warn', 'Screenshot protection unavailable', { error: e.message });
    return false;
  }
}

function disableScreenshotProtection() {
  try {
    const { NativeModules } = require("react-native");
    const mod = NativeModules.RNPreventScreenshot
             || NativeModules.ScreenshotPrevent
             || NativeModules.RNScreenshotPrevent
             || NativeModules.PreventScreenshot;
    if (mod?.permit) { mod.permit(); return; }
    if (mod?.disable) { mod.disable(); return; }
    if (NativeModules.UIManager?.setFlagSecure) NativeModules.UIManager.setFlagSecure(false);
  } catch (e) {}
}

// Checks active Discord sessions and warns about unknown ones
// Stores known session IDs in storage.settings.knownSessions
async function checkUnknownDevices(storage, plainToken) {
  if (!storage.settings?.enableUnknownDeviceWarning) return null;
  try {
    const res = await fetch("https://discord.com/api/v9/auth/sessions", {
      headers: { Authorization: plainToken }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sessions = data.user_sessions || [];

    const known = new Set(storage.settings.knownSessions || []);
    const unknown = sessions.filter(s => !known.has(s.id_hash));

    // Update known list
    storage.settings.knownSessions = sessions.map(s => s.id_hash);

    if (unknown.length > 0) {
      addLog('warn', 'Unknown sessions detected', { count: unknown.length });
      return unknown.map(s => ({
        id: s.id_hash,
        client: s.client_info?.client || 'Unknown',
        os: s.client_info?.os || 'Unknown',
        location: s.approx_last_used_time || 'Unknown'
      }));
    }
    return null;
  } catch (e) {
    addLog('warn', 'Session check failed', { error: e.message });
    return null;
  }
}

// Validates a plaintext token against Discord API without storing the response
async function checkTokenExpiry(plainToken) {
  try {
    const res = await fetch("https://discord.com/api/v9/users/@me", {
      headers: { Authorization: plainToken }
    });
    if (res.status === 401) return { valid: false, reason: "Token expired or invalid" };
    if (!res.ok) return { valid: false, reason: `HTTP ${res.status}` };
    const user = await res.json();
    return { valid: true, username: user.username };
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}

// Randomized request headers to reduce bot-detection fingerprinting
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2; rv:122.0) Gecko/20100101 Firefox/122.0",
];

const LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES"];
const ACCEPT_LANGS = ["en-US,en;q=0.9", "en-GB,en;q=0.9", "de-DE,de;q=0.9,en;q=0.8", "fr-FR,fr;q=0.9,en;q=0.8"];

function getRandomizedHeaders(storage) {
  if (!storage.settings?.enableFingerprintRandomizer) {
    return {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
  }
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const locale = LOCALES[Math.floor(Math.random() * LOCALES.length)];
  const lang = ACCEPT_LANGS[Math.floor(Math.random() * ACCEPT_LANGS.length)];
  const chromeVer = 119 + Math.floor(Math.random() * 4);

  const superProps = btoa(JSON.stringify({
    os: ["Windows", "Mac OS X", "Linux"][Math.floor(Math.random() * 3)],
    browser: "Chrome",
    device: "",
    system_locale: locale,
    browser_version: `${chromeVer}.0.0.0`,
    os_version: "10",
    referrer: "",
    referring_domain: "",
    release_channel: "stable",
    client_build_number: 260000 + Math.floor(Math.random() * 5000),
  }));

  return {
    "Content-Type": "application/json",
    "User-Agent": ua,
    "Accept-Language": lang,
    "X-Discord-Locale": locale,
    "X-Super-Properties": superProps,
  };
}

export {
  authenticateWithBiometric,
  enableScreenshotProtection,
  disableScreenshotProtection,
  checkUnknownDevices,
  checkTokenExpiry,
  getRandomizedHeaders,
};
