import { storage, useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import ProxifierSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (storage.enabled === undefined) storage.enabled = false;
if (!storage.proxyUrl) storage.proxyUrl = "";
if (!storage.proxyMode) storage.proxyMode = "prepend";
if (!storage.proxyDomains) storage.proxyDomains = ["discord.com", "discordapp.com"];

const DISCORD_DOMAINS = [
  "discord.com", "discordapp.com", "cdn.discordapp.com",
  "media.discordapp.net", "gateway.discord.gg",
];

let _originalFetch = null;
let _installed = false;

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

function shouldProxy(url) {
  if (!storage.enabled || !storage.proxyUrl) return false;
  const domain = getDomain(url);
  const targets = storage.proxyDomains || [];
  return targets.some(d => domain === d || domain.endsWith("." + d));
}

function buildProxiedUrl(originalUrl) {
  const proxy = storage.proxyUrl;
  if (!proxy) return originalUrl;
  const mode = storage.proxyMode || "prepend";
  if (mode === "query") return `${proxy}${encodeURIComponent(originalUrl)}`;
  // prepend
  return `${proxy.replace(/\/$/, "")}/${originalUrl}`;
}

function installFetchPatch() {
  if (_installed) return;
  _installed = true;
  _originalFetch = globalThis.fetch;

  globalThis.fetch = function proxifiedFetch(input, init, ...rest) {
    try {
      const url = typeof input === "string" ? input : input?.url || String(input);
      if (shouldProxy(url)) {
        const proxiedUrl = buildProxiedUrl(url);
        const newInput = typeof input === "string" ? proxiedUrl : { ...input, url: proxiedUrl };
        return _originalFetch.call(this, newInput, init, ...rest);
      }
    } catch {}
    return _originalFetch.call(this, input, init, ...rest);
  };
}

function uninstallFetchPatch() {
  if (!_installed || !_originalFetch) return;
  globalThis.fetch = _originalFetch;
  _originalFetch = null;
  _installed = false;
}

async function testProxy() {
  if (!storage.proxyUrl) return { ok: false, error: "No proxy URL set" };
  const start = Date.now();
  try {
    const testUrl = "https://discord.com/api/v9/gateway";
    const proxiedUrl = buildProxiedUrl(testUrl);
    const res = await (_originalFetch || fetch)(proxiedUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    const ping = Date.now() - start;
    if (res.ok) {
      return { ok: true, ping };
    }
    return { ok: false, error: `HTTP ${res.status}`, ping };
  } catch (e) {
    return { ok: false, error: e.message, ping: Date.now() - start };
  }
}

export const settings = (props) => ProxifierSettings({ ...props, storage, testProxy });

export function onLoad() {
  installFetchPatch();
}

export function onUnload() {
  uninstallFetchPatch();
}
