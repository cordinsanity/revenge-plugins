import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

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

function LogRow({ entry }) {
  return React.createElement(View, { style: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)" } },
    React.createElement(Text, { style: { color: "#fff", fontSize: 14, fontWeight: "600" } }, `${entry.everyone ? "📢" : "🔔"} ${entry.authorTag}${entry.channelName ? ` in #${entry.channelName}` : ""}`),
    entry.content && React.createElement(Text, { style: { color: "#dcddde", fontSize: 13, marginTop: 3 } }, entry.content),
    React.createElement(Text, { style: { color: "#72767d", fontSize: 11, marginTop: 3 } }, new Date(entry.time).toLocaleString())
  );
}

export default function MentionLogSettings({ storage }) {
  const s = useProxy(storage);
  const log = s.log || [];

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Settings"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Also log @everyone / @here",
        sub: "Off by default — these can be very noisy in busy servers",
        value: s.settings.logEveryoneHere,
        onToggle: v => { s.settings.logEveryoneHere = v; },
      }),
    ),

    React.createElement(Text, { style: SECTION }, `Mentions (${log.length})`),
    React.createElement(View, { style: CARD },
      log.length === 0
        ? React.createElement(Text, { style: { color: "#72767d", fontSize: 13, padding: 16 } }, "No mentions logged yet.")
        : log.slice(0, 100).map(entry => React.createElement(LogRow, { key: entry.id, entry }))
    ),

    log.length > 0 && React.createElement(View, { style: CARD },
      React.createElement(TouchableOpacity, {
        onPress: () => showConfirmationAlert({
          title: "Clear History",
          content: "This will permanently delete the local mention history.",
          confirmText: "Clear",
          cancelText: "Cancel",
          confirmColor: "brand",
          onConfirm: () => { s.log = []; showToast("History cleared", 0); },
        }),
        style: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#F04747", fontSize: 15, fontWeight: "600" } }, "Clear History"))
    ),

    React.createElement(View, { style: { height: 40 } })
  );
}
