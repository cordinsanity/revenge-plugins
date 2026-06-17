import { React } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";

const { View, Text, Switch, ScrollView, TouchableOpacity } = findByProps("Text", "View", "ScrollView") || {};

const ROW_STYLE = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(255,255,255,0.07)",
};
const LABEL_STYLE = { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 };
const SUB_STYLE = { color: "#aaa", fontSize: 12, marginTop: 2, flex: 1 };
const SECTION_HEADER = {
  color: "#7289DA",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1.2,
  paddingHorizontal: 16,
  paddingTop: 20,
  paddingBottom: 6,
  textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.04)",
  borderRadius: 12,
  marginHorizontal: 12,
  marginBottom: 8,
  overflow: "hidden",
};

function Row({ label, sub, value, onToggle, disabled }) {
  return React.createElement(View, { style: ROW_STYLE },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: LABEL_STYLE }, label),
      sub && React.createElement(Text, { style: SUB_STYLE }, sub)
    ),
    React.createElement(Switch, {
      value: !!value,
      onValueChange: onToggle,
      disabled: !!disabled,
      trackColor: { true: "#7289DA", false: "#555" },
    })
  );
}

const STATUS_OPTIONS = [
  { key: "online",    label: "Online",    color: "#43B581", emoji: "🟢" },
  { key: "idle",      label: "Idle",      color: "#FAA61A", emoji: "🟡" },
  { key: "dnd",       label: "Do Not Disturb", color: "#F04747", emoji: "🔴" },
  { key: "invisible", label: "Invisible", color: "#747F8D", emoji: "⚫" },
];

export default function GhostModeSettings({ storage }) {
  const s = useProxy(storage);

  return React.createElement(ScrollView, { style: { flex: 1 } },

    // ── STATUS ──
    React.createElement(Text, { style: SECTION_HEADER }, "Status nach Ghost-Off"),
    React.createElement(View, { style: CARD },
      STATUS_OPTIONS.map(opt =>
        React.createElement(TouchableOpacity, {
          key: opt.key,
          onPress: () => { s.settings.defaultStatus = opt.key; },
          style: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: "rgba(255,255,255,0.07)",
            backgroundColor: s.settings.defaultStatus === opt.key
              ? "rgba(114,137,218,0.15)" : "transparent",
          }
        },
          React.createElement(Text, { style: { fontSize: 18, marginRight: 10 } }, opt.emoji),
          React.createElement(Text, { style: { color: opt.color, fontSize: 15, fontWeight: "600" } }, opt.label),
          s.settings.defaultStatus === opt.key &&
            React.createElement(Text, { style: { color: "#7289DA", marginLeft: "auto", fontSize: 18 } }, "✓")
        )
      )
    ),

    // ── PRIVACY ──
    React.createElement(Text, { style: SECTION_HEADER }, "Privacy"),
    React.createElement(View, { style: CARD },
      React.createElement(Row, {
        label: "Tipp-Indikator blockieren",
        sub: "Andere sehen nicht wenn du tippst",
        value: s.settings.blockTyping,
        onToggle: v => { s.settings.blockTyping = v; },
      }),
      React.createElement(Row, {
        label: "Lesebestätigungen blockieren",
        sub: "Kanäle nicht automatisch als gelesen markieren",
        value: s.settings.blockReadReceipts,
        onToggle: v => { s.settings.blockReadReceipts = v; },
      }),
    ),

    // ── YOU BAR ──
    React.createElement(Text, { style: SECTION_HEADER }, "You Bar"),
    React.createElement(View, { style: CARD },
      React.createElement(Row, {
        label: "Ghost-Button im You Bar zeigen",
        sub: "👻 Button neben der Glocke",
        value: s.settings.showInYouBar !== false,
        onToggle: v => { s.settings.showInYouBar = v; showToast("Neustart empfohlen", 0); },
      }),
    ),

    React.createElement(View, { style: { height: 32 } })
  );
}
