import { React } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const { View, Text, Switch, ScrollView, TouchableOpacity, TextInput } = findByProps("Text", "View", "ScrollView") || {};

const ROW_STYLE = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
};
const LABEL_STYLE = { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 };
const SUB_STYLE = { color: "#aaa", fontSize: 12, marginTop: 2 };
const SECTION_HEADER = {
  color: "#F04747", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 20,
  paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};

function Row({ label, sub, value, onToggle }) {
  return React.createElement(View, { style: ROW_STYLE },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: LABEL_STYLE }, label),
      sub && React.createElement(Text, { style: SUB_STYLE }, sub)
    ),
    React.createElement(Switch, {
      value: !!value, onValueChange: onToggle,
      trackColor: { true: "#F04747", false: "#555" },
    })
  );
}

function LogEntry({ entry, index }) {
  const suspicious = entry.suspicious;
  const bg = suspicious ? "rgba(240,71,71,0.12)" : "rgba(255,255,255,0.03)";
  const dot = suspicious ? "🔴" : "🟢";

  return React.createElement(View, {
    style: {
      backgroundColor: bg, padding: 10, marginHorizontal: 12,
      marginBottom: 4, borderRadius: 8,
      borderLeftWidth: 3, borderLeftColor: suspicious ? "#F04747" : "#43B581",
    }
  },
    React.createElement(Text, { style: { color: suspicious ? "#F04747" : "#43B581", fontSize: 12, fontWeight: "700" } },
      `${dot} ${suspicious ? "⚠ VERDÄCHTIG" : "OK"} — ${entry.domain}`
    ),
    React.createElement(Text, { style: { color: "#aaa", fontSize: 11, marginTop: 2 } },
      `${entry.method} ${entry.url.slice(0, 60)}${entry.url.length > 60 ? "…" : ""}`
    ),
    React.createElement(Text, { style: { color: "#666", fontSize: 10, marginTop: 2 } },
      new Date(entry.time).toLocaleTimeString()
    )
  );
}

export default function TokenGuardSettings({ storage }) {
  const s = useProxy(storage);
  const logs = s.requestLog || [];

  const suspiciousCount = logs.filter(l => l.suspicious).length;

  return React.createElement(ScrollView, { style: { flex: 1 } },

    // ── STATUS BANNER ──
    React.createElement(View, {
      style: {
        margin: 12, padding: 14, borderRadius: 12,
        backgroundColor: suspiciousCount > 0 ? "rgba(240,71,71,0.15)" : "rgba(67,181,129,0.1)",
        borderWidth: 1, borderColor: suspiciousCount > 0 ? "#F04747" : "#43B581",
        alignItems: "center",
      }
    },
      React.createElement(Text, { style: { fontSize: 28, marginBottom: 4 } },
        suspiciousCount > 0 ? "🚨" : "🛡️"
      ),
      React.createElement(Text, { style: { color: suspiciousCount > 0 ? "#F04747" : "#43B581", fontWeight: "700", fontSize: 15 } },
        suspiciousCount > 0
          ? `${suspiciousCount} verdächtige Anfrage(n) erkannt!`
          : "Keine verdächtigen Anfragen"
      ),
      React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } },
        `${logs.length} Anfragen total überwacht`
      )
    ),

    // ── EINSTELLUNGEN ──
    React.createElement(Text, { style: SECTION_HEADER }, "Schutz"),
    React.createElement(View, { style: CARD },
      React.createElement(Row, {
        label: "Token-Überwachung aktiv",
        sub: "Alle Netzwerk-Anfragen auf Token prüfen",
        value: s.settings.enabled !== false,
        onToggle: v => { s.settings.enabled = v; },
      }),
      React.createElement(Row, {
        label: "Alert bei verdächtiger Anfrage",
        sub: "Toast-Notification wenn Token an fremde URL geht",
        value: s.settings.alertOnSuspicious !== false,
        onToggle: v => { s.settings.alertOnSuspicious = v; },
      }),
      React.createElement(Row, {
        label: "Anfragen automatisch blockieren",
        sub: "Verdächtige Token-Anfragen werden geblockt",
        value: s.settings.blockSuspicious,
        onToggle: v => { s.settings.blockSuspicious = v; },
      }),
    ),

    React.createElement(Text, { style: SECTION_HEADER }, "Logging"),
    React.createElement(View, { style: CARD },
      React.createElement(Row, {
        label: "Request-Log speichern",
        sub: "Alle Anfragen mit Token protokollieren",
        value: s.settings.logRequests !== false,
        onToggle: v => { s.settings.logRequests = v; },
      }),
      React.createElement(Row, {
        label: "Nur verdächtige loggen",
        sub: "Spart Speicher — Discord-Anfragen werden ignoriert",
        value: s.settings.logOnlySuspicious,
        onToggle: v => { s.settings.logOnlySuspicious = v; },
      }),
    ),

    // ── WHITELIST ──
    React.createElement(Text, { style: [SECTION_HEADER, { color: "#43B581" }] }, "Whitelist (immer erlaubt)"),
    React.createElement(View, { style: CARD },
      (s.whitelist || []).length === 0
        ? React.createElement(Text, { style: { color: "#666", padding: 16, textAlign: "center" } }, "Keine Einträge")
        : (s.whitelist || []).map((domain, i) =>
          React.createElement(View, {
            key: i,
            style: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16,
              borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)" }
          },
            React.createElement(Text, { style: { color: "#43B581", flex: 1 } }, domain),
            React.createElement(TouchableOpacity, {
              onPress: () => {
                s.whitelist = s.whitelist.filter((_, idx) => idx !== i);
              }
            },
              React.createElement(Text, { style: { color: "#F04747", paddingHorizontal: 8 } }, "✕")
            )
          )
        )
    ),

    // ── LOG ──
    React.createElement(View, {
      style: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 }
    },
      React.createElement(Text, { style: [SECTION_HEADER, { paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0, flex: 1, color: "#7289DA" }] },
        "Request Log"
      ),
      React.createElement(TouchableOpacity, {
        onPress: () => {
          showConfirmationAlert({
            title: "Log löschen",
            content: "Alle gespeicherten Anfragen löschen?",
            confirmText: "Löschen",
            cancelText: "Abbrechen",
            onConfirm: () => { s.requestLog = []; showToast("Log gelöscht", 0); }
          });
        },
        style: { paddingHorizontal: 8, paddingVertical: 4 }
      },
        React.createElement(Text, { style: { color: "#F04747", fontSize: 13 } }, "🗑 Löschen")
      )
    ),

    logs.length === 0
      ? React.createElement(Text, { style: { color: "#555", textAlign: "center", padding: 24 } },
          "Noch keine Anfragen aufgezeichnet"
        )
      : [...logs].reverse().slice(0, 50).map((entry, i) =>
          React.createElement(LogEntry, { key: i, entry, index: i })
        ),

    React.createElement(View, { style: { height: 32 } })
  );
}
