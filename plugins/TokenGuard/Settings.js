import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const { View, Text, Switch, ScrollView, TouchableOpacity, TextInput } = ReactNative;

const ROW = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
};
const SECTION = {
  color: "#F04747", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};

function ToggleRow({ label, sub, value, onToggle, accent }) {
  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, label),
      sub && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, sub)
    ),
    React.createElement(Switch, {
      value: !!value,
      onValueChange: onToggle,
      trackColor: { true: accent || "#F04747", false: "#555" },
    })
  );
}

function LogEntry({ entry }) {
  const susp = entry.suspicious;
  return React.createElement(View, {
    style: {
      backgroundColor: susp ? "rgba(240,71,71,0.1)" : "rgba(255,255,255,0.03)",
      padding: 10, marginHorizontal: 12, marginBottom: 4,
      borderRadius: 8, borderLeftWidth: 3,
      borderLeftColor: susp ? "#F04747" : "#43B581",
    }
  },
    React.createElement(Text, { style: { color: susp ? "#F04747" : "#43B581", fontSize: 12, fontWeight: "700" } },
      `${susp ? "🔴 SUSPICIOUS" : "🟢 OK"} — ${entry.domain}`
    ),
    React.createElement(Text, { style: { color: "#aaa", fontSize: 11, marginTop: 2 } },
      `${entry.method} ${entry.url.length > 55 ? entry.url.slice(0, 55) + "…" : entry.url}`
    ),
    entry.blocked && React.createElement(Text, { style: { color: "#F04747", fontSize: 10, marginTop: 1 } }, "⛔ BLOCKED"),
    React.createElement(Text, { style: { color: "#555", fontSize: 10, marginTop: 1 } },
      new Date(entry.time).toLocaleTimeString()
    )
  );
}

export default function TokenGuardSettings({ storage }) {
  const s = useProxy(storage);
  const [newDomain, setNewDomain] = React.useState("");
  const logs = s.requestLog || [];
  const suspCount = logs.filter(l => l.suspicious).length;

  const addWhitelist = () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    const wl = s.whitelist || [];
    if (!wl.includes(d)) { s.whitelist = [...wl, d]; }
    setNewDomain("");
    showToast(`${d} added to whitelist`, 0);
  };

  return React.createElement(ScrollView, { style: { flex: 1 } },

    // Banner
    React.createElement(View, {
      style: {
        margin: 12, padding: 14, borderRadius: 12,
        backgroundColor: suspCount > 0 ? "rgba(240,71,71,0.12)" : "rgba(67,181,129,0.1)",
        borderWidth: 1, borderColor: suspCount > 0 ? "#F04747" : "#43B581",
        alignItems: "center",
      }
    },
      React.createElement(Text, { style: { fontSize: 32, marginBottom: 4 } }, suspCount > 0 ? "🚨" : "🛡️"),
      React.createElement(Text, { style: { color: suspCount > 0 ? "#F04747" : "#43B581", fontWeight: "700", fontSize: 15 } },
        suspCount > 0 ? `${suspCount} suspicious request(s) detected!` : "No suspicious requests"
      ),
      React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } },
        `${logs.length} requests monitored total`
      )
    ),

    // Protection
    React.createElement(Text, { style: SECTION }, "Protection"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Token monitoring active",
        sub: "Inspect all network requests for your token",
        value: s.settings.enabled !== false,
        onToggle: v => { s.settings.enabled = v; },
        accent: "#43B581",
      }),
      React.createElement(ToggleRow, {
        label: "Alert on suspicious request",
        sub: "Show a toast when your token goes to an unknown URL",
        value: s.settings.alertOnSuspicious !== false,
        onToggle: v => { s.settings.alertOnSuspicious = v; },
      }),
      React.createElement(ToggleRow, {
        label: "Auto-block suspicious requests",
        sub: "Block the request before it leaves your device",
        value: s.settings.blockSuspicious,
        onToggle: v => { s.settings.blockSuspicious = v; },
      }),
    ),

    React.createElement(Text, { style: SECTION }, "Logging"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Save request log",
        sub: "Keep a history of requests containing your token",
        value: s.settings.logRequests !== false,
        onToggle: v => { s.settings.logRequests = v; },
        accent: "#7289DA",
      }),
      React.createElement(ToggleRow, {
        label: "Log suspicious only",
        sub: "Ignore Discord's own requests to save space",
        value: s.settings.logOnlySuspicious,
        onToggle: v => { s.settings.logOnlySuspicious = v; },
        accent: "#7289DA",
      }),
    ),

    // Whitelist
    React.createElement(Text, { style: [SECTION, { color: "#43B581" }] }, "Whitelist — always allowed"),
    React.createElement(View, { style: CARD },
      (s.whitelist || []).length === 0
        ? React.createElement(Text, { style: { color: "#555", padding: 16, textAlign: "center" } }, "No custom entries")
        : (s.whitelist || []).map((domain, i) =>
          React.createElement(View, {
            key: i,
            style: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 16,
              borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)" }
          },
            React.createElement(Text, { style: { color: "#43B581", flex: 1 } }, domain),
            React.createElement(TouchableOpacity, {
              onPress: () => { s.whitelist = s.whitelist.filter((_, idx) => idx !== i); }
            },
              React.createElement(Text, { style: { color: "#F04747", paddingHorizontal: 10, fontSize: 16 } }, "✕")
            )
          )
        )
    ),

    React.createElement(View, { style: { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, gap: 8 } },
      React.createElement(TextInput, {
        value: newDomain, onChangeText: setNewDomain,
        placeholder: "add domain (e.g. mybot.com)",
        placeholderTextColor: "#555",
        style: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", color: "#fff", padding: 10, borderRadius: 8, fontSize: 14 },
        autoCapitalize: "none", keyboardType: "url",
        onSubmitEditing: addWhitelist,
      }),
      React.createElement(TouchableOpacity, {
        onPress: addWhitelist,
        style: { backgroundColor: "#43B581", paddingHorizontal: 14, borderRadius: 8, justifyContent: "center" }
      },
        React.createElement(Text, { style: { color: "#fff", fontWeight: "700" } }, "Add")
      )
    ),

    // Log
    React.createElement(View, {
      style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }
    },
      React.createElement(Text, { style: { color: "#7289DA", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, flex: 1, textTransform: "uppercase" } }, "Request Log"),
      React.createElement(TouchableOpacity, {
        onPress: () => {
          showConfirmationAlert({
            title: "Clear log",
            content: "Delete all recorded requests?",
            confirmText: "Clear",
            cancelText: "Cancel",
            onConfirm: () => { s.requestLog = []; showToast("Log cleared", 0); }
          });
        }
      },
        React.createElement(Text, { style: { color: "#F04747", fontSize: 13 } }, "🗑 Clear")
      )
    ),

    logs.length === 0
      ? React.createElement(Text, { style: { color: "#444", textAlign: "center", padding: 28 } }, "No requests recorded yet")
      : [...logs].reverse().slice(0, 50).map((entry, i) =>
          React.createElement(LogEntry, { key: i, entry })
        ),

    React.createElement(View, { style: { height: 40 } })
  );
}
