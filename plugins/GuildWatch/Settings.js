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
  if (entry.kind === "rebrand") {
    return React.createElement(View, { style: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)" } },
      React.createElement(Text, { style: { color: "#FAA61A", fontSize: 14 } }, `⚠️ "${entry.before?.name}" renamed to "${entry.after?.name}"`),
      React.createElement(Text, { style: { color: "#72767d", fontSize: 11, marginTop: 2 } }, new Date(entry.time).toLocaleString())
    );
  }
  const isJoin = entry.kind === "join";
  return React.createElement(View, { style: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.07)" } },
    React.createElement(Text, { style: { color: "#fff", fontSize: 14 } }, `${isJoin ? "📥" : "📤"} ${isJoin ? "Joined" : "Left/removed from"} ${entry.guildName}`),
    React.createElement(Text, { style: { color: "#72767d", fontSize: 11, marginTop: 2 } }, new Date(entry.time).toLocaleString())
  );
}

export default function GuildWatchSettings({ storage }) {
  const s = useProxy(storage);
  const log = s.log || [];

  return React.createElement(ScrollView, { style: { flex: 1 } },

    React.createElement(Text, { style: SECTION }, "Tracking"),
    React.createElement(View, { style: CARD },
      React.createElement(ToggleRow, {
        label: "Log joins & leaves",
        sub: "Notice the moment you're removed from a server",
        value: s.settings.logJoinLeave,
        onToggle: v => { s.settings.logJoinLeave = v; },
      }),
      React.createElement(ToggleRow, {
        label: "Warn on rebrand",
        sub: "Alert when a server suddenly changes name/icon — common scam-takeover sign",
        value: s.settings.warnOnRebrand,
        onToggle: v => { s.settings.warnOnRebrand = v; },
      }),
    ),

    React.createElement(Text, { style: SECTION }, `History (${log.length})`),
    React.createElement(View, { style: CARD },
      log.length === 0
        ? React.createElement(Text, { style: { color: "#72767d", fontSize: 13, padding: 16 } }, "Nothing logged yet.")
        : log.slice(0, 100).map(entry => React.createElement(LogRow, { key: entry.id, entry }))
    ),

    log.length > 0 && React.createElement(View, { style: CARD },
      React.createElement(TouchableOpacity, {
        onPress: () => showConfirmationAlert({
          title: "Clear History",
          content: "This will permanently delete the local join/leave/rebrand history.",
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
