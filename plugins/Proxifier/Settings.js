import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const { View, Text, Switch, ScrollView, TouchableOpacity, TextInput } = ReactNative;

const C = {
  bg:      "#2f3136",
  card:    "rgba(255,255,255,0.05)",
  border:  "rgba(255,255,255,0.07)",
  green:   "#43B581",
  blue:    "#7289DA",
  red:     "#F04747",
  yellow:  "#FAA61A",
  white:   "#ffffff",
  gray:    "#aaaaaa",
  dim:     "#555555",
};

const SECTION = {
  color: C.blue, fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: C.card, borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};
const ROW = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: C.border,
};

function Toggle({ label, sub, value, onToggle, accent }) {
  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: C.white, fontSize: 16, fontWeight: "600" } }, label),
      sub && React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginTop: 2 } }, sub)
    ),
    React.createElement(Switch, {
      value: !!value, onValueChange: onToggle,
      trackColor: { true: accent || C.green, false: "#555" },
    })
  );
}

function Btn({ label, onPress, color, disabled }) {
  return React.createElement(TouchableOpacity, {
    onPress, disabled: !!disabled,
    style: {
      backgroundColor: disabled ? "#444" : (color || C.blue),
      padding: 13, borderRadius: 10, alignItems: "center",
      marginHorizontal: 12, marginBottom: 8, opacity: disabled ? 0.5 : 1,
    }
  }, React.createElement(Text, { style: { color: C.white, fontWeight: "700", fontSize: 15 } }, label));
}

const PROXY_PRESETS = [
  { label: "No proxy (direct)",   value: "",                                      desc: "Connect to Discord directly" },
  { label: "Mullvad proxy",       value: "https://mullvad-proxy.example.com/",    desc: "Example — replace with real URL" },
  { label: "Local proxy",         value: "http://localhost:8080/",                desc: "Self-hosted proxy on this device" },
  { label: "Custom",              value: "__custom__",                            desc: "Enter your own proxy URL" },
];

const PROXY_MODES = [
  { key: "prepend", label: "Prepend",    desc: "proxy.com/https://discord.com/..." },
  { key: "query",   label: "Query param", desc: "proxy.com/?url=https://discord.com/..." },
];

const TARGET_DOMAINS = [
  { key: "discord.com",        label: "discord.com",        sub: "Main API" },
  { key: "discordapp.com",     label: "discordapp.com",     sub: "Legacy API" },
  { key: "cdn.discordapp.com", label: "cdn.discordapp.com", sub: "Avatars & attachments" },
  { key: "gateway.discord.gg", label: "gateway.discord.gg", sub: "Realtime gateway" },
  { key: "media.discordapp.net", label: "media.discordapp.net", sub: "Media files" },
];

const SNI_MODES = [
  {
    key: "doh",
    label: "DNS-over-HTTPS",
    desc: "Resolves Discord IPs via encrypted DNS. Bypasses DNS-level blocking (most common in Russia/China).",
    emoji: "🔒",
  },
  {
    key: "ip",
    label: "Direct IP connection",
    desc: "Connects to Discord's IP directly. TLS SNI becomes an IP address, not a domain — bypasses DPI inspection.",
    emoji: "🌐",
  },
  {
    key: "fakesni",
    label: "Fake SNI (Proxy-level)",
    desc: "Sends X-SNI-Host header with a fake domain. Requires a compatible proxy (xray/v2ray/nginx with SNI routing).",
    emoji: "🎭",
  },
  {
    key: "front",
    label: "Domain Fronting",
    desc: "TLS SNI = an unblocked CDN domain. HTTP Host = Discord. Works if both share a CDN (Cloudflare etc.).",
    emoji: "🎯",
  },
];

const DOH_SERVERS = [
  { label: "Cloudflare (1.1.1.1)",     value: "https://cloudflare-dns.com/dns-query" },
  { label: "Google (8.8.8.8)",          value: "https://dns.google/resolve" },
  { label: "Mullvad",                   value: "https://base.dns.mullvad.net/dns-query" },
  { label: "NextDNS",                   value: "https://dns.nextdns.io/dns-query" },
  { label: "AdGuard",                   value: "https://dns.adguard.com/dns-query" },
  { label: "Custom",                    value: "__custom__" },
];

