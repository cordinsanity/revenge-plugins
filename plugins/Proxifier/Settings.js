import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

const { View, Text, Switch, ScrollView, TouchableOpacity, TextInput } = ReactNative;

const SECTION = {
  color: "#43B581", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};
const ROW = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
};

function ToggleRow({ label, sub, value, onToggle, accent }) {
  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, label),
      sub && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, sub)
    ),
    React.createElement(Switch, {
      value: !!value, onValueChange: onToggle,
      trackColor: { true: accent || "#43B581", false: "#555" },
    })
  );
}

const PROXY_PRESETS = [
  { label: "None (direct)",        value: "",                               desc: "No proxy — connect to Discord directly" },
  { label: "CORS Anywhere",        value: "https://cors-anywhere.herokuapp.com/", desc: "Public CORS proxy (rate limited)" },
  { label: "allOrigins",           value: "https://api.allorigins.win/raw?url=", desc: "Public proxy, GET only" },
  { label: "Custom",               value: "custom",                         desc: "Enter your own proxy URL below" },
];

const PROXY_MODES = [
  { key: "prepend",  label: "Prepend URL",    desc: "proxy.example.com/https://discord.com/..." },
  { key: "query",    label: "Query param",    desc: "proxy.example.com/?url=https://discord.com/..." },
];

const TARGET_DOMAINS = [
  { key: "discord.com",        label: "discord.com (API)" },
  { key: "discordapp.com",     label: "discordapp.com" },
  { key: "cdn.discordapp.com", label: "cdn.discordapp.com (CDN)" },
  { key: "gateway.discord.gg", label: "gateway (WebSocket)" },
];

