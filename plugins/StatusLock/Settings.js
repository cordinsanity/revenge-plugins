import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { showToast } from "@vendetta/ui/toasts";

const { View, Text, Switch, ScrollView, TouchableOpacity } = ReactNative;

const ROW = {
  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
};
const SECTION = {
  color: "#7289DA", fontSize: 11, fontWeight: "700",
  letterSpacing: 1.2, paddingHorizontal: 16,
  paddingTop: 20, paddingBottom: 6, textTransform: "uppercase",
};
const CARD = {
  backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
  marginHorizontal: 12, marginBottom: 8, overflow: "hidden",
};

function ToggleRow({ label, sub, value, onToggle }) {
  return React.createElement(View, { style: ROW },
    React.createElement(View, { style: { flex: 1, paddingRight: 12 } },
      React.createElement(Text, { style: { color: "#fff", fontSize: 16, fontWeight: "600" } }, label),
      sub && React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, sub)
    ),
    React.createElement(Switch, {
      value: !!value,
      onValueChange: onToggle,
      trackColor: { true: "#7289DA", false: "#555" },
    })
  );
}

const STATUS_OPTIONS = [
  { key: "online",    label: "Online",          color: "#43B581", emoji: "🟢" },
  { key: "idle",      label: "Idle",            color: "#FAA61A", emoji: "🟡" },
  { key: "dnd",       label: "Do Not Disturb",  color: "#F04747", emoji: "🔴" },
  { key: "invisible", label: "Invisible",       color: "#747F8D", emoji: "⚫" },
];

export default function StatusLockSettings({ storage, applyLockedStatusNow }) {
  const s = useProxy(storage);

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Lock"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Lock my status",
        sub: "Blocks any updateStatus call that isn't your chosen status",
        value: s.settings.locked,
        onToggle: v => {
          s.settings.locked = v;
          if (v) { applyLockedStatusNow?.(); showToast("🔒 Status locked", 0); }
          else showToast("🔓 Status unlocked", 0);
        },
      }),
    ),

    React.createElement(Text, { style: SECTION }, "Locked status"),
    React.createElement(View, { style: CARD },
      STATUS_OPTIONS.map(opt =>
        React.createElement(TouchableOpacity, {
          key: opt.key,
          onPress: () => {
            s.settings.lockedStatus = opt.key;
            if (s.settings.locked) applyLockedStatusNow?.();
          },
          style: {
            flexDirection: "row", alignItems: "center",
            paddingVertical: 13, paddingHorizontal: 16,
            borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)",
            backgroundColor: s.settings.lockedStatus === opt.key
              ? "rgba(114,137,218,0.15)" : "transparent",
          }
        },
          React.createElement(Text, { style: { fontSize: 18, marginRight: 10 } }, opt.emoji),
          React.createElement(Text, { style: { color: opt.color, fontSize: 15, fontWeight: "600", flex: 1 } }, opt.label),
          s.settings.lockedStatus === opt.key &&
            React.createElement(Text, { style: { color: "#7289DA", fontSize: 18 } }, "✓")
        )
      )
    ),

    React.createElement(View, { style: CARD },
      React.createElement(TouchableOpacity, {
        onPress: () => { applyLockedStatusNow?.(); showToast("Status re-applied", 0); },
        style: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#7289DA", fontSize: 15, fontWeight: "600" } }, "Re-apply now"))
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
