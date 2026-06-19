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

export default function NoTrackSettings({ storage }) {
  const s = useProxy(storage);
  const blocked = s.stats?.blocked || 0;
  const total = s.stats?.total || 0;
  const pct = total ? Math.round((blocked / total) * 100) : 0;

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Status"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "NoTrack enabled",
        sub: "Block telemetry & analytics requests",
        value: s.settings.enabled,
        onToggle: v => { s.settings.enabled = v; },
      }),
      React.createElement(View, { style: { paddingVertical: 14, paddingHorizontal: 16 } },
        React.createElement(Text, { style: { color: "#43B581", fontSize: 22, fontWeight: "700" } }, `${blocked} blocked`),
        React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, `${pct}% of ${total} requests seen`)
      )
    ),

    React.createElement(Text, { style: SECTION }, "Block categories"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Discord telemetry",
        sub: "/science, /metrics, usage analytics",
        value: s.settings.blockScience,
        onToggle: v => { s.settings.blockScience = v; },
      }),
      React.createElement(ToggleRow, {
        label: "Crash/error reporting",
        sub: "Sentry — ships stack traces & device info",
        value: s.settings.blockSentry,
        onToggle: v => { s.settings.blockSentry = v; },
      }),
      React.createElement(ToggleRow, {
        label: "Third-party analytics",
        sub: "Google Analytics, Mixpanel, Segment & similar",
        value: s.settings.blockThirdPartyAnalytics,
        onToggle: v => { s.settings.blockThirdPartyAnalytics = v; },
      }),
    ),

    React.createElement(View, { style: CARD },
      React.createElement(TouchableOpacity, {
        onPress: () => { s.stats = { blocked: 0, total: 0 }; showToast("Stats reset", 0); },
        style: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#F04747", fontSize: 15, fontWeight: "600" } }, "Reset Stats"))
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
