import { storage, useProxy } from "@vendetta/plugin";
import { after, before } from "@vendetta/patcher";
import { findByProps, findByDisplayName } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { React, ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import patchSidebar from "./SidebarPatcher.js";
import ProxifierSettings from "./Settings.js";

// ─── Defaults ────────────────────────────────────────────────────────────────
if (!storage.enabled)        storage.enabled = false;
if (!storage.proxyUrl)       storage.proxyUrl = "";
if (!storage.proxyMode)      storage.proxyMode = "prepend";
if (!storage.proxyDomains)   storage.proxyDomains = ["discord.com", "discordapp.com"];
if (!storage.profiles)       storage.profiles = [];
if (!storage.activeProfile)  storage.activeProfile = null;
if (!storage.stats)          storage.stats = { proxied: 0, blocked: 0, total: 0 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

function shouldProxy(url) {
  if (!storage.enabled || !storage.proxyUrl) return false;
  const host = getDomain(url);
  return (storage.proxyDomains || []).some(d => host === d || host.endsWith("." + d));
}

function buildProxiedUrl(url) {
  const proxy = (storage.proxyUrl || "").replace(/\/$/, "");
  if (!proxy) return url;
  return storage.proxyMode === "query"
    ? `${proxy}/?url=${encodeURIComponent(url)}`
    : `${proxy}/${url}`;
}

// ─── Fetch Patch ─────────────────────────────────────────────────────────────
let _originalFetch = null;
let _fetchInstalled = false;

function installFetch() {
  if (_fetchInstalled) return;
  _fetchInstalled = true;
  _originalFetch = globalThis.fetch;

  globalThis.fetch = function proxifiedFetch(input, init, ...rest) {
    if (!storage.stats) storage.stats = { proxied: 0, blocked: 0, total: 0 };
    storage.stats.total = (storage.stats.total || 0) + 1;

    try {
      const url = typeof input === "string" ? input : (input?.url ?? String(input));
      if (shouldProxy(url)) {
        storage.stats.proxied = (storage.stats.proxied || 0) + 1;
        const proxied = buildProxiedUrl(url);
        const newInput = typeof input === "string" ? proxied : { ...input, url: proxied };
        return _originalFetch.call(this, newInput, init, ...rest);
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
    const testUrl = "https://discord.com/api/v9/gateway";
    const proxied = buildProxiedUrl(testUrl);
    const res = await (_originalFetch || fetch)(proxied, {
      headers: { "Content-Type": "application/json" },
    });
    const ping = Date.now() - start;
    return res.ok ? { ok: true, ping } : { ok: false, error: `HTTP ${res.status}`, ping };
  } catch (e) {
    return { ok: false, error: e.message, ping: Date.now() - start };
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
      leaked: direct?.ip && proxied?.ip && direct.ip === proxied.ip,
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
  const active = s.enabled && !!s.proxyUrl;
  const proxied = s.stats?.proxied || 0;

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
  const names = [
    "YouBar", "UserPanel", "ConnectedUserPanel", "YouSection",
    "AccountPanelInner", "AccountPanel",
  ];

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

// ─── Plugin lifecycle ─────────────────────────────────────────────────────────
const patches = [];
let unpatchSidebar = null;

export const settings = (props) => React.createElement(ProxifierSettings, {
  ...props,
  storage,
  testProxy,
  checkIpLeak,
  saveProfile,
  loadProfile,
  deleteProfile,
});

export function onLoad() {
  installFetch();

  // Sidebar entry
  try {
    unpatchSidebar = patchSidebar(testProxy);
  } catch {}

  // You Bar button
  const youBarPatches = tryPatchYouBar(() => {
    showToast("Open Discord Settings → Proxifier to configure", 0);
  });
  patches.push(...youBarPatches);
}

export function onUnload() {
  uninstallFetch();
  patches.forEach(p => { try { p(); } catch {} });
  try { unpatchSidebar?.(); } catch {}
}