export default function ProxifierSettings({ storage, testProxy, testDoH, checkIpLeak, saveProfile, loadProfile, deleteProfile }) {
  const s = useProxy(storage);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [dohTesting, setDohTesting] = React.useState(false);
  const [dohResult, setDohResult] = React.useState(null);
  const [ipChecking, setIpChecking] = React.useState(false);
  const [ipResult, setIpResult] = React.useState(null);
  const [profileName, setProfileName] = React.useState("");
  const [showProfiles, setShowProfiles] = React.useState(false);

  if (!s.sniBypass) s.sniBypass = { enabled: false, mode: "doh", dohServer: "https://cloudflare-dns.com/dns-query", fakeSni: "", frontDomain: "" };

  const handleDohTest = async () => {
    setDohTesting(true); setDohResult(null);
    const r = await testDoH?.();
    setDohResult(r);
    setDohTesting(false);
  };

  const isCustomUrl = !PROXY_PRESETS.some(p => p.value === s.proxyUrl && p.value !== "__custom__");

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const r = await testProxy?.();
    setTestResult(r);
    setTesting(false);
  };

  const handleIpCheck = async () => {
    setIpChecking(true); setIpResult(null);
    const r = await checkIpLeak?.();
    setIpResult(r);
    setIpChecking(false);
  };

  const proxied = s.stats?.proxied || 0;
  const total   = s.stats?.total || 0;
  const active  = s.enabled && !!s.proxyUrl;

  return React.createElement(ScrollView, { style: { flex: 1 } },

    // ── Status Banner ──
    React.createElement(View, {
      style: {
        margin: 12, padding: 16, borderRadius: 12,
        backgroundColor: active ? "rgba(67,181,129,0.1)" : "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: active ? C.green : "#444",
        flexDirection: "row", alignItems: "center", gap: 12,
      }
    },
      React.createElement(Text, { style: { fontSize: 36 } }, active ? "🔀" : "⚪"),
      React.createElement(View, { style: { flex: 1 } },
        React.createElement(Text, { style: { color: active ? C.green : C.gray, fontWeight: "700", fontSize: 16 } },
          active ? "Proxy active" : "Proxy disabled"
        ),
        s.proxyUrl
          ? React.createElement(Text, { style: { color: C.blue, fontSize: 11, marginTop: 2 } },
              s.proxyUrl.length > 42 ? s.proxyUrl.slice(0, 42) + "…" : s.proxyUrl
            )
          : React.createElement(Text, { style: { color: C.dim, fontSize: 11, marginTop: 2 } }, "No proxy configured"),
        React.createElement(Text, { style: { color: C.dim, fontSize: 11, marginTop: 4 } },
          `${proxied} requests proxied / ${total} total`
        ),
      ),
      React.createElement(TouchableOpacity, {
        onPress: () => { s.stats = { proxied: 0, blocked: 0, total: 0 }; }
      }, React.createElement(Text, { style: { color: C.dim, fontSize: 11 } }, "Reset"))
    ),

    // ── Enable ──
    React.createElement(Text, { style: SECTION }, "General"),
    React.createElement(View, { style: CARD },
      React.createElement(Toggle, {
        label: "Enable proxy",
        sub: "Route selected Discord domains through your proxy",
        value: s.enabled,
        onToggle: v => {
          s.enabled = v;
          showToast(v ? "🔀 Proxy enabled" : "⚪ Proxy disabled", 0);
        },
        accent: C.green,
      }),
    ),

    // ── Profiles ──
    React.createElement(View, {
      style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }
    },
      React.createElement(Text, { style: [SECTION, { paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0, flex: 1 }] }, "Profiles"),
      React.createElement(TouchableOpacity, { onPress: () => setShowProfiles(!showProfiles) },
        React.createElement(Text, { style: { color: C.blue, fontSize: 13 } }, showProfiles ? "Hide ▲" : "Show ▼")
      )
    ),

    showProfiles && React.createElement(View, null,
      React.createElement(View, { style: CARD },
        (s.profiles || []).length === 0
          ? React.createElement(Text, { style: { color: C.dim, padding: 16, textAlign: "center" } }, "No saved profiles")
          : (s.profiles || []).map((p, i) =>
            React.createElement(View, {
              key: i,
              style: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 16,
                borderBottomWidth: 0.5, borderBottomColor: C.border,
                backgroundColor: s.activeProfile === p.name ? "rgba(114,137,218,0.1)" : "transparent" }
            },
              React.createElement(View, { style: { flex: 1 } },
                React.createElement(Text, { style: { color: C.white, fontWeight: "600" } }, p.name),
                React.createElement(Text, { style: { color: C.dim, fontSize: 11, marginTop: 1 } },
                  (p.proxyUrl || "direct").slice(0, 35)
                )
              ),
              React.createElement(TouchableOpacity, {
                onPress: () => loadProfile?.(p.name),
                style: { backgroundColor: C.blue, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 6 }
              }, React.createElement(Text, { style: { color: C.white, fontSize: 12 } }, "Load")),
              React.createElement(TouchableOpacity, {
                onPress: () => {
                  showConfirmationAlert({
                    title: "Delete profile",
                    content: `Delete "${p.name}"?`,
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    onConfirm: () => deleteProfile?.(p.name),
                  });
                }
              }, React.createElement(Text, { style: { color: C.red, fontSize: 16, paddingHorizontal: 8 } }, "✕"))
            )
          )
      ),
      React.createElement(View, { style: { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, gap: 8 } },
        React.createElement(TextInput, {
          value: profileName, onChangeText: setProfileName,
          placeholder: "Profile name…", placeholderTextColor: C.dim,
          style: { flex: 1, backgroundColor: C.card, color: C.white, padding: 10, borderRadius: 8, fontSize: 14 },
          autoCapitalize: "none",
        }),
        React.createElement(TouchableOpacity, {
          onPress: () => { saveProfile?.(profileName); setProfileName(""); },
          disabled: !profileName.trim(),
          style: { backgroundColor: C.green, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center", opacity: profileName.trim() ? 1 : 0.4 }
        }, React.createElement(Text, { style: { color: C.white, fontWeight: "700" } }, "Save"))
      )
    ),

    // ── Proxy URL ──
    React.createElement(Text, { style: SECTION }, "Proxy URL"),
    React.createElement(View, { style: CARD },
      PROXY_PRESETS.map(preset =>
        React.createElement(TouchableOpacity, {
          key: preset.value,
          onPress: () => { if (preset.value !== "__custom__") s.proxyUrl = preset.value; },
          style: {
            paddingVertical: 12, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: C.border,
            backgroundColor: (preset.value === s.proxyUrl || (preset.value === "__custom__" && isCustomUrl))
              ? "rgba(114,137,218,0.12)" : "transparent",
          }
        },
          React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
            React.createElement(Text, { style: { color: C.white, fontWeight: "600", flex: 1 } }, preset.label),
            (preset.value === s.proxyUrl || (preset.value === "__custom__" && isCustomUrl)) &&
              React.createElement(Text, { style: { color: C.blue } }, "✓")
          ),
          React.createElement(Text, { style: { color: C.gray, fontSize: 11, marginTop: 2 } }, preset.desc)
        )
      )
    ),

    React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
      React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginBottom: 6 } }, "Proxy URL:"),
      React.createElement(TextInput, {
        value: s.proxyUrl || "",
        onChangeText: v => { s.proxyUrl = v; },
        placeholder: "https://your-proxy.example.com/",
        placeholderTextColor: C.dim,
        autoCapitalize: "none", keyboardType: "url",
        style: { backgroundColor: C.card, color: C.white, padding: 12, borderRadius: 8, fontSize: 13 }
      })
    ),

    // ── Proxy Mode ──
    React.createElement(Text, { style: SECTION }, "Proxy mode"),
    React.createElement(View, { style: CARD },
      PROXY_MODES.map(mode =>
        React.createElement(TouchableOpacity, {
          key: mode.key,
          onPress: () => { s.proxyMode = mode.key; },
          style: {
            paddingVertical: 12, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: C.border,
            backgroundColor: s.proxyMode === mode.key ? "rgba(114,137,218,0.12)" : "transparent",
          }
        },
          React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
            React.createElement(Text, { style: { color: C.white, fontWeight: "600", flex: 1 } }, mode.label),
            s.proxyMode === mode.key && React.createElement(Text, { style: { color: C.blue } }, "✓")
          ),
          React.createElement(Text, { style: { color: C.gray, fontSize: 11, marginTop: 2 } }, mode.desc)
        )
      )
    ),

    // ── Domains ──
    React.createElement(Text, { style: SECTION }, "Domains to proxy"),
    React.createElement(View, { style: CARD },
      TARGET_DOMAINS.map(domain =>
        React.createElement(TouchableOpacity, {
          key: domain.key,
          onPress: () => {
            const cur = s.proxyDomains || [];
            s.proxyDomains = cur.includes(domain.key)
              ? cur.filter(d => d !== domain.key)
              : [...cur, domain.key];
          },
          style: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
            borderBottomWidth: 0.5, borderBottomColor: C.border }
        },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: { color: C.white, fontWeight: "600" } }, domain.label),
            React.createElement(Text, { style: { color: C.dim, fontSize: 11 } }, domain.sub)
          ),
          React.createElement(View, {
            style: {
              width: 22, height: 22, borderRadius: 4, borderWidth: 2,
              borderColor: (s.proxyDomains || []).includes(domain.key) ? C.green : "#555",
              backgroundColor: (s.proxyDomains || []).includes(domain.key) ? C.green : "transparent",
              alignItems: "center", justifyContent: "center",
            }
          }, (s.proxyDomains || []).includes(domain.key) &&
            React.createElement(Text, { style: { color: C.white, fontSize: 13, fontWeight: "bold" } }, "✓")
          )
        )
      )
    ),

    // ── SNI Bypass ──
    React.createElement(Text, { style: [SECTION, { color: "#F04747" }] }, "🛡 SNI Bypass — Censorship Circumvention"),

    React.createElement(View, {
      style: {
        marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10,
        backgroundColor: "rgba(240,71,71,0.07)", borderWidth: 1, borderColor: "rgba(240,71,71,0.3)",
      }
    },
      React.createElement(Text, { style: { color: "#F04747", fontWeight: "700", fontSize: 13, marginBottom: 4 } }, "For users in Russia, Iran, China and similar"),
      React.createElement(Text, { style: { color: C.gray, fontSize: 12, lineHeight: 18 } },
        "Discord is blocked in some countries via DNS poisoning or DPI (Deep Packet Inspection). " +
        "SNI Bypass routes around these blocks without needing a full proxy."
      )
    ),

    React.createElement(View, { style: CARD },
      React.createElement(Toggle, {
        label: "Enable SNI Bypass",
        sub: "Active even when no proxy is configured",
        value: s.sniBypass?.enabled,
        onToggle: v => { s.sniBypass = { ...s.sniBypass, enabled: v }; },
        accent: "#F04747",
      }),
    ),

    s.sniBypass?.enabled && React.createElement(View, null,

      React.createElement(Text, { style: SECTION }, "Bypass mode"),
      React.createElement(View, { style: CARD },
        SNI_MODES.map(mode =>
          React.createElement(TouchableOpacity, {
            key: mode.key,
            onPress: () => { s.sniBypass = { ...s.sniBypass, mode: mode.key }; },
            style: {
              paddingVertical: 13, paddingHorizontal: 16,
              borderBottomWidth: 0.5, borderBottomColor: C.border,
              backgroundColor: s.sniBypass?.mode === mode.key ? "rgba(240,71,71,0.1)" : "transparent",
            }
          },
            React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
              React.createElement(Text, { style: { fontSize: 20, marginRight: 10 } }, mode.emoji),
              React.createElement(Text, { style: { color: C.white, fontWeight: "700", flex: 1 } }, mode.label),
              s.sniBypass?.mode === mode.key && React.createElement(Text, { style: { color: "#F04747" } }, "✓")
            ),
            React.createElement(Text, { style: { color: C.gray, fontSize: 11, marginTop: 3, marginLeft: 30, lineHeight: 16 } }, mode.desc)
          )
        )
      ),

      // DoH server picker (shown for doh + ip + front modes — all use DoH for resolution)
      s.sniBypass?.mode !== "fakesni" && React.createElement(View, null,
        React.createElement(Text, { style: SECTION }, "DNS-over-HTTPS server"),
        React.createElement(View, { style: CARD },
          DOH_SERVERS.map(srv =>
            React.createElement(TouchableOpacity, {
              key: srv.value,
              onPress: () => { if (srv.value !== "__custom__") s.sniBypass = { ...s.sniBypass, dohServer: srv.value }; },
              style: {
                paddingVertical: 11, paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
                borderBottomWidth: 0.5, borderBottomColor: C.border,
                backgroundColor: (srv.value === s.sniBypass?.dohServer || (srv.value === "__custom__" && !DOH_SERVERS.find(x => x.value === s.sniBypass?.dohServer && x.value !== "__custom__")))
                  ? "rgba(114,137,218,0.12)" : "transparent",
              }
            },
              React.createElement(Text, { style: { color: C.white, flex: 1 } }, srv.label),
              (srv.value === s.sniBypass?.dohServer) && React.createElement(Text, { style: { color: C.blue } }, "✓")
            )
          )
        ),
        React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
          React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginBottom: 6 } }, "Custom DoH URL:"),
          React.createElement(TextInput, {
            value: s.sniBypass?.dohServer || "",
            onChangeText: v => { s.sniBypass = { ...s.sniBypass, dohServer: v }; },
            placeholder: "https://your-doh-server.com/dns-query",
            placeholderTextColor: C.dim,
            autoCapitalize: "none", keyboardType: "url",
            style: { backgroundColor: C.card, color: C.white, padding: 11, borderRadius: 8, fontSize: 13 }
          })
        ),
        React.createElement(Btn, {
          label: dohTesting ? "Testing DoH…" : "🔒 Test DoH Resolution",
          onPress: handleDohTest,
          disabled: dohTesting,
          color: "#7289DA",
        }),
        dohResult && React.createElement(View, {
          style: {
            marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10,
            backgroundColor: dohResult.ok ? "rgba(67,181,129,0.1)" : "rgba(240,71,71,0.1)",
            borderWidth: 1, borderColor: dohResult.ok ? C.green : C.red,
          }
        },
          React.createElement(Text, { style: { color: dohResult.ok ? C.green : C.red, fontWeight: "700" } },
            dohResult.ok ? `✓ DoH working — discord.com → ${dohResult.ip}` : "✗ DoH failed"
          ),
          dohResult.ping && React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginTop: 2 } }, `Response time: ${dohResult.ping}ms`),
          dohResult.error && React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginTop: 2 } }, dohResult.error)
        )
      ),

      // Fake SNI input (only for fakesni mode)
      s.sniBypass?.mode === "fakesni" && React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
        React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginBottom: 6 } }, "Fake SNI domain (must be accessible and on same CDN):"),
        React.createElement(TextInput, {
          value: s.sniBypass?.fakeSni || "",
          onChangeText: v => { s.sniBypass = { ...s.sniBypass, fakeSni: v }; },
          placeholder: "www.microsoft.com",
          placeholderTextColor: C.dim,
          autoCapitalize: "none", keyboardType: "url",
          style: { backgroundColor: C.card, color: C.white, padding: 11, borderRadius: 8, fontSize: 13 }
        }),
        React.createElement(Text, { style: { color: C.dim, fontSize: 11, marginTop: 6, lineHeight: 16 } },
          "Use a domain that is NOT blocked in your country and ideally shares Cloudflare/CDN infrastructure with Discord."
        )
      ),

      // Front domain input (only for front mode)
      s.sniBypass?.mode === "front" && React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
        React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginBottom: 6 } }, "Front domain (unblocked CDN domain):"),
        React.createElement(TextInput, {
          value: s.sniBypass?.frontDomain || "",
          onChangeText: v => { s.sniBypass = { ...s.sniBypass, frontDomain: v }; },
          placeholder: "www.cloudflare.com",
          placeholderTextColor: C.dim,
          autoCapitalize: "none", keyboardType: "url",
          style: { backgroundColor: C.card, color: C.white, padding: 11, borderRadius: 8, fontSize: 13 }
        }),
        React.createElement(Text, { style: { color: C.dim, fontSize: 11, marginTop: 6, lineHeight: 16 } },
          "A domain on the same CDN as Discord (Cloudflare). TLS handshake uses this domain as SNI — Discord's API is reached via the HTTP Host header."
        )
      ),

      // Quick guide box
      React.createElement(View, {
        style: {
          marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10,
          backgroundColor: "rgba(114,137,218,0.07)", borderWidth: 1, borderColor: "rgba(114,137,218,0.2)",
        }
      },
        React.createElement(Text, { style: { color: C.blue, fontWeight: "700", fontSize: 12, marginBottom: 6 } }, "Which mode should I use?"),
        React.createElement(Text, { style: { color: C.gray, fontSize: 11, lineHeight: 17 } },
          "🔒 DNS blocked only (most common) → use DoH mode\n" +
          "🌐 DPI/SNI inspection → use Direct IP mode\n" +
          "🎭 Have xray/v2ray proxy → use Fake SNI mode\n" +
          "🎯 Advanced / CDN sharing → use Domain Fronting\n\n" +
          "Combine SNI Bypass with a proxy for maximum bypass."
        )
      ),
    ),

    // ── Test ──
    React.createElement(Text, { style: SECTION }, "Test & Verify"),

    React.createElement(Btn, {
      label: testing ? "Testing…" : "🔗 Test Proxy Connection",
      onPress: handleTest,
      disabled: testing || !s.proxyUrl,
    }),

    testResult && React.createElement(View, {
      style: {
        marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10,
        backgroundColor: testResult.ok ? "rgba(67,181,129,0.1)" : "rgba(240,71,71,0.1)",
        borderWidth: 1, borderColor: testResult.ok ? C.green : C.red,
      }
    },
      React.createElement(Text, { style: { color: testResult.ok ? C.green : C.red, fontWeight: "700" } },
        testResult.ok ? "✓ Proxy is working" : "✗ Proxy failed"
      ),
      testResult.ping && React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginTop: 2 } }, `Response time: ${testResult.ping}ms`),
      testResult.error && React.createElement(Text, { style: { color: C.gray, fontSize: 12, marginTop: 2 } }, testResult.error)
    ),

    React.createElement(Btn, {
      label: ipChecking ? "Checking…" : "🌍 IP Leak Check",
      onPress: handleIpCheck,
      disabled: ipChecking,
      color: C.yellow,
    }),

    ipResult && React.createElement(View, {
      style: {
        marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1,
        borderColor: ipResult.leaked ? C.red : C.green,
      }
    },
      ipResult.error
        ? React.createElement(Text, { style: { color: C.red } }, `Error: ${ipResult.error}`)
        : React.createElement(View, null,
          React.createElement(Text, { style: { color: C.white, fontWeight: "700", marginBottom: 4 } },
            ipResult.leaked ? "⚠️ IP Leak detected!" : ipResult.proxiedIp ? "✓ No IP leak" : "Direct IP (no proxy active)"
          ),
          React.createElement(Text, { style: { color: C.gray, fontSize: 12 } }, `Your real IP: ${ipResult.directIp}`),
          ipResult.proxiedIp && React.createElement(Text, { style: { color: C.gray, fontSize: 12 } }, `IP through proxy: ${ipResult.proxiedIp}`),
        )
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