export default function ProxifierSettings({ storage, testProxy }) {
  const s = useProxy(storage);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);

  const selectedPreset = PROXY_PRESETS.find(p => p.value === s.proxyUrl) ? s.proxyUrl : "custom";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testProxy();
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    }
    setTesting(false);
  };

  return React.createElement(ScrollView, { style: { flex: 1 } },

    // Status banner
    React.createElement(View, {
      style: {
        margin: 12, padding: 14, borderRadius: 12,
        backgroundColor: s.enabled
          ? "rgba(67,181,129,0.1)"
          : "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: s.enabled ? "#43B581" : "#555",
        alignItems: "center",
      }
    },
      React.createElement(Text, { style: { fontSize: 32, marginBottom: 4 } }, s.enabled ? "🔀" : "⚪"),
      React.createElement(Text, { style: { color: s.enabled ? "#43B581" : "#aaa", fontWeight: "700", fontSize: 15 } },
        s.enabled ? "Proxy active" : "Proxy disabled"
      ),
      s.enabled && s.proxyUrl
        ? React.createElement(Text, { style: { color: "#7289DA", fontSize: 12, marginTop: 4 } }, s.proxyUrl.slice(0, 40) + (s.proxyUrl.length > 40 ? "…" : ""))
        : null
    ),

    // On/Off
    React.createElement(Text, { style: SECTION }, "General"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Enable proxy",
        sub: "Route Discord requests through your proxy",
        value: s.enabled,
        onToggle: v => { s.enabled = v; showToast(v ? "Proxy enabled" : "Proxy disabled", 0); },
      }),
    ),

    // Proxy URL
    React.createElement(Text, { style: SECTION }, "Proxy URL"),
    React.createElement(View, { style: CARD },
      PROXY_PRESETS.map(preset =>
        React.createElement(TouchableOpacity, {
          key: preset.value,
          onPress: () => {
            if (preset.value !== "custom") s.proxyUrl = preset.value;
          },
          style: {
            paddingVertical: 12, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
            backgroundColor: (s.proxyUrl === preset.value || (preset.value === "custom" && selectedPreset === "custom"))
              ? "rgba(114,137,218,0.12)" : "transparent",
          }
        },
          React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
            React.createElement(Text, { style: { color: "#fff", fontWeight: "600", flex: 1 } }, preset.label),
            (s.proxyUrl === preset.value || (preset.value === "custom" && selectedPreset === "custom")) &&
              React.createElement(Text, { style: { color: "#7289DA" } }, "✓")
          ),
          React.createElement(Text, { style: { color: "#888", fontSize: 11, marginTop: 2 } }, preset.desc)
        )
      )
    ),

    React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
      React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginBottom: 6 } }, "Custom proxy URL:"),
      React.createElement(TextInput, {
        value: s.proxyUrl || "",
        onChangeText: v => { s.proxyUrl = v; },
        placeholder: "https://proxy.example.com/",
        placeholderTextColor: "#555",
        autoCapitalize: "none", keyboardType: "url",
        style: {
          backgroundColor: "rgba(255,255,255,0.05)", color: "#fff",
          padding: 12, borderRadius: 8, fontSize: 14,
        }
      })
    ),

    // Proxy mode
    React.createElement(Text, { style: SECTION }, "Proxy mode"),
    React.createElement(View, { style: CARD },
      PROXY_MODES.map(mode =>
        React.createElement(TouchableOpacity, {
          key: mode.key,
          onPress: () => { s.proxyMode = mode.key; },
          style: {
            paddingVertical: 12, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
            backgroundColor: s.proxyMode === mode.key ? "rgba(114,137,218,0.12)" : "transparent",
          }
        },
          React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
            React.createElement(Text, { style: { color: "#fff", fontWeight: "600", flex: 1 } }, mode.label),
            s.proxyMode === mode.key && React.createElement(Text, { style: { color: "#7289DA" } }, "✓")
          ),
          React.createElement(Text, { style: { color: "#888", fontSize: 11, marginTop: 2 } }, mode.desc)
        )
      )
    ),

    // Domains to proxy
    React.createElement(Text, { style: SECTION }, "Domains to proxy"),
    React.createElement(View, { style: CARD },
      TARGET_DOMAINS.map(domain =>
        React.createElement(TouchableOpacity, {
          key: domain.key,
          onPress: () => {
            const current = s.proxyDomains || [];
            if (current.includes(domain.key)) {
              s.proxyDomains = current.filter(d => d !== domain.key);
            } else {
              s.proxyDomains = [...current, domain.key];
            }
          },
          style: {
            paddingVertical: 12, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
            flexDirection: "row", alignItems: "center",
          }
        },
          React.createElement(Text, { style: { color: "#fff", flex: 1 } }, domain.label),
          React.createElement(View, {
            style: {
              width: 22, height: 22, borderRadius: 4, borderWidth: 2,
              borderColor: (s.proxyDomains || []).includes(domain.key) ? "#43B581" : "#555",
              backgroundColor: (s.proxyDomains || []).includes(domain.key) ? "#43B581" : "transparent",
              alignItems: "center", justifyContent: "center",
            }
          },
            (s.proxyDomains || []).includes(domain.key) &&
              React.createElement(Text, { style: { color: "#fff", fontSize: 13, fontWeight: "bold" } }, "✓")
          )
        )
      )
    ),

    // Test
    React.createElement(Text, { style: SECTION }, "Test"),
    React.createElement(View, { style: { marginHorizontal: 12, marginBottom: 8 } },
      React.createElement(TouchableOpacity, {
        onPress: handleTest,
        disabled: testing || !s.proxyUrl,
        style: {
          backgroundColor: testing ? "#555" : "#7289DA",
          padding: 14, borderRadius: 10, alignItems: "center",
          opacity: !s.proxyUrl ? 0.4 : 1,
        }
      },
        React.createElement(Text, { style: { color: "#fff", fontWeight: "700", fontSize: 16 } },
          testing ? "Testing…" : "Test proxy connection"
        )
      ),
      testResult && React.createElement(View, {
        style: {
          marginTop: 8, padding: 12, borderRadius: 8,
          backgroundColor: testResult.ok ? "rgba(67,181,129,0.1)" : "rgba(240,71,71,0.1)",
          borderWidth: 1, borderColor: testResult.ok ? "#43B581" : "#F04747",
        }
      },
        React.createElement(Text, { style: { color: testResult.ok ? "#43B581" : "#F04747", fontWeight: "700" } },
          testResult.ok ? "✓ Proxy working!" : "✗ Proxy failed"
        ),
        testResult.ping && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, `Ping: ${testResult.ping}ms`),
        testResult.error && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, testResult.error)
      )
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
