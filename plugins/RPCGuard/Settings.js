import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";

const { View, Text, Switch, ScrollView } = ReactNative;

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

export default function RPCGuardSettings({ storage }) {
  const s = useProxy(storage);

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Status"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Block Rich Presence",
        sub: "Hides 'Playing / Listening to ...' from your profile",
        value: s.settings.enabled,
        onToggle: v => { s.settings.enabled = v; },
      }),
      React.createElement(View, { style: { paddingVertical: 14, paddingHorizontal: 16 } },
        React.createElement(Text, { style: { color: "#43B581", fontSize: 22, fontWeight: "700" } }, `${s.stats?.stripped || 0} stripped`),
        React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, "Activity payloads removed this session")
      )
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
