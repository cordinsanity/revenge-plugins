import { storage, useProxy } from "@vendetta/plugin";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import TokenGuardSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (!storage.requestLog) storage.requestLog = [];
if (!storage.whitelist) storage.whitelist = [
  "discord.com",
  "discordapp.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "discord.gg",
];
if (storage.settings.enabled === undefined) storage.settings.enabled = true;
if (storage.settings.alertOnSuspicious === undefined) storage.settings.alertOnSuspicious = true;
if (storage.settings.blockSuspicious === undefined) storage.settings.blockSuspicious = false;
if (storage.settings.logRequests === undefined) storage.settings.logRequests = true;
if (storage.settings.logOnlySuspicious === undefined) storage.settings.logOnlySuspicious = false;

const DISCORD_DOMAINS = [
  "discord.com", "discordapp.com", "cdn.discordapp.com",
  "media.discordapp.net", "discord.gg", "discordstatus.com",
  "gateway.discord.gg", "discord.media",
];

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function isSuspicious(url) {
  const domain = getDomain(url);
  const whitelisted = [
    ...DISCORD_DOMAINS,
    ...(storage.whitelist || []),
  ];
  return !whitelisted.some(d => domain === d || domain.endsWith("." + d));
}

function addLog(entry) {
  if (!storage.settings.logRequests) return;
  if (storage.settings.logOnlySuspicious && !entry.suspicious) return;
  const log = storage.requestLog || [];
  log.push(entry);
  // Keep last 200 entries
  if (log.length > 200) log.splice(0, log.length - 200);
  storage.requestLog = log;
}

let _originalFetch = null;
let _installed = false;

function installFetchPatch() {
  if (_installed) return;
  _installed = true;

  _originalFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(input, init, ...rest) {
    if (!storage.settings.enabled) {
      return _originalFetch.call(this, input, init, ...rest);
    }

    const url = typeof input === "string" ? input : input?.url || String(input);
    const method = init?.method || "GET";
    const headers = init?.headers || {};

    // Normalize headers
    let headerObj = {};
    if (headers instanceof Headers) {
      headers.forEach((v, k) => { headerObj[k.toLowerCase()] = v; });
    } else if (Array.isArray(headers)) {
      headers.forEach(([k, v]) => { headerObj[k.toLowerCase()] = v; });
    } else {
      Object.entries(headers).forEach(([k, v]) => { headerObj[k.toLowerCase()] = v; });
    }

    const hasToken = !!(headerObj["authorization"]);
    const domain = getDomain(url);
    const suspicious = hasToken && isSuspicious(url);

    if (hasToken) {
      const entry = {
        time: Date.now(),
        url,
        domain,
        method,
        suspicious,
        blocked: false,
      };

      if (suspicious) {
        entry.blocked = storage.settings.blockSuspicious;

        if (storage.settings.alertOnSuspicious) {
          showToast(`🚨 TokenGuard: Token an ${domain} gesendet!`, 1);
        }

        if (storage.settings.blockSuspicious) {
          addLog({ ...entry, blocked: true });
          // Return a fake response to block the request
          return new Response(JSON.stringify({ error: "Blocked by TokenGuard" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      addLog(entry);
    }

    return _originalFetch.call(this, input, init, ...rest);
  };
}

function uninstallFetchPatch() {
  if (!_installed || !_originalFetch) return;
  globalThis.fetch = _originalFetch;
  _originalFetch = null;
  _installed = false;
}

export const settings = TokenGuardSettings;

export function onLoad() {
  installFetchPatch();
}

export function onUnload() {
  uninstallFetchPatch();
}
