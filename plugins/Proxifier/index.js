import { storage, useProxy } from "@vendetta/plugin";
import { after } from "@vendetta/patcher";
import { findByDisplayName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { React, ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import patchSidebar from "./SidebarPatcher.js";
import ProxifierSettings from "./Settings.js";

// ─── Defaults ────────────────────────────────────────────────────────────────
if (!storage.enabled)          storage.enabled = false;
if (!storage.proxyUrl)         storage.proxyUrl = "";
if (!storage.proxyMode)        storage.proxyMode = "prepend";
if (!storage.proxyDomains)     storage.proxyDomains = ["discord.com", "discordapp.com"];
if (!storage.profiles)         storage.profiles = [];
if (!storage.activeProfile)    storage.activeProfile = null;
if (!storage.stats)            storage.stats = { proxied: 0, total: 0 };
// SNI Bypass defaults
if (!storage.sniBypass)        storage.sniBypass = {};
if (storage.sniBypass.enabled  === undefined) storage.sniBypass.enabled  = false;
if (storage.sniBypass.mode     === undefined) storage.sniBypass.mode     = "doh";  // "doh" | "ip" | "front" | "fakesni"
if (!storage.sniBypass.dohServer) storage.sniBypass.dohServer = "https://cloudflare-dns.com/dns-query";
if (!storage.sniBypass.fakeSni)   storage.sniBypass.fakeSni   = "";
// IP cache for DoH results
const _dohCache = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

function isDiscordDomain(hostname) {
  const targets = storage.proxyDomains?.length
    ? storage.proxyDomains
    : ["discord.com", "discordapp.com", "cdn.discordapp.com", "gateway.discord.gg", "media.discordapp.net"];
  return targets.some(d => hostname === d || hostname.endsWith("." + d));
}

function shouldProxy(url) {
  if (!storage.enabled || !storage.proxyUrl) return false;
  return isDiscordDomain(getDomain(url));
}

function buildProxiedUrl(url) {
  const proxy = (storage.proxyUrl || "").replace(/\/$/, "");
  if (!proxy) return url;
  return storage.proxyMode === "query"
    ? `${proxy}/?url=${encodeURIComponent(url)}`
    : `${proxy}/${url}`;
}

// ─── DoH Resolver ─────────────────────────────────────────────────────────────
// Resolves a hostname to IP via DNS-over-HTTPS.
// Bypasses DNS-level blocking (most common censorship method in Russia/China etc.)
async function resolveViaDoH(hostname) {
  if (_dohCache[hostname]) return _dohCache[hostname];
  const servers = [
    storage.sniBypass.dohServer,
    "https://cloudflare-dns.com/dns-query",
    "https://dns.google/resolve",
  ].filter(Boolean);

  for (const server of servers) {
    try {
      const url = `${server}?name=${encodeURIComponent(hostname)}&type=A`;
      const res = await (_originalFetch || fetch)(url, {
        headers: { Accept: "application/dns-json" },
      });
      const data = await res.json();
      const ip = data.Answer?.find(a => a.type === 1)?.data;
      if (ip) {
        _dohCache[hostname] = ip;
        // Cache expires after 5 minutes
        setTimeout(() => { delete _dohCache[hostname]; }, 5 * 60 * 1000);
        return ip;
      }
    } catch {}
  }
  return null;
}

// ─── SNI Bypass Fetch ────────────────────────────────────────────────────────
// Mode "doh"     — resolve via DoH, connect to real domain (bypasses DNS blocking only)
// Mode "ip"      — resolve via DoH, connect directly to IP (SNI becomes IP = bypasses DPI)
// Mode "fakesni" — add X-SNI-Host header for proxy-level SNI substitution (xray/v2ray/nginx)
// Mode "front"   — domain fronting: connect to an unblocked CDN endpoint
async function applySniBypass(url, init) {
  const bypassMode = storage.sniBypass.mode || "doh";
  const parsed = new URL(url);

  if (bypassMode === "doh") {
    // Just use DoH-resolved DNS — still connects to original domain
    // Mainly useful when ISP blocks DNS but not IP/SNI
    const ip = await resolveViaDoH(parsed.hostname);
    if (!ip) return null;
    // Still use hostname in URL so SSL certificate validation works
    return { url, init };
  }

  if (bypassMode === "ip") {
    // Connect directly to IP — SNI in TLS handshake becomes the IP address (not the blocked domain)
    // Discord's Cloudflare-backed infrastructure handles this
    const ip = await resolveViaDoH(parsed.hostname);
    if (!ip) return null;
    const ipUrl = url.replace(parsed.hostname, ip);
    const headers = Object.assign({}, init?.headers || {}, { "Host": parsed.hostname });
    return { url: ipUrl, init: { ...init, headers } };
  }

  if (bypassMode === "fakesni") {
    // For use with v2ray/xray/nginx proxies that support SNI routing.
    // Sends X-SNI-Host header telling the proxy to use a different SNI.
    const fakeSni = storage.sniBypass.fakeSni || "www.microsoft.com";
    const headers = Object.assign({}, init?.headers || {}, {
      "X-SNI-Host": fakeSni,
      "X-Forwarded-Host": parsed.hostname,
    });
    return { url, init: { ...init, headers } };
  }

  if (bypassMode === "front") {
    // Domain fronting: TLS SNI = allowed domain, HTTP Host = real destination
    // Only works if both domains share a CDN/reverse proxy (e.g. Cloudflare)
    const frontDomain = storage.sniBypass.frontDomain || "www.cloudflare.com";
    const ip = await resolveViaDoH(frontDomain);
    if (!ip) return null;
    const frontUrl = url.replace(parsed.hostname, ip || frontDomain);
    const headers = Object.assign({}, init?.headers || {}, {
      "Host": parsed.hostname,
      "X-Forwarded-Host": parsed.hostname,
    });
    return { url: frontUrl, init: { ...init, headers } };
  }

  return null;
}

// ─── Fetch Patch ─────────────────────────────────────────────────────────────
let _originalFetch = null;
let _fetchInstalled = false;

function installFetch() {
  if (_fetchInstalled) return;
  _fetchInstalled = true;
  _originalFetch = globalThis.fetch;

  globalThis.fetch = async function proxifiedFetch(input, init, ...rest) {
    if (!storage.stats) storage.stats = { proxied: 0, total: 0 };
    storage.stats.total = (storage.stats.total || 0) + 1;

    try {
      const url = typeof input === "string" ? input : (input?.url ?? String(input));
      const hostname = getDomain(url);
      const isDiscord = isDiscordDomain(hostname);

      // 1 — Proxy routing (highest priority)
      if (shouldProxy(url)) {
        storage.stats.proxied = (storage.stats.proxied || 0) + 1;
        const proxied = buildProxiedUrl(url);
        const newInput = typeof input === "string" ? proxied : { ...input, url: proxied };

        // If proxy + fakeSni mode: also add SNI hint headers
        if (storage.sniBypass.enabled && storage.sniBypass.mode === "fakesni" && storage.sniBypass.fakeSni) {
          const extra = { "X-SNI-Host": storage.sniBypass.fakeSni, "X-Forwarded-Host": hostname };
          const mergedInit = { ...init, headers: Object.assign({}, init?.headers || {}, extra) };
          return _originalFetch.call(this, newInput, mergedInit, ...rest);
        }

        return _originalFetch.call(this, newInput, init, ...rest);
      }

      // 2 — SNI bypass for Discord domains (without proxy)
      if (storage.sniBypass.enabled && isDiscord) {
        const bypassed = await applySniBypass(url, init);
        if (bypassed) {
          storage.stats.proxied = (storage.stats.proxied || 0) + 1;
          const newInput = typeof input === "string" ? bypassed.url : { ...input, url: bypassed.url };
          return _originalFetch.call(this, newInput, bypassed.init, ...rest);
        }
      }
    } catch {}

    return _originalFetch.call(this, input, init, ...rest);
  };
}

function uninstallFetch() {
  if (!_fetchInstalled || !_originalFetch) return;
  globalThis.fetch = _originalFetch;
  _originalFetch = null;
  _fetchInstalled = false;
}

// ─── Proxy Test ──────────────────────────────────────────────────────────────
export async function testProxy() {
  if (!storage.proxyUrl) return { ok: false, error: "No proxy URL configured" };
  const start = Date.now();
  try {
    const proxied = buildProxiedUrl("https://discord.com/api/v9/gateway");
    const res = await (_originalFetch || fetch)(proxied);
    const ping = Date.now() - start;
    return res.ok ? { ok: true, ping } : { ok: false, error: `HTTP ${res.status}`, ping };
  } catch (e) {
    return { ok: false, error: e.message, ping: Date.now() - start };
  }
}

// ─── DoH Test ────────────────────────────────────────────────────────────────
export async function testDoH() {
  const start = Date.now();
  try {
    const ip = await resolveViaDoH("discord.com");
    const ping = Date.now() - start;
    return ip ? { ok: true, ip, ping } : { ok: false, error: "No A record returned", ping };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── IP Leak Check ───────────────────────────────────────────────────────────
export async function checkIpLeak() {
  try {
    const [direct, proxied] = await Promise.all([
      (_originalFetch || fetch)("https://api.ipify.org?format=json").then(r => r.json()).catch(() => null),
      storage.proxyUrl
        ? (_originalFetch || fetch)(buildProxiedUrl("https://api.ipify.org?format=json")).then(r => r.json()).catch(() => null)
        : null,
    ]);
    return {
      directIp: direct?.ip || "unknown",
      proxiedIp: proxied?.ip || null,
      leaked: !!(direct?.ip && proxied?.ip && direct.ip === proxied.ip),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Profile Management ───────────────────────────────────────────────────────
export function saveProfile(name) {
  if (!name?.trim()) return;
  const profiles = storage.profiles || [];
  const existing = profiles.findIndex(p => p.name === name);
  const profile = {
    name,
    proxyUrl: storage.proxyUrl,
    proxyMode: storage.proxyMode,
    proxyDomains: [...(storage.proxyDomains || [])],
    sniBypass: { ...storage.sniBypass },
    createdAt: Date.now(),
  };
  if (existing >= 0) profiles[existing] = profile;
  else profiles.push(profile);
  storage.profiles = profiles;
  storage.activeProfile = name;
  showToast(`Profile "${name}" saved`, 0);
}

export function loadProfile(name) {
  const profile = (storage.profiles || []).find(p => p.name === name);
  if (!profile) return;
  storage.proxyUrl = profile.proxyUrl;
  storage.proxyMode = profile.proxyMode;
  storage.proxyDomains = [...profile.proxyDomains];
  if (profile.sniBypass) storage.sniBypass = { ...profile.sniBypass };
  storage.activeProfile = name;
  showToast(`Profile "${name}" loaded`, 0);
}

export function deleteProfile(name) {
  storage.profiles = (storage.profiles || []).filter(p => p.name !== name);
  if (storage.activeProfile === name) storage.activeProfile = null;
}

// ─── You Bar Status Button ────────────────────────────────────────────────────
function ProxyStatusButton({ onPress }) {
  const s = useProxy(storage);
  const active = (s.enabled && !!s.proxyUrl) || (s.sniBypass?.enabled);

  return React.createElement(
    ReactNative.TouchableOpacity,
    {
      onPress,
      onLongPress: () => {
        storage.enabled = !storage.enabled;
        showToast(storage.enabled ? "🔀 Proxy ON" : "⚪ Proxy OFF", 0);
      },
      accessibilityLabel: "Proxifier",
      style: {
        width: 44, height: 44,
        alignItems: "center", justifyContent: "center",
        borderRadius: 22,
        backgroundColor: active ? "rgba(67,181,129,0.2)" : "transparent",
        marginHorizontal: 2,
      }
    },
    React.createElement(ReactNative.View, { style: { alignItems: "center" } },
      React.createElement(ReactNative.Text, { style: { fontSize: 18 } }, "🔀"),
      React.createElement(ReactNative.View, {
        style: {
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: active ? "#43B581" : "#f04747",
          position: "absolute", bottom: -2, right: -2,
        }
      })
    )
  );
}

function tryPatchYouBar(openSettings) {
  const patches = [];
  const names = ["YouBar", "UserPanel", "ConnectedUserPanel", "YouSection", "AccountPanelInner", "AccountPanel"];

  for (const name of names) {
    try {
      const mod = findByDisplayName(name, false);
      if (!mod?.default || typeof mod.default !== "function") continue;

      patches.push(after("default", mod, ([props], res) => {
        if (!res) return res;
        try {
          const bellContainer = findInReactTree(res, node => {
            if (!node?.props?.children || !Array.isArray(node.props.children)) return false;
            return node.props.children.some(c =>
              c?.props?.accessibilityLabel?.toLowerCase().includes("notif") ||
              c?.props?.accessibilityLabel?.toLowerCase().includes("bell") ||
              c?.type?.displayName?.toLowerCase?.().includes("bell")
            );
          });
          if (bellContainer) {
            const kids = Array.isArray(bellContainer.props.children)
              ? [...bellContainer.props.children]
              : [bellContainer.props.children].filter(Boolean);
            kids.unshift(React.createElement(ProxyStatusButton, { key: "__proxy__", onPress: openSettings }));
            bellContainer.props.children = kids;
          }
        } catch {}
        return res;
      }));
      break;
    } catch {}
  }
  return patches;
}

// ─── Plugin Lifecycle ─────────────────────────────────────────────────────────
const patches = [];
let unpatchSidebar = null;

export const settings = (props) => React.createElement(ProxifierSettings, {
  ...props, storage, testProxy, testDoH, checkIpLeak, saveProfile, loadProfile, deleteProfile,
});

export function onLoad() {
  installFetch();
  try { unpatchSidebar = patchSidebar(testProxy); } catch {}
  patches.push(...tryPatchYouBar(() => {
    showToast("Open Discord Settings → Proxifier to configure", 0);
  }));
}

export function onUnload() {
  uninstallFetch();
  patches.forEach(p => { try { p(); } catch {} });
  try { unpatchSidebar?.(); } catch {}
}
