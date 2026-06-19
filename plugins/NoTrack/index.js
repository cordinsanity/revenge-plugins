import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import NoTrackSettings from "./Settings.js";

// Defaults
if (!storage.settings) storage.settings = {};
if (storage.settings.enabled === undefined) storage.settings.enabled = true;
if (storage.settings.blockScience === undefined) storage.settings.blockScience = true;
if (storage.settings.blockSentry === undefined) storage.settings.blockSentry = true;
if (storage.settings.blockThirdPartyAnalytics === undefined) storage.settings.blockThirdPartyAnalytics = true;
if (!storage.stats) storage.stats = { blocked: 0, total: 0 };

// Discord's own telemetry/analytics endpoints
const SCIENCE_PATTERNS = [
  /\/api\/v\d+\/science\b/,
  /\/api\/v\d+\/metrics\b/,
  /\/api\/v\d+\/applications\/detectable\b/,
  /\/api\/v\d+\/.*\/analytics\b/,
];

// Crash/error reporting that ships full stack traces + device info off-device
const SENTRY_PATTERNS = [
  /sentry\.io/,
  /\.ingest\.sentry\.io/,
];

// Common third-party analytics/ad/tracking domains that Discord webviews or
// embedded content can pull in
const THIRDPARTY_PATTERNS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /doubleclick\.net/,
  /facebook\.com\/tr\b/,
  /segment\.io/,
  /amplitude\.com/,
  /mixpanel\.com/,
];

function matchesAny(url, patterns) {
  return patterns.some(p => p.test(url));
}

function classify(url) {
  if (storage.settings.blockScience && matchesAny(url, SCIENCE_PATTERNS)) return "science";
  if (storage.settings.blockSentry && matchesAny(url, SENTRY_PATTERNS)) return "sentry";
  if (storage.settings.blockThirdPartyAnalytics && matchesAny(url, THIRDPARTY_PATTERNS)) return "thirdparty";
  return null;
}

let _originalFetch = null;
let _installed = false;

function installFetchPatch() {
  if (_installed) return;
  _installed = true;
  _originalFetch = globalThis.fetch;

  globalThis.fetch = async function noTrackFetch(input, init, ...rest) {
    if (!storage.settings.enabled) {
      return _originalFetch.call(this, input, init, ...rest);
    }

    try {
      const url = typeof input === "string" ? input : (input?.url ?? String(input));
      storage.stats.total = (storage.stats.total || 0) + 1;

      const reason = classify(url);
      if (reason) {
        storage.stats.blocked = (storage.stats.blocked || 0) + 1;
        return new Response(JSON.stringify({ blocked: true, by: "NoTrack", reason }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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

export const settings = (props) => React.createElement(NoTrackSettings, { ...props, storage });

export function onLoad() {
  try { installFetchPatch(); } catch (e) { console.error("[NoTrack] installFetchPatch failed:", e); }
}

export function onUnload() {
  uninstallFetchPatch();
}
